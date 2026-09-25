// Append-only audit hash chain (CLAUDE.md #7). Every state change calls appendAudit with the
// same Queryable as the change itself, so the event and the change commit or roll back together.
import type { Queryable } from "../db/types.js";
import { canonicalStringify, sha256Hex } from "../util/canonical.js";
import { AadhaarLeakError, containsAadhaar } from "../identity/aadhaarGuard.js";

export const GENESIS = "0".repeat(64);
const CHAIN_LOCK = 7311; // one writer at a time so `prev` is always the true head

export interface AuditInput {
  dealId?: string | null;
  actor: string; // e.g. "account:acc_x", "staff:stf_y", "system"
  action: string;
  before?: unknown;
  after?: unknown;
  detail?: Record<string, unknown>;
  at: Date;
}

export interface AuditRow {
  seq: number;
  dealId: string | null;
  actor: string;
  action: string;
  beforeHash: string | null;
  afterHash: string | null;
  detail: Record<string, unknown>;
  at: string;
  prevEventHash: string;
  eventHash: string;
}

interface Raw {
  seq: string;
  deal_id: string | null;
  actor: string;
  action: string;
  before_hash: string | null;
  after_hash: string | null;
  detail: Record<string, unknown>;
  at: Date;
  prev_event_hash: string;
  event_hash: string;
}

const hashOf = (v: unknown): string | null => (v === undefined ? null : sha256Hex(canonicalStringify(v)));

function eventHash(r: { seq: number; dealId: string | null; actor: string; action: string; beforeHash: string | null; afterHash: string | null; detail: unknown; at: string; prev: string }): string {
  return sha256Hex(canonicalStringify(r));
}

export async function appendAudit(q: Queryable, ev: AuditInput): Promise<AuditRow> {
  const detail = ev.detail ?? {};
  if (containsAadhaar(detail) || containsAadhaar(ev.before) || containsAadhaar(ev.after)) throw new AadhaarLeakError();
  await q.query("select pg_advisory_xact_lock($1)", [CHAIN_LOCK]);
  const head = await q.query<{ event_hash: string }>("select event_hash from audit_events order by seq desc limit 1");
  const prev = head[0]?.event_hash ?? GENESIS;
  const seq = Number((await q.query<{ n: string }>("select nextval('audit_seq') as n"))[0]!.n);
  const at = ev.at.toISOString();
  const beforeHash = hashOf(ev.before);
  const afterHash = hashOf(ev.after);
  const dealId = ev.dealId ?? null;
  const h = eventHash({ seq, dealId, actor: ev.actor, action: ev.action, beforeHash, afterHash, detail, at, prev });
  await q.query(
    `insert into audit_events (seq, deal_id, actor, action, before_hash, after_hash, detail, at, prev_event_hash, event_hash)
     values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)`,
    [seq, dealId, ev.actor, ev.action, beforeHash, afterHash, JSON.stringify(detail), at, prev, h],
  );
  return { seq, dealId, actor: ev.actor, action: ev.action, beforeHash, afterHash, detail, at, prevEventHash: prev, eventHash: h };
}

const fromRaw = (r: Raw): AuditRow => ({
  seq: Number(r.seq),
  dealId: r.deal_id,
  actor: r.actor,
  action: r.action,
  beforeHash: r.before_hash,
  afterHash: r.after_hash,
  detail: r.detail,
  at: r.at.toISOString(),
  prevEventHash: r.prev_event_hash,
  eventHash: r.event_hash,
});

export interface ChainReport {
  ok: boolean;
  count: number;
  headHash: string;
  brokenAtSeq?: number;
  reason?: string;
}

/** Recomputes every hash from the stored fields and checks each link. */
export async function verifyChain(q: Queryable): Promise<ChainReport> {
  const rows = (await q.query<Raw>("select * from audit_events order by seq")).map(fromRaw);
  let prev = GENESIS;
  for (const r of rows) {
    if (r.prevEventHash !== prev) return { ok: false, count: rows.length, headHash: prev, brokenAtSeq: r.seq, reason: "broken link" };
    const h = eventHash({ seq: r.seq, dealId: r.dealId, actor: r.actor, action: r.action, beforeHash: r.beforeHash, afterHash: r.afterHash, detail: r.detail, at: r.at, prev });
    if (h !== r.eventHash) return { ok: false, count: rows.length, headHash: prev, brokenAtSeq: r.seq, reason: "event content does not match its hash" };
    prev = r.eventHash;
  }
  return { ok: true, count: rows.length, headHash: prev };
}

export async function dealAudit(q: Queryable, dealId: string): Promise<AuditRow[]> {
  return (await q.query<Raw>("select * from audit_events where deal_id = $1 order by seq", [dealId])).map(fromRaw);
}
