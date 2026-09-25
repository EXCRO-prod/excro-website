import type { Queryable } from "../db/types.js";

export type KycStatus = "not_started" | "in_progress" | "pending_review" | "verified" | "rejected" | "expired";

export interface PartyRow {
  id: string;
  account_id: string;
  type: string;
  legal_name: string;
  kyc_status: KycStatus;
  kyc_expires_at: Date | null;
  pan: string | null;
  dob: Date | null;
  aadhaar_last4: string | null;
  aadhaar_provider_ref: string | null;
  aadhaar_name: string | null;
  photo_ref: string | null;
}

/** Verified KYC that has passed its expiry reads as `expired` (spec 13); nothing else about the deal changes. */
export function effectiveStatus(p: Pick<PartyRow, "kyc_status" | "kyc_expires_at">, now: Date): KycStatus {
  return p.kyc_status === "verified" && p.kyc_expires_at && p.kyc_expires_at.getTime() <= now.getTime() ? "expired" : p.kyc_status;
}

export async function individualPartyOf(q: Queryable, accountId: string): Promise<PartyRow | undefined> {
  return (await q.query<PartyRow>("select * from parties where account_id = $1 and type = 'individual'", [accountId]))[0];
}

export async function partyById(q: Queryable, id: string): Promise<PartyRow | undefined> {
  return (await q.query<PartyRow>("select * from parties where id = $1", [id]))[0];
}

export function expiryFrom(now: Date, validityDays: number): string | null {
  return validityDays === 0 ? null : new Date(now.getTime() + validityDays * 86_400_000).toISOString();
}
