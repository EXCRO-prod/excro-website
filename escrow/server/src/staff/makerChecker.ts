// Maker-checker (CLAUDE.md #6): any manual override or high-risk decision needs two distinct staff
// identities, both MFA-verified at the moment of action, with a reason code. Admins get no bypass.
import { appendAudit } from "../audit/chain.js";
import type { Actor } from "../auth/actor.js";
import type { AppContext } from "../context.js";
import type { Queryable } from "../db/types.js";
import { fail, ok, txThenThrow, type TxOutcome } from "../db/util.js";
import { badRequest, conflict, forbidden, notFound } from "../errors.js";
import { newId } from "../ids.js";
import { mfaOk, mfaRequired } from "./service.js";

export const REASON_CODES = ["KYC_MISMATCH_CLEARED", "SCREENING_FALSE_POSITIVE", "SCREENING_CONFIRMED", "DOCUMENT_INADEQUATE", "IDENTITY_NOT_ESTABLISHED", "OTHER_WITH_NOTE"] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

type Staff = Extract<Actor, { kind: "staff" }>;

export interface MakerCheckerRequest {
  id: string;
  kind: string;
  subjectRef: string;
  payload: Record<string, unknown>;
  reasonCode: string;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  makerId: string;
  checkerId: string | null;
}

/** Runs inside the checker's approval transaction, so the effect and the approval commit together. */
export type Handler = (q: Queryable, req: MakerCheckerRequest, ctx: AppContext) => Promise<void>;

export class MakerChecker {
  private handlers = new Map<string, { role: string; run: Handler }>();

  /** `role` is the staff role both maker and checker must hold for this kind of request. */
  register(kind: string, role: string, run: Handler): void {
    this.handlers.set(kind, { role, run });
  }

  async propose(ctx: AppContext, maker: Staff, input: { kind: string; subjectRef: string; payload: Record<string, unknown>; reasonCode: string; note?: string; mfaCode: string }, within?: Queryable): Promise<string> {
    const h = this.handlers.get(input.kind);
    if (!h) throw badRequest("unknown_request_kind", `no handler for ${input.kind}`);
    if (!maker.roles.includes(h.role)) throw forbidden("missing_role", `staff role ${h.role} required`);
    if (!mfaOk(ctx, input.mfaCode)) throw mfaRequired();
    if (!(REASON_CODES as readonly string[]).includes(input.reasonCode)) throw badRequest("invalid_reason_code", `reason code must be one of ${REASON_CODES.join(", ")}`);
    if (input.reasonCode === "OTHER_WITH_NOTE" && !input.note?.trim()) throw badRequest("note_required", "OTHER_WITH_NOTE needs a note");
    const now = ctx.clock.now();
    const write = async (q: Queryable) => {
      const id = newId("mc");
      await q.query(
        "insert into maker_checker_requests (id, kind, subject_ref, payload, reason_code, note, maker_id, created_at) values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8)",
        [id, input.kind, input.subjectRef, JSON.stringify(input.payload), input.reasonCode, input.note ?? null, maker.staffId, now.toISOString()],
      );
      await appendAudit(q, { actor: `staff:${maker.staffId}`, action: "maker_checker.proposed", after: { id, kind: input.kind, subjectRef: input.subjectRef }, detail: { id, kind: input.kind, reasonCode: input.reasonCode }, at: now });
      return id;
    };
    // Callers can pass their own transaction so the proposal and what points at it commit together.
    return within ? write(within) : ctx.db.tx(write);
  }

  private async load(q: Queryable, id: string): Promise<MakerCheckerRequest | undefined> {
    const r = (await q.query<{ id: string; kind: string; subject_ref: string; payload: Record<string, unknown>; reason_code: string; note: string | null; status: MakerCheckerRequest["status"]; maker_id: string; checker_id: string | null }>("select * from maker_checker_requests where id = $1 for update", [id]))[0];
    return r && { id: r.id, kind: r.kind, subjectRef: r.subject_ref, payload: r.payload, reasonCode: r.reason_code, note: r.note, status: r.status, makerId: r.maker_id, checkerId: r.checker_id };
  }

  private async decide(ctx: AppContext, checker: Staff, id: string, mfaCode: string, approve: boolean): Promise<void> {
    await txThenThrow(ctx.db, async (q): Promise<TxOutcome<void>> => {
      const req = await this.load(q, id);
      if (!req) return fail(notFound("request"));
      if (req.status !== "pending") return fail(conflict("already_decided", "this request was already decided"));
      const h = this.handlers.get(req.kind);
      if (!h || !checker.roles.includes(h.role)) return fail(forbidden("missing_role", `staff role ${h?.role ?? "?"} required`));
      const now = ctx.clock.now();
      if (checker.staffId === req.makerId) {
        await appendAudit(q, { actor: `staff:${checker.staffId}`, action: "maker_checker.self_approval_refused", detail: { id }, at: now });
        return fail(forbidden("maker_cannot_check", "the person who proposed this cannot approve it"));
      }
      if (!mfaOk(ctx, mfaCode)) return fail(mfaRequired());
      await q.query("update maker_checker_requests set status = $1, checker_id = $2, decided_at = $3 where id = $4", [approve ? "approved" : "rejected", checker.staffId, now.toISOString(), id]);
      await appendAudit(q, { actor: `staff:${checker.staffId}`, action: approve ? "maker_checker.approved" : "maker_checker.rejected", detail: { id, kind: req.kind, makerId: req.makerId }, at: now });
      if (approve) await h.run(q, { ...req, status: "approved", checkerId: checker.staffId }, ctx);
      return ok(undefined);
    });
  }

  approve(ctx: AppContext, checker: Staff, id: string, mfaCode: string) {
    return this.decide(ctx, checker, id, mfaCode, true);
  }

  reject(ctx: AppContext, checker: Staff, id: string, mfaCode: string) {
    return this.decide(ctx, checker, id, mfaCode, false);
  }

  async listPending(ctx: AppContext): Promise<MakerCheckerRequest[]> {
    const rows = await ctx.db.query<{ id: string; kind: string; subject_ref: string; payload: Record<string, unknown>; reason_code: string; note: string | null; status: MakerCheckerRequest["status"]; maker_id: string; checker_id: string | null }>("select * from maker_checker_requests where status = 'pending' order by created_at");
    return rows.map((r) => ({ id: r.id, kind: r.kind, subjectRef: r.subject_ref, payload: r.payload, reasonCode: r.reason_code, note: r.note, status: r.status, makerId: r.maker_id, checkerId: r.checker_id }));
  }
}
