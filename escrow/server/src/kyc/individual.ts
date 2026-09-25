// Individual KYC (spec 13): mobile + email (the account), PAN, Aadhaar offline, screening, and a
// penny-dropped bank account for anyone who pays or receives money. KYC belongs to the party and is reused across deals.
import { appendAudit } from "../audit/chain.js";
import type { AppContext } from "../context.js";
import { fail, ok, txThenThrow } from "../db/util.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { newId } from "../ids.js";
import { ACCOUNT_NO_RE, IFSC_RE, isIndividualPan, maskAadhaar, maskAccount, maskPan, PAN_RE } from "../identity/identifiers.js";
import { actorOf, latestCheck, passes, recordCheck, requireVerifiedAccount } from "./checks.js";
import { effectiveStatus, expiryFrom, individualPartyOf, type KycStatus, type PartyRow } from "./party.js";

export async function startIndividual(ctx: AppContext, accountId: string, input: { pan: string; fullName: string }): Promise<{ partyId: string; panVerified: boolean; status: KycStatus }> {
  await requireVerifiedAccount(ctx, accountId);
  const pan = input.pan.trim().toUpperCase();
  const name = input.fullName.trim().replace(/\s+/g, " ");
  if (!PAN_RE.test(pan) || !isIndividualPan(pan)) throw badRequest("invalid_pan", "enter a valid individual PAN (fourth letter P)");
  if (name.length < 2) throw badRequest("invalid_name", "enter your full name as on your PAN");
  const existing = await individualPartyOf(ctx.db, accountId);
  const now = ctx.clock.now();
  if (existing && (existing.kyc_status === "pending_review" || effectiveStatus(existing, now) === "verified")) throw conflict("kyc_locked", "your KYC is already submitted or verified");
  const res = await ctx.kyc.verifyPan({ pan, name });
  const nameOk = res.valid && !!res.nameOnPan && passes(ctx, res.nameOnPan, name);
  const status: "pass" | "fail" | "review" = !res.valid ? "fail" : nameOk ? "pass" : "review";
  return txThenThrow(ctx.db, async (q) => {
    const id = existing?.id ?? newId("pty");
    const before = existing ? { status: existing.kyc_status } : undefined;
    if (existing) {
      // Restarting after rejection/expiry: identity fields are replaced, history stays in kyc_checks and the audit chain.
      await q.query("update parties set legal_name=$2, pan=$3, kyc_status='in_progress', kyc_expires_at=null, dob=null, aadhaar_last4=null, aadhaar_provider_ref=null, aadhaar_name=null, photo_ref=null, updated_at=$4 where id=$1", [id, name, pan, now.toISOString()]);
    } else {
      await q.query("insert into parties (id, account_id, type, legal_name, kyc_status, pan, created_at, updated_at) values ($1,$2,'individual',$3,'in_progress',$4,$5,$5)", [id, accountId, name, pan, now.toISOString()]);
    }
    await recordCheck(q, id, "pan", status, { nameOnPan: res.nameOnPan ?? null }, res.providerRef, now);
    await appendAudit(q, { actor: actorOf(accountId), action: "kyc.pan_checked", before, after: { status: "in_progress" }, detail: { partyId: id, result: status, panMasked: maskPan(pan) }, at: now });
    return ok({ partyId: id, panVerified: status === "pass", status: "in_progress" as KycStatus });
  });
}

export async function aadhaarOffline(ctx: AppContext, accountId: string, input: { consentRef: string }): Promise<{ status: "pass" | "review"; aadhaarMasked: string }> {
  await requireVerifiedAccount(ctx, accountId);
  const party = await individualPartyOf(ctx.db, accountId);
  if (!party || party.kyc_status !== "in_progress") throw conflict("kyc_not_in_progress", "start KYC with your PAN first");
  if ((await latestCheck(ctx.db, party.id, "pan"))?.status !== "pass") throw conflict("pan_not_verified", "your PAN must be verified before Aadhaar");
  const res = await ctx.kyc.aadhaarOffline({ consentRef: input.consentRef, expectedName: party.legal_name });
  const status = passes(ctx, res.name, party.legal_name) ? "pass" : "review";
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    await q.query("update parties set aadhaar_last4=$2, aadhaar_provider_ref=$3, aadhaar_name=$4, dob=$5, photo_ref=$6, updated_at=$7 where id=$1", [party.id, res.last4, res.providerRef, res.name, res.dob, res.photoRef, now.toISOString()]);
    await recordCheck(q, party.id, "aadhaar", status, { last4: res.last4, nameMatchesPan: status === "pass" }, res.providerRef, now);
    await appendAudit(q, { actor: actorOf(accountId), action: "kyc.aadhaar_checked", detail: { partyId: party.id, result: status, aadhaarMasked: maskAadhaar(res.last4) }, at: now });
    return { status, aadhaarMasked: maskAadhaar(res.last4) };
  });
}

export async function submitIndividual(ctx: AppContext, accountId: string): Promise<{ status: KycStatus; reasons: string[] }> {
  await requireVerifiedAccount(ctx, accountId);
  const party = await individualPartyOf(ctx.db, accountId);
  if (!party || party.kyc_status !== "in_progress") throw conflict("kyc_not_in_progress", "nothing to submit");
  const pan = await latestCheck(ctx.db, party.id, "pan");
  const aad = await latestCheck(ctx.db, party.id, "aadhaar");
  if (pan?.status !== "pass" || !aad) throw conflict("kyc_incomplete", "PAN and Aadhaar must be completed before submitting");
  const screen = await ctx.kyc.screen({ name: party.legal_name, dob: party.dob?.toISOString().slice(0, 10), pan: party.pan ?? undefined });
  const now = ctx.clock.now();
  const reasons = [...(aad.status === "review" ? ["name_mismatch_pan_aadhaar"] : []), ...(screen.hit ? ["screening_hit"] : [])];
  return txThenThrow(ctx.db, async (q) => {
    await recordCheck(q, party.id, "screening", screen.hit ? "review" : "pass", { matches: screen.matches }, screen.providerRef, now);
    if (reasons.length === 0) {
      await q.query("update parties set kyc_status='verified', kyc_expires_at=$2, updated_at=$3 where id=$1", [party.id, expiryFrom(now, ctx.config.kycValidityDays), now.toISOString()]);
      await appendAudit(q, { actor: actorOf(accountId), action: "kyc.verified", before: { status: "in_progress" }, after: { status: "verified" }, detail: { partyId: party.id, route: "automatic" }, at: now });
      return ok({ status: "verified" as KycStatus, reasons });
    }
    await q.query("update parties set kyc_status='pending_review', updated_at=$2 where id=$1", [party.id, now.toISOString()]);
    // Screening hits and identity mismatches are the spec's high-risk cases: they need maker-checker.
    await q.query("insert into kyc_reviews (id, party_id, risk, reasons, created_at) values ($1,$2,'high',$3::jsonb,$4)", [newId("rev"), party.id, JSON.stringify(reasons), now.toISOString()]);
    await appendAudit(q, { actor: actorOf(accountId), action: "kyc.sent_to_review", before: { status: "in_progress" }, after: { status: "pending_review" }, detail: { partyId: party.id, reasons }, at: now });
    return ok({ status: "pending_review" as KycStatus, reasons });
  });
}

export async function addBankAccount(ctx: AppContext, accountId: string, input: { accountNumber: string; ifsc: string }): Promise<{ id: string; status: "verified" | "failed"; accountMasked: string; holderName?: string }> {
  await requireVerifiedAccount(ctx, accountId);
  const acct = input.accountNumber.replace(/\s/g, "");
  const ifsc = input.ifsc.trim().toUpperCase();
  if (!ACCOUNT_NO_RE.test(acct)) throw badRequest("invalid_account_number", "account number must be 9 to 18 digits");
  if (!IFSC_RE.test(ifsc)) throw badRequest("invalid_ifsc", "enter a valid IFSC");
  const party = await individualPartyOf(ctx.db, accountId);
  if (!party?.pan) throw conflict("pan_first", "complete PAN verification before adding a bank account");
  const dup = await ctx.db.query("select 1 from bank_accounts where party_id = $1 and account_number = $2 and status = 'verified'", [party.id, acct]);
  if (dup.length > 0) throw conflict("bank_account_exists", "this account is already verified");
  const res = await ctx.kyc.pennyDrop({ accountNumber: acct, ifsc, expectedName: party.legal_name });
  const good = res.success && !!res.holderName && passes(ctx, res.holderName, party.legal_name);
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    const id = newId("bnk");
    const status = good ? "verified" : "failed";
    await q.query("insert into bank_accounts (id, party_id, account_number, account_last4, ifsc, holder_name, status, provider_ref, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id, party.id, acct, acct.slice(-4), ifsc, res.holderName ?? null, status, res.providerRef, now.toISOString()]);
    await appendAudit(q, { actor: actorOf(accountId), action: `kyc.bank_account_${status}`, detail: { partyId: party.id, bankAccountId: id, accountMasked: maskAccount(acct.slice(-4)) }, at: now });
    return { id, status, accountMasked: maskAccount(acct.slice(-4)), ...(res.holderName ? { holderName: res.holderName } : {}) };
  });
}

export interface KycView {
  partyId: string;
  legalName: string;
  status: KycStatus;
  panMasked: string | null;
  aadhaarMasked: string | null;
  checks: { kind: string; status: string }[];
  bankAccounts: { id: string; accountMasked: string; ifsc: string; status: string; holderName: string | null }[];
  reviewOpen: boolean;
}

/** The owner's own view. Other deal participants only ever see status + masked identifiers (deals/readiness). */
export async function myKyc(ctx: AppContext, accountId: string): Promise<KycView | { status: "not_started" }> {
  const p = await individualPartyOf(ctx.db, accountId);
  if (!p) return { status: "not_started" };
  const checks = await ctx.db.query<{ kind: string; status: string }>("select distinct on (kind) kind, status from kyc_checks where party_id = $1 order by kind, created_at desc, id desc", [p.id]);
  const banks = await ctx.db.query<{ id: string; account_last4: string; ifsc: string; status: string; holder_name: string | null }>("select id, account_last4, ifsc, status, holder_name from bank_accounts where party_id = $1 order by created_at", [p.id]);
  const open = await ctx.db.query("select 1 from kyc_reviews where party_id = $1 and status = 'open'", [p.id]);
  return {
    partyId: p.id,
    legalName: p.legal_name,
    status: effectiveStatus(p, ctx.clock.now()),
    panMasked: p.pan ? maskPan(p.pan) : null,
    aadhaarMasked: p.aadhaar_last4 ? maskAadhaar(p.aadhaar_last4) : null,
    checks,
    bankAccounts: banks.map((b) => ({ id: b.id, accountMasked: maskAccount(b.account_last4), ifsc: b.ifsc, status: b.status, holderName: b.holder_name })),
    reviewOpen: open.length > 0,
  };
}

export async function requireParty(ctx: AppContext, accountId: string): Promise<PartyRow> {
  const p = await individualPartyOf(ctx.db, accountId);
  if (!p) throw notFound("KYC profile");
  return p;
}
