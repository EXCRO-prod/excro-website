// Shared helpers between individual and entity KYC: name-match threshold, the account-verified
// precondition, and the append-only kyc_checks log (now also used for gstin/mca checks, milestone 0b).
import type { AppContext } from "../context.js";
import type { Queryable } from "../db/types.js";
import { forbidden } from "../errors.js";
import { newId } from "../ids.js";
import { nameSimilarity } from "../identity/nameMatch.js";
import { getAccount } from "../accounts/service.js";

export type CheckKind = "pan" | "aadhaar" | "screening" | "gstin" | "mca";
export type CheckStatus = "pass" | "fail" | "review";

export const actorOf = (accountId: string): string => `account:${accountId}`;

export async function requireVerifiedAccount(ctx: AppContext, accountId: string): Promise<void> {
  const a = await getAccount(ctx, accountId);
  if (!a?.mobile_verified_at || !a.email_verified_at) throw forbidden("account_not_verified", "verify your mobile and email first");
}

export const passes = (ctx: AppContext, a: string, b: string): boolean => nameSimilarity(a, b) * 100 >= ctx.config.nameMatchPassPct;

export async function latestCheck(q: Queryable, partyId: string, kind: CheckKind): Promise<{ status: CheckStatus } | undefined> {
  return (await q.query<{ status: CheckStatus }>("select status from kyc_checks where party_id = $1 and kind = $2 order by created_at desc, id desc limit 1", [partyId, kind]))[0];
}

export async function recordCheck(q: Queryable, partyId: string, kind: CheckKind, status: CheckStatus, detail: Record<string, unknown>, providerRef: string, at: Date): Promise<void> {
  await q.query("insert into kyc_checks (id, party_id, kind, status, detail, provider_ref, created_at) values ($1,$2,$3,$4,$5::jsonb,$6,$7)", [newId("chk"), partyId, kind, status, JSON.stringify(detail), providerRef, at.toISOString()]);
}
