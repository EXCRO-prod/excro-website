// Deals, party setup (spec 13 step 0), invites, readiness and the KYC gate.
// Nothing here signs or moves money; it decides whether a deal may proceed to drafting/upload,
// and exposes the gate that signing and escrow-account opening must pass (milestones 4 and 5).
import { randomBytes } from "node:crypto";
import { appendAudit, dealAudit, type AuditRow } from "../audit/chain.js";
import { auditActor, type Actor } from "../auth/actor.js";
import type { AppContext } from "../context.js";
import type { Queryable } from "../db/types.js";
import { badRequest, conflict, forbidden, HttpError, notFound } from "../errors.js";
import { newId } from "../ids.js";
import { maskAadhaar, maskEmail, maskMobile, maskPan, normaliseEmail, normaliseMobile } from "../identity/identifiers.js";
import { commissionSchema, noCommission, ROLES, type CommissionPlan, type Role } from "../domain/schedule.js";
import { validateSetup, type SetupParty } from "../domain/setup.js";
import { canTransition, openContext, type DealState, type Flow } from "../domain/stateMachine.js";
import { canonicalize, sha256Hex } from "../util/canonical.js";
import { effectiveStatus, individualPartyOf, partyById, type KycStatus, type PartyRow } from "../kyc/party.js";

// ---- input shapes (already zod-validated at the route) -------------------------------

export interface PartyInput {
  ref: string;
  role: Role;
  label: string;
  mobile: string;
  email: string;
  depositShareBps?: number;
  feeRule?: { bps?: number; fixedMinor?: string };
}

/** Commission as the initiator submits it: payers named by `ref`. Absent = zero commission. */
export interface CommissionInput {
  amount?: unknown;
  gst?: unknown;
  payers: { ref: string; shareBps: number }[];
  collect?: unknown;
  onFailure?: unknown;
  nonRefundableFixedMinor?: string;
}

export interface CreateDealInput {
  parties: PartyInput[];
  commission?: CommissionInput;
}

const MONEY_ROLES: readonly Role[] = ["payer", "payee", "payer_payee", "fee_payee"];
const needsKyc = (r: Role) => r !== "observer";
const needsBank = (r: Role) => MONEY_ROLES.includes(r);

interface DealRow {
  id: string;
  tenant_id: string;
  initiator_account_id: string;
  status: DealState;
  flow: Flow | null;
  kyc_gate: "before_signing" | "before_drafting";
  parties_locked: boolean;
  commission: Record<string, unknown>;
  created_at: Date;
}

interface ParticipantRow {
  id: string;
  deal_id: string;
  ref: string;
  role: Role;
  label: string;
  invitee_mobile: string;
  invitee_email: string;
  invite_token_hash: string;
  account_id: string | null;
  party_id: string | null;
  deposit_share_bps: number;
  fee_rule: { bps: number; fixedMinor: string };
  signs: boolean;
  sign_order: number;
  is_initiator: boolean;
  joined_at: Date | null;
}

// ---- setup preparation shared by create and replace ----------------------------------

interface Prepared {
  parties: (PartyInput & { id: string; mobile: string; email: string; signOrder: number; inviteToken: string })[];
  commission: CommissionPlan;
}

function prepareSetup(input: CreateDealInput, initiatorMobile: string, keep?: Map<string, ParticipantRow>): Prepared {
  if (input.parties.length < 2 || input.parties.length > 10) throw badRequest("party_count", "a deal needs 2 to 10 parties");
  const refs = new Set<string>();
  const mobiles = new Set<string>();
  const emails = new Set<string>();
  const normalised = input.parties.map((p) => {
    const mobile = normaliseMobile(p.mobile);
    const email = normaliseEmail(p.email);
    if (!mobile) throw badRequest("invalid_mobile", `${p.label}: enter a 10-digit Indian mobile number`);
    if (!email) throw badRequest("invalid_email", `${p.label}: enter a valid email address`);
    if (refs.has(p.ref)) throw badRequest("duplicate_ref", `party ref ${p.ref} is used twice`);
    if (mobiles.has(mobile) || emails.has(email)) throw badRequest("duplicate_party", "each party needs their own mobile and email; use payer_payee for one person with two roles");
    refs.add(p.ref);
    mobiles.add(mobile);
    emails.add(email);
    return { ...p, mobile, email };
  });
  if (!mobiles.has(initiatorMobile)) throw badRequest("initiator_must_be_a_party", "the person creating the deal must be one of its parties");

  // Payers first in signing order (spec 13 default); stable within a group.
  const order = [...normalised].sort((a, b) => Number(!(a.role === "payer" || a.role === "payer_payee")) - Number(!(b.role === "payer" || b.role === "payer_payee")));
  const parties = normalised.map((p) => ({
    ...p,
    id: keep?.get(p.mobile)?.id ?? newId("ptc"),
    signOrder: order.indexOf(p) + 1,
    inviteToken: randomBytes(18).toString("base64url"),
  }));
  const idOfRef = new Map(parties.map((p) => [p.ref, p.id]));

  let commission: CommissionPlan = noCommission();
  if (input.commission) {
    const parsed = commissionSchema.safeParse({
      amount: input.commission.amount,
      gst: input.commission.gst,
      payers: input.commission.payers.map((p) => ({ participantId: idOfRef.get(p.ref) ?? `unknown:${p.ref}`, shareBps: p.shareBps })),
      collect: input.commission.collect,
      onFailure: input.commission.onFailure,
      nonRefundableFixedMinor: input.commission.nonRefundableFixedMinor ?? "0",
    });
    if (!parsed.success) throw badRequest("invalid_commission", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    commission = parsed.data;
  }

  const setup: SetupParty[] = parties.map((p) => ({
    id: p.id,
    role: p.role,
    label: p.label,
    depositShareBps: p.depositShareBps ?? 0,
    feeRule: { bps: p.feeRule?.bps ?? 0, fixedMinor: BigInt(p.feeRule?.fixedMinor ?? "0") },
  }));
  const issues = validateSetup(setup, commission);
  if (issues.length > 0) throw badRequest("invalid_setup", issues.map((i) => i.message).join("; "), issues);
  return { parties, commission };
}

const hashToken = (t: string) => sha256Hex(`invite:${t}`);

async function insertParticipants(ctx: AppContext, q: Queryable, dealId: string, prepared: Prepared, initiatorMobile: string, initiatorAccountId: string, keep: Map<string, ParticipantRow> | undefined, now: Date): Promise<void> {
  for (const p of prepared.parties) {
    const kept = keep?.get(p.mobile);
    const isInitiator = p.mobile === initiatorMobile;
    await q.query(
      `insert into deal_participants (id, deal_id, ref, role, label, invitee_mobile, invitee_email, invite_token_hash, account_id, party_id, deposit_share_bps, fee_rule, signs, sign_order, is_initiator, joined_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16)`,
      [
        p.id, dealId, p.ref, p.role, p.label, p.mobile, p.email,
        kept?.invite_token_hash ?? hashToken(p.inviteToken),
        isInitiator ? initiatorAccountId : (kept?.account_id ?? null),
        kept?.party_id ?? null,
        p.depositShareBps ?? 0,
        JSON.stringify({ bps: p.feeRule?.bps ?? 0, fixedMinor: p.feeRule?.fixedMinor ?? "0" }),
        p.role !== "observer", p.signOrder, isInitiator,
        isInitiator ? now.toISOString() : (kept?.joined_at?.toISOString() ?? null),
      ],
    );
    if (!isInitiator && !kept) {
      // Invite code is on its own line, unambiguously delimited by whitespace (never touching
      // punctuation), so it can be lifted back out of the message text without truncation.
      const body = `You have been invited to escrow deal ${dealId} on Excro as ${p.label}.\nSign in (or create your Excro account) and join with this invite code:\n${p.inviteToken}`;
      await ctx.notifier.send(q, { channel: "sms", to: p.mobile, subject: "Excro deal invitation", body }, now);
      await ctx.notifier.send(q, { channel: "email", to: p.email, subject: "Excro deal invitation", body }, now);
    }
  }
}

// ---- create / replace ------------------------------------------------------------------

export async function createDeal(ctx: AppContext, accountId: string, input: CreateDealInput): Promise<{ dealId: string }> {
  const acc = (await ctx.db.query<{ mobile: string; mobile_verified_at: Date | null; email_verified_at: Date | null }>("select mobile, mobile_verified_at, email_verified_at from accounts where id = $1", [accountId]))[0];
  if (!acc?.mobile_verified_at || !acc.email_verified_at) throw forbidden("account_not_verified", "verify your mobile and email first");
  const prepared = prepareSetup(input, acc.mobile);
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    // nextval() comes back as a JS number from PGlite but a string from node-postgres: normalise before formatting.
    const seq = String((await q.query<{ n: string | number }>("select nextval('deal_seq') as n"))[0]!.n);
    const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const dealId = `EX-${yymm}-${seq.padStart(4, "0")}`;
    await q.query("insert into deals (id, initiator_account_id, status, kyc_gate, commission, created_at, updated_at) values ($1,$2,'draft',$3,$4::jsonb,$5,$5)", [dealId, accountId, ctx.config.kycGate, JSON.stringify(canonicalize(prepared.commission)), now.toISOString()]);
    await insertParticipants(ctx, q, dealId, prepared, acc.mobile, accountId, undefined, now);
    await appendAudit(q, { dealId, actor: `account:${accountId}`, action: "deal.created", after: { status: "draft" }, detail: { participants: prepared.parties.map((p) => ({ label: p.label, role: p.role })), commission: prepared.commission.amount.type, kycGate: ctx.config.kycGate }, at: now });
    return { dealId };
  });
}

async function loadDeal(q: Queryable, dealId: string, lock = false): Promise<DealRow> {
  const d = (await q.query<DealRow>(`select * from deals where id = $1${lock ? " for update" : ""}`, [dealId]))[0];
  if (!d) throw notFound("deal");
  return d;
}

const loadParticipants = (q: Queryable, dealId: string) => q.query<ParticipantRow>("select * from deal_participants where deal_id = $1 order by sign_order, id", [dealId]);

/** Party actors see only deals they are part of; staff see all; tenant API keys see nothing here. */
async function assertCanView(q: Queryable, actor: Actor, dealId: string): Promise<void> {
  if (actor.kind === "staff") return;
  if (actor.kind === "party") {
    const r = await q.query("select 1 from deal_participants where deal_id = $1 and account_id = $2", [dealId, actor.accountId]);
    if (r.length > 0) return;
  }
  throw notFound("deal");
}

async function requireInitiator(q: Queryable, actor: Actor, deal: DealRow): Promise<string> {
  if (actor.kind !== "party") throw forbidden("party_session_required", "this action needs the party's own signed-in session");
  if (deal.initiator_account_id !== actor.accountId) throw forbidden("initiator_only", "only the person who created the deal can do this");
  return actor.accountId;
}

export async function replaceParties(ctx: AppContext, actor: Actor, dealId: string, input: CreateDealInput): Promise<void> {
  const now = ctx.clock.now();
  await ctx.db.tx(async (q) => {
    const deal = await loadDeal(q, dealId, true);
    const accountId = await requireInitiator(q, actor, deal);
    if (deal.status !== "draft" || deal.parties_locked) throw conflict("parties_locked", "the party list is fixed once drafting or upload starts; restart the flow to change it");
    const acc = (await q.query<{ mobile: string }>("select mobile from accounts where id = $1", [accountId]))[0]!;
    const old = await loadParticipants(q, dealId);
    const keep = new Map(old.map((p) => [p.invitee_mobile, p]));
    const prepared = prepareSetup(input, acc.mobile, keep);
    await q.query("delete from deal_participants where deal_id = $1", [dealId]);
    await insertParticipants(ctx, q, dealId, prepared, acc.mobile, accountId, keep, now);
    await q.query("update deals set commission = $2::jsonb, updated_at = $3 where id = $1", [dealId, JSON.stringify(canonicalize(prepared.commission)), now.toISOString()]);
    await appendAudit(q, { dealId, actor: auditActor(actor), action: "deal.parties_replaced", detail: { participants: prepared.parties.map((p) => ({ label: p.label, role: p.role })), commission: prepared.commission.amount.type }, at: now });
  });
}

// ---- joining ---------------------------------------------------------------------------

export async function joinDeal(ctx: AppContext, accountId: string, dealId: string, token: string): Promise<{ participantId: string; label: string }> {
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    const p = (await q.query<ParticipantRow>("select * from deal_participants where deal_id = $1 and invite_token_hash = $2 for update", [dealId, hashToken(token)]))[0];
    if (!p) throw notFound("invitation");
    const acc = (await q.query<{ mobile: string; mobile_verified_at: Date | null; email_verified_at: Date | null }>("select mobile, mobile_verified_at, email_verified_at from accounts where id = $1", [accountId]))[0];
    if (!acc?.mobile_verified_at || !acc.email_verified_at) throw forbidden("account_not_verified", "verify your mobile and email first");
    // The link alone is not enough: it must be opened by the invited mobile number's own account.
    if (acc.mobile !== p.invitee_mobile) throw forbidden("invite_for_someone_else", "this invitation was sent to a different mobile number");
    if (p.account_id && p.account_id !== accountId) throw conflict("already_joined", "this invitation was already used");
    if (!p.account_id) {
      await q.query("update deal_participants set account_id = $2, joined_at = $3 where id = $1", [p.id, accountId, now.toISOString()]);
      await appendAudit(q, { dealId, actor: `account:${accountId}`, action: "deal.participant_joined", detail: { participantId: p.id, label: p.label, role: p.role }, at: now });
    }
    return { participantId: p.id, label: p.label };
  });
}

// ---- attaching a party (individual or entity) to a deal role ---------------------------

const POST_SIGNED_STATES = new Set<DealState>(["signed", "account_open", "funded", "in_performance", "release_pending", "disputed", "refunding", "settled", "closed", "lapsed", "frozen_legal"]);

/**
 * A joined participant chooses which of their Excro parties fills their deal role: their own
 * individual party, or an entity they are the signatory for (an entity party belongs to the
 * signatory's own account, spec 13, so this check also proves they may represent it). Not in the
 * master prompt/spec verbatim — needed so a deal role can be filled by a company rather than only
 * ever the signing individual, and readiness/KYC can then be read from the right party (kyc/entity.ts).
 */
export async function selectParty(ctx: AppContext, accountId: string, dealId: string, participantId: string, partyId: string): Promise<void> {
  const now = ctx.clock.now();
  await ctx.db.tx(async (q) => {
    const deal = await loadDeal(q, dealId, true);
    if (POST_SIGNED_STATES.has(deal.status)) throw conflict("too_late", "the party for this role can no longer be changed");
    const p = (await q.query<ParticipantRow>("select * from deal_participants where id = $1 and deal_id = $2", [participantId, dealId]))[0];
    if (!p) throw notFound("participant");
    if (p.account_id !== accountId) throw forbidden("not_your_role", "you can only set the party for your own role");
    const party = await partyById(q, partyId);
    if (!party || party.account_id !== accountId) throw notFound("party");
    await q.query("update deal_participants set party_id = $2 where id = $1", [participantId, partyId]);
    await appendAudit(q, { dealId, actor: `account:${accountId}`, action: "deal.participant_party_selected", detail: { participantId, partyId, partyType: party.type }, at: now });
  });
}

// ---- readiness and the KYC gate ---------------------------------------------------------

export interface ReadinessRow {
  participantId: string;
  label: string;
  role: Role;
  joined: boolean;
  kycStatus: KycStatus;
  /** Status and masked identifiers only; documents are never visible to other parties. */
  panMasked: string | null;
  aadhaarMasked: string | null;
  missing: ("account" | "kyc" | "bank_account")[];
  ready: boolean;
}

export interface Readiness {
  dealId: string;
  kycGate: "before_signing" | "before_drafting";
  participants: ReadinessRow[];
  allReady: boolean;
}

async function partyOf(q: Queryable, p: ParticipantRow): Promise<PartyRow | undefined> {
  if (p.party_id) return partyById(q, p.party_id);
  return p.account_id ? individualPartyOf(q, p.account_id) : undefined;
}

export async function readinessOf(ctx: AppContext, q: Queryable, dealId: string): Promise<Readiness> {
  const deal = await loadDeal(q, dealId);
  const now = ctx.clock.now();
  const rows: ReadinessRow[] = [];
  for (const p of await loadParticipants(q, dealId)) {
    const party = await partyOf(q, p);
    const kycStatus: KycStatus = party ? effectiveStatus(party, now) : "not_started";
    const hasBank = party ? (await q.query("select 1 from bank_accounts where party_id = $1 and status = 'verified'", [party.id])).length > 0 : false;
    const missing: ReadinessRow["missing"] = [];
    if (!p.account_id) missing.push("account");
    if (needsKyc(p.role) && kycStatus !== "verified") missing.push("kyc");
    if (needsBank(p.role) && !hasBank) missing.push("bank_account");
    rows.push({
      participantId: p.id, label: p.label, role: p.role, joined: !!p.account_id, kycStatus,
      panMasked: party?.pan ? maskPan(party.pan) : null,
      aadhaarMasked: party?.aadhaar_last4 ? maskAadhaar(party.aadhaar_last4) : null,
      missing, ready: missing.length === 0,
    });
  }
  return { dealId, kycGate: deal.kyc_gate, participants: rows, allReady: rows.every((r) => r.ready) };
}

/** The one place the KYC gate is decided; every guard that needs "all verified" reads it from here. */
export async function kycGuardFields(ctx: AppContext, q: Queryable, dealId: string): Promise<{ kycGate: "before_signing" | "before_drafting"; allKycVerified: boolean }> {
  const r = await readinessOf(ctx, q, dealId);
  return { kycGate: r.kycGate, allKycVerified: r.allReady };
}

export class KycGateError extends HttpError {
  constructor(readiness: Readiness) {
    super(409, "kyc_gate", "no one can sign and no escrow account opens until every party is verified", readiness.participants.filter((p) => !p.ready).map((p) => ({ label: p.label, missing: p.missing })));
  }
}

/** Called by e-sign (milestone 4) and escrow-account opening (milestone 5) before doing anything. */
export async function assertKycGateOpen(ctx: AppContext, q: Queryable, dealId: string): Promise<void> {
  const r = await readinessOf(ctx, q, dealId);
  if (!r.allReady) throw new KycGateError(r);
}

// ---- reading ------------------------------------------------------------------------------

export async function getDeal(ctx: AppContext, actor: Actor, dealId: string) {
  await assertCanView(ctx.db, actor, dealId);
  const deal = await loadDeal(ctx.db, dealId);
  const participants = await loadParticipants(ctx.db, dealId);
  return {
    id: deal.id, status: deal.status, flow: deal.flow, kycGate: deal.kyc_gate, partiesLocked: deal.parties_locked,
    commission: deal.commission, createdAt: deal.created_at.toISOString(),
    participants: participants.map((p) => ({
      id: p.id, ref: p.ref, role: p.role, label: p.label, signs: p.signs, signOrder: p.sign_order,
      depositShareBps: p.deposit_share_bps, feeRule: p.fee_rule, isInitiator: p.is_initiator, joined: !!p.account_id,
      // Lets the viewer find their own role without exposing anyone's account id.
      isMe: actor.kind === "party" && p.account_id === actor.accountId,
      mobileMasked: maskMobile(p.invitee_mobile), emailMasked: maskEmail(p.invitee_email),
    })),
  };
}

export async function listDeals(ctx: AppContext, accountId: string) {
  const rows = await ctx.db.query<{ id: string; status: string; flow: string | null; created_at: Date; label: string }>(
    "select d.id, d.status, d.flow, d.created_at, p.label from deals d join deal_participants p on p.deal_id = d.id where p.account_id = $1 order by d.created_at desc",
    [accountId],
  );
  return rows.map((r) => ({ id: r.id, status: r.status, flow: r.flow, myLabel: r.label, createdAt: r.created_at.toISOString() }));
}

export async function getReadiness(ctx: AppContext, actor: Actor, dealId: string): Promise<Readiness> {
  await assertCanView(ctx.db, actor, dealId);
  return readinessOf(ctx, ctx.db, dealId);
}

export async function getDealAudit(ctx: AppContext, actor: Actor, dealId: string): Promise<AuditRow[]> {
  await assertCanView(ctx.db, actor, dealId);
  return dealAudit(ctx.db, dealId);
}

// ---- moving through the machine (only what milestone 0a can decide) ------------------------

export async function startDeal(ctx: AppContext, actor: Actor, dealId: string, flow: Flow): Promise<{ status: DealState }> {
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    const deal = await loadDeal(q, dealId, true);
    await requireInitiator(q, actor, deal);
    if (deal.status !== "draft") throw conflict("wrong_state", `deal is ${deal.status}, not draft`);
    const unjoined = (await loadParticipants(q, dealId)).filter((p) => !p.account_id);
    if (unjoined.length > 0) throw conflict("parties_not_joined", "every party must join with an Excro account before drafting or upload starts", unjoined.map((p) => p.label));
    const to: DealState = flow === "A" ? "uploaded" : "intake";
    const gate = await kycGuardFields(ctx, q, dealId);
    const check = canTransition("draft", to, { ...openContext(), ...gate, kycGate: deal.kyc_gate }, flow);
    if (!check.ok) throw new HttpError(409, "kyc_gate", check.reason ?? "blocked", (await readinessOf(ctx, q, dealId)).participants.filter((p) => !p.ready).map((p) => ({ label: p.label, missing: p.missing })));
    await q.query("update deals set status = $2, flow = $3, parties_locked = true, updated_at = $4 where id = $1", [dealId, to, flow, now.toISOString()]);
    await appendAudit(q, { dealId, actor: auditActor(actor), action: "deal.started", before: { status: "draft" }, after: { status: to }, detail: { flow }, at: now });
    return { status: to };
  });
}

/** Adding or removing a party restarts from step 0 (spec 13). Ticks and acceptances reset once they exist (milestone 3+). */
export async function restartDeal(ctx: AppContext, actor: Actor, dealId: string): Promise<{ status: DealState }> {
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    const deal = await loadDeal(q, dealId, true);
    await requireInitiator(q, actor, deal);
    const check = canTransition(deal.status, "draft", openContext());
    if (deal.status === "draft" || !check.ok) throw conflict("cannot_restart", `a deal in state ${deal.status} cannot be restarted`);
    await q.query("update deals set status = 'draft', flow = null, parties_locked = false, updated_at = $2 where id = $1", [dealId, now.toISOString()]);
    await appendAudit(q, { dealId, actor: auditActor(actor), action: "deal.restarted", before: { status: deal.status }, after: { status: "draft" }, at: now });
    return { status: "draft" as DealState };
  });
}

/**
 * Milestone-4 placeholder for e-sign. Its job today is to prove the gate: refuses while any party is
 * unverified, and only ever for a party's own session (routes enforce requireParty).
 */
export async function signGate(ctx: AppContext, accountId: string, dealId: string): Promise<never> {
  await assertCanView(ctx.db, { kind: "party", accountId }, dealId);
  await assertKycGateOpen(ctx, ctx.db, dealId);
  throw new HttpError(501, "not_implemented", "e-sign arrives in milestone 4");
}

export { ROLES };
