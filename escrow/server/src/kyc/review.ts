// Ops KYC review queue (spec 13). High-risk cases (screening hit, identity mismatch) need maker-checker;
// normal-risk cases (document checks, arriving with entity KYC) take one staff decision. Both need MFA and a reason code.
import { appendAudit } from "../audit/chain.js";
import type { Actor } from "../auth/actor.js";
import type { AppContext } from "../context.js";
import type { Queryable } from "../db/types.js";
import { badRequest, conflict, forbidden, notFound } from "../errors.js";
import { maskAadhaar, maskPan } from "../identity/identifiers.js";
import { MakerChecker, REASON_CODES, type MakerCheckerRequest } from "../staff/makerChecker.js";
import { mfaOk, mfaRequired } from "../staff/service.js";
import { expiryFrom } from "./party.js";

export const KYC_ROLE = "ops_kyc";
export const KYC_DECISION_KIND = "kyc_decision";

type Staff = Extract<Actor, { kind: "staff" }>;
export type Decision = "approve" | "reject";

interface ReviewRow {
  id: string;
  party_id: string;
  risk: "normal" | "high";
  reasons: string[];
  status: "open" | "decided";
  maker_checker_id: string | null;
  created_at: Date;
}

/** Applies a decision. Called directly (normal risk) or from the checker's approval transaction (high risk). */
export async function applyKycDecision(q: Queryable, ctx: AppContext, input: { reviewId: string; decision: Decision; actor: string; via: "single" | "maker_checker" }): Promise<void> {
  const rev = (await q.query<ReviewRow>("select * from kyc_reviews where id = $1 for update", [input.reviewId]))[0];
  if (!rev || rev.status !== "open") throw conflict("review_closed", "this review is no longer open");
  const now = ctx.clock.now();
  const status = input.decision === "approve" ? "verified" : "rejected";
  await q.query("update parties set kyc_status=$2, kyc_expires_at=$3, updated_at=$4 where id=$1", [rev.party_id, status, input.decision === "approve" ? expiryFrom(now, ctx.config.kycValidityDays) : null, now.toISOString()]);
  await q.query("update kyc_reviews set status='decided', decision=$2, decided_at=$3 where id=$1", [rev.id, input.decision, now.toISOString()]);
  await appendAudit(q, { actor: input.actor, action: `kyc.${status}`, before: { status: "pending_review" }, after: { status }, detail: { partyId: rev.party_id, reviewId: rev.id, via: input.via }, at: now });
}

export function registerKycHandlers(mc: MakerChecker): void {
  mc.register(KYC_DECISION_KIND, KYC_ROLE, async (q, req: MakerCheckerRequest, ctx) => {
    await applyKycDecision(q, ctx, { reviewId: req.subjectRef, decision: req.payload.decision as Decision, actor: `staff:${req.checkerId}`, via: "maker_checker" });
  });
}

export interface QueueItem {
  reviewId: string;
  partyId: string;
  legalName: string;
  risk: "normal" | "high";
  reasons: string[];
  panMasked: string | null;
  aadhaarMasked: string | null;
  createdAt: string;
  proposal: { requestId: string; makerId: string; decision: string } | null;
}

export async function listQueue(ctx: AppContext): Promise<QueueItem[]> {
  const rows = await ctx.db.query<ReviewRow & { legal_name: string; pan: string | null; aadhaar_last4: string | null; mc_maker: string | null; mc_payload: { decision?: string } | null; mc_status: string | null }>(
    `select r.*, p.legal_name, p.pan, p.aadhaar_last4, m.maker_id as mc_maker, m.payload as mc_payload, m.status as mc_status
       from kyc_reviews r join parties p on p.id = r.party_id
       left join maker_checker_requests m on m.id = r.maker_checker_id
      where r.status = 'open' order by r.created_at`,
  );
  return rows.map((r) => ({
    reviewId: r.id,
    partyId: r.party_id,
    legalName: r.legal_name,
    risk: r.risk,
    reasons: r.reasons,
    panMasked: r.pan ? maskPan(r.pan) : null,
    aadhaarMasked: r.aadhaar_last4 ? maskAadhaar(r.aadhaar_last4) : null,
    createdAt: r.created_at.toISOString(),
    proposal: r.maker_checker_id && r.mc_status === "pending" ? { requestId: r.maker_checker_id, makerId: r.mc_maker!, decision: r.mc_payload?.decision ?? "" } : null,
  }));
}

export async function decideReview(ctx: AppContext, mc: MakerChecker, staff: Staff, reviewId: string, input: { decision: Decision; reasonCode: string; note?: string; mfaCode: string }): Promise<{ status: "decided" } | { status: "awaiting_checker"; requestId: string }> {
  if (!staff.roles.includes(KYC_ROLE)) throw forbidden("missing_role", `staff role ${KYC_ROLE} required`);
  const rev = (await ctx.db.query<ReviewRow>("select * from kyc_reviews where id = $1", [reviewId]))[0];
  if (!rev) throw notFound("review");
  if (rev.status !== "open") throw conflict("review_closed", "this review is no longer open");

  if (rev.risk === "high") {
    if (rev.maker_checker_id) {
      const open = await ctx.db.query("select 1 from maker_checker_requests where id = $1 and status = 'pending'", [rev.maker_checker_id]);
      if (open.length > 0) throw conflict("already_proposed", "a decision is already waiting for a checker");
    }
    const requestId = await ctx.db.tx(async (q) => {
      const id = await mc.propose(ctx, staff, { kind: KYC_DECISION_KIND, subjectRef: rev.id, payload: { decision: input.decision }, reasonCode: input.reasonCode, note: input.note, mfaCode: input.mfaCode }, q);
      await q.query("update kyc_reviews set maker_checker_id = $2 where id = $1", [rev.id, id]);
      return id;
    });
    return { status: "awaiting_checker", requestId };
  }

  if (!mfaOk(ctx, input.mfaCode)) throw mfaRequired();
  if (!(REASON_CODES as readonly string[]).includes(input.reasonCode)) throw badRequest("invalid_reason_code", `reason code must be one of ${REASON_CODES.join(", ")}`);
  await ctx.db.tx((q) => applyKycDecision(q, ctx, { reviewId: rev.id, decision: input.decision, actor: `staff:${staff.staffId}`, via: "single" }));
  return { status: "decided" };
}
