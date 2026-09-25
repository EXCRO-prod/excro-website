// Entity KYC (spec 13): company, LLP, partnership, proprietorship, trust/society.
//
// Design decisions not spelled out literally in the spec (documented here, not invented silently):
//  - The account that starts an entity's KYC is treated as the signatory's own account: the
//    signatory must already have started their own individual KYC (individualPartyOf), and that
//    party becomes entity_details.signatory_party_id. This matches "the signatory... full
//    individual KYC" and keeps the API from letting one account name an arbitrary third party as
//    signatory without that party's own session proving who they are.
//  - Document checks always need a human to look at them (spec: "document checks... go to the
//    ops review queue"), so entity KYC never auto-verifies — submit always opens a kyc_review, at
//    "high" risk when there's a screening hit, a name mismatch, or the entity isn't GST-registered
//    (spec's three explicit high-risk triggers), "normal" risk otherwise (a single ops decision).
//  - Below the GST threshold, the spec's Udyam/shop-establishment alternative is offered to every
//    entity type with entity-level checks, not only proprietorships (proprietorships have their
//    own fixed two-business-proofs document list instead, per their spec row).
//  - Entity KYC only reaches `verified` once the signatory's own individual KYC is `verified` too
//    (submit blocks otherwise) — the mockup's readiness panel shows one row per entity, so the
//    signatory precondition is folded into that one status rather than surfaced separately.
import { appendAudit } from "../audit/chain.js";
import type { AppContext } from "../context.js";
import { ok, txThenThrow } from "../db/util.js";
import { badRequest, conflict, notFound } from "../errors.js";
import { newId } from "../ids.js";
import {
  ACCOUNT_NO_RE, CIN_RE, GSTIN_RE, IFSC_RE, LLPIN_RE, isEntityPan, maskAccount, maskGstin, maskPan, panFromGstin,
} from "../identity/identifiers.js";
import { actorOf, latestCheck, passes, recordCheck, requireVerifiedAccount } from "./checks.js";
import { AUTHORITY_DOC_KINDS, DOC_KINDS, docsSatisfied, ENTITY_RULES, type DocKind, type DocSlot, type EntityType } from "./entityRules.js";
import { effectiveStatus, individualPartyOf, partyById, type KycStatus, type PartyRow } from "./party.js";

interface EntityDetailRow {
  party_id: string;
  gst_registered: boolean;
  gstin: string | null;
  reg_no: string | null;
  reg_no_type: "CIN" | "LLPIN" | "registration" | null;
  signatory_party_id: string;
  beneficial_owners_declared: boolean;
}

async function requireEntity(ctx: AppContext, accountId: string, partyId: string): Promise<{ party: PartyRow & { type: EntityType }; detail: EntityDetailRow }> {
  const party = await partyById(ctx.db, partyId);
  if (!party || party.account_id !== accountId || party.type === "individual") throw notFound("entity KYC profile");
  const detail = (await ctx.db.query<EntityDetailRow>("select * from entity_details where party_id = $1", [partyId]))[0];
  if (!detail) throw notFound("entity KYC profile");
  return { party: party as PartyRow & { type: EntityType }, detail };
}

// ---- start -------------------------------------------------------------------------------

export interface StartEntityInput {
  type: EntityType;
  legalName: string;
  /** Entity's own PAN. Proprietorships omit this — they use the proprietor's individual PAN. */
  pan?: string;
  gstin?: string;
  /** Declares the entity is below the GST threshold, using Udyam/shop & establishment instead (spec 13). */
  gstExempt?: boolean;
  regNo?: string; // CIN / LLPIN / trust registration number
}

export async function startEntity(ctx: AppContext, accountId: string, input: StartEntityInput): Promise<{ partyId: string; status: KycStatus }> {
  await requireVerifiedAccount(ctx, accountId);
  const rules = ENTITY_RULES[input.type];
  const legalName = input.legalName.trim().replace(/\s+/g, " ");
  if (legalName.length < 2) throw badRequest("invalid_name", "enter the entity's registered name");

  const signatory = await individualPartyOf(ctx.db, accountId);
  if (!signatory) throw conflict("signatory_kyc_first", "start your own individual KYC first — you'll be recorded as this entity's signatory");

  const now = ctx.clock.now();
  type CheckOutcome = { status: "pass" | "fail" | "review"; detail: Record<string, unknown>; providerRef: string };
  let pan: string | null = null;
  let panCheck: CheckOutcome | null = null;
  let gstin: string | null = null;
  let gstRegistered = false;
  let gstinCheck: CheckOutcome | null = null;
  let regNo: string | null = null;
  let regNoType: EntityDetailRow["reg_no_type"] = null;
  let mcaCheck: (CheckOutcome & { officers: string[] }) | null = null;

  if (rules.hasEntityChecks) {
    // Guaranteed by ENTITY_RULES (tested): hasEntityChecks is only true for these four types.
    const entityType = input.type as "company" | "llp" | "partnership" | "trust";
    const pan0 = (input.pan ?? "").trim().toUpperCase();
    if (!isEntityPan(pan0, entityType)) throw badRequest("invalid_pan", `enter a valid ${input.type} PAN`);
    const panRes = await ctx.kyc.verifyPan({ pan: pan0, name: legalName });
    if (!panRes.valid) throw badRequest("invalid_pan", "PAN could not be verified");
    pan = pan0;
    const nameOk = !!panRes.nameOnPan && passes(ctx, panRes.nameOnPan, legalName);
    panCheck = { status: nameOk ? "pass" : "review", detail: { nameOnPan: panRes.nameOnPan ?? null }, providerRef: panRes.providerRef };

    // Spec 13's entity table lists GSTIN for company/LLP/partnership but not trust — trusts skip this gate entirely.
    if (rules.needsGstin) {
      if (input.gstin) {
        const g = input.gstin.trim().toUpperCase();
        if (!GSTIN_RE.test(g)) throw badRequest("invalid_gstin", "enter a valid GSTIN");
        if (panFromGstin(g) !== pan) throw badRequest("gstin_pan_mismatch", "this GSTIN does not embed the entity's own PAN");
        const gRes = await ctx.kyc.verifyGstin({ gstin: g, expectedLegalName: legalName });
        if (!gRes.valid) throw badRequest("invalid_gstin", "GSTIN could not be verified");
        gstin = g;
        gstRegistered = true;
        const active = !!gRes.active;
        const nameOk2 = active && !!gRes.legalName && passes(ctx, gRes.legalName, legalName);
        gstinCheck = { status: !active ? "fail" : nameOk2 ? "pass" : "review", detail: { active, legalName: gRes.legalName ?? null }, providerRef: gRes.providerRef };
        if (gstinCheck.status === "fail") throw badRequest("gstin_inactive", "this GSTIN is not active");
      } else if (input.gstExempt) {
        gstRegistered = false;
      } else {
        throw badRequest("gstin_or_exemption_required", "provide a GSTIN, or declare GST-exempt status (spec 13)");
      }
    }

    if (rules.needsMca) {
      const r = (input.regNo ?? "").trim().toUpperCase();
      const re = rules.needsMca === "CIN" ? CIN_RE : LLPIN_RE;
      if (!re.test(r)) throw badRequest("invalid_reg_no", `enter a valid ${rules.needsMca}`);
      const mRes = await ctx.kyc.verifyMca({ regNo: r, type: rules.needsMca, expectedOfficerName: signatory.legal_name });
      if (!mRes.found) throw badRequest("invalid_reg_no", `${rules.needsMca} could not be verified`);
      regNo = r;
      regNoType = rules.needsMca;
      mcaCheck = { status: mRes.status === "active" ? "pass" : "fail", detail: { status: mRes.status, officers: mRes.officers ?? [] }, providerRef: mRes.providerRef, officers: mRes.officers ?? [] };
      if (mcaCheck.status === "fail") throw badRequest("mca_inactive", `${rules.needsMca} status is not active`);
    } else if (input.regNo) {
      regNo = input.regNo.trim();
      regNoType = "registration";
    }
  }
  // Proprietorship: no entity PAN/GSTIN/MCA — the proprietor's own individual KYC already covers this (spec 13).

  return txThenThrow(ctx.db, async (q) => {
    const id = newId("pty");
    await q.query("insert into parties (id, account_id, type, legal_name, kyc_status, pan, created_at, updated_at) values ($1,$2,$3,$4,'in_progress',$5,$6,$6)", [id, accountId, input.type, legalName, pan, now.toISOString()]);
    await q.query(
      "insert into entity_details (party_id, gst_registered, gstin, reg_no, reg_no_type, signatory_party_id, created_at, updated_at) values ($1,$2,$3,$4,$5,$6,$7,$7)",
      [id, gstRegistered, gstin, regNo, regNoType, signatory.id, now.toISOString()],
    );
    if (panCheck) await recordCheck(q, id, "pan", panCheck.status, panCheck.detail, panCheck.providerRef, now);
    if (gstinCheck) await recordCheck(q, id, "gstin", gstinCheck.status, gstinCheck.detail, gstinCheck.providerRef, now);
    if (mcaCheck) await recordCheck(q, id, "mca", mcaCheck.status, mcaCheck.detail, mcaCheck.providerRef, now);
    await appendAudit(q, {
      actor: actorOf(accountId), action: "kyc.entity_started", after: { status: "in_progress" },
      detail: { partyId: id, type: input.type, legalName, signatoryPartyId: signatory.id, panMasked: pan ? maskPan(pan) : null, gstinMasked: gstin ? maskGstin(gstin) : null },
      at: now,
    });
    return ok({ partyId: id, status: "in_progress" as KycStatus });
  });
}

// ---- beneficial owners --------------------------------------------------------------------

export interface BeneficialOwnerInput {
  fullName: string;
  pan: string;
  sharePct: number;
}

/** Declaring an empty list requires `noneAbove10Percent: true`, so "nobody" is a deliberate answer, never a default. */
export async function declareBeneficialOwners(ctx: AppContext, accountId: string, partyId: string, input: { owners: BeneficialOwnerInput[]; noneAbove10Percent?: boolean }): Promise<{ count: number }> {
  await requireVerifiedAccount(ctx, accountId);
  const { party } = await requireEntity(ctx, accountId, partyId);
  if (!ENTITY_RULES[party.type].needsBeneficialOwners) throw conflict("not_applicable", `${party.type} does not declare beneficial owners`);
  if (input.owners.length === 0 && !input.noneAbove10Percent) throw badRequest("declaration_required", "declare no beneficial owner holds 10% or more, or list them");
  for (const o of input.owners) {
    const pan = o.pan.trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw badRequest("invalid_pan", `${o.fullName}: enter a valid PAN`);
    if (o.sharePct < 10 || o.sharePct > 100) throw badRequest("invalid_share", `${o.fullName}: beneficial owners are declared at 10% or more`);
  }
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    await q.query("delete from beneficial_owners where party_id = $1", [partyId]);
    for (const o of input.owners) {
      await q.query("insert into beneficial_owners (id, party_id, full_name, pan, share_pct, created_at) values ($1,$2,$3,$4,$5,$6)", [newId("ubo"), partyId, o.fullName.trim(), o.pan.trim().toUpperCase(), o.sharePct, now.toISOString()]);
    }
    await q.query("update entity_details set beneficial_owners_declared = true, updated_at = $2 where party_id = $1", [partyId, now.toISOString()]);
    await appendAudit(q, { actor: actorOf(accountId), action: "kyc.beneficial_owners_declared", detail: { partyId, count: input.owners.length }, at: now });
    return { count: input.owners.length };
  });
}

// ---- documents -----------------------------------------------------------------------------

export async function uploadDocument(ctx: AppContext, accountId: string, partyId: string, input: { kind: DocKind; reference: string }): Promise<{ id: string }> {
  await requireVerifiedAccount(ctx, accountId);
  await requireEntity(ctx, accountId, partyId);
  if (!DOC_KINDS.includes(input.kind)) throw badRequest("invalid_document_kind", `document kind must be one of ${DOC_KINDS.join(", ")}`);
  if (!input.reference.trim()) throw badRequest("invalid_reference", "a document reference is required");
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    const id = newId("doc");
    // The reference is an opaque pointer (mock mode never stores real file bytes); who uploaded it
    // is on the audit chain, and reviewers see it through the ops KYC queue only (spec 13 data handling).
    await q.query("insert into kyc_documents (id, party_id, kind, reference, created_at) values ($1,$2,$3,$4,$5)", [id, partyId, input.kind, input.reference.trim(), now.toISOString()]);
    await appendAudit(q, { actor: actorOf(accountId), action: "kyc.document_uploaded", detail: { partyId, documentId: id, kind: input.kind }, at: now });
    return { id };
  });
}

// ---- entity bank account ---------------------------------------------------------------------

export async function addEntityBankAccount(ctx: AppContext, accountId: string, partyId: string, input: { accountNumber: string; ifsc: string }): Promise<{ id: string; status: "verified" | "failed"; accountMasked: string }> {
  await requireVerifiedAccount(ctx, accountId);
  const { party } = await requireEntity(ctx, accountId, partyId);
  const acct = input.accountNumber.replace(/\s/g, "");
  const ifsc = input.ifsc.trim().toUpperCase();
  if (!ACCOUNT_NO_RE.test(acct)) throw badRequest("invalid_account_number", "account number must be 9 to 18 digits");
  if (!IFSC_RE.test(ifsc)) throw badRequest("invalid_ifsc", "enter a valid IFSC");
  const dup = await ctx.db.query("select 1 from bank_accounts where party_id = $1 and account_number = $2 and status = 'verified'", [partyId, acct]);
  if (dup.length > 0) throw conflict("bank_account_exists", "this account is already verified");
  // Spec 13: the entity bank account's penny-drop must return the ENTITY's name, never the signatory's.
  const res = await ctx.kyc.pennyDrop({ accountNumber: acct, ifsc, expectedName: party.legal_name });
  const good = res.success && !!res.holderName && passes(ctx, res.holderName, party.legal_name);
  const now = ctx.clock.now();
  return ctx.db.tx(async (q) => {
    const id = newId("bnk");
    const status = good ? "verified" : "failed";
    await q.query("insert into bank_accounts (id, party_id, account_number, account_last4, ifsc, holder_name, status, provider_ref, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)", [id, partyId, acct, acct.slice(-4), ifsc, res.holderName ?? null, status, res.providerRef, now.toISOString()]);
    await appendAudit(q, { actor: actorOf(accountId), action: `kyc.bank_account_${status}`, detail: { partyId, bankAccountId: id, accountMasked: maskAccount(acct.slice(-4)) }, at: now });
    return { id, status, accountMasked: maskAccount(acct.slice(-4)) };
  });
}

// ---- submit --------------------------------------------------------------------------------

function effectiveRequiredDocs(type: EntityType, gstRegistered: boolean): DocSlot[] {
  const rules = ENTITY_RULES[type];
  if (!rules.needsGstin || gstRegistered) return rules.requiredDocs;
  return [...rules.requiredDocs, ["udyam_certificate", "shop_establishment_certificate"]];
}
function effectiveMinSlots(type: EntityType, gstRegistered: boolean): number {
  const rules = ENTITY_RULES[type];
  return !rules.needsGstin || gstRegistered ? rules.minSlotsSatisfied : rules.minSlotsSatisfied + 1;
}

export async function submitEntity(ctx: AppContext, accountId: string, partyId: string): Promise<{ status: KycStatus; reasons: string[] }> {
  await requireVerifiedAccount(ctx, accountId);
  const { party, detail } = await requireEntity(ctx, accountId, partyId);
  if (party.kyc_status !== "in_progress") throw conflict("kyc_not_in_progress", "nothing to submit");
  const rules = ENTITY_RULES[party.type];
  const now = ctx.clock.now();

  if (rules.hasEntityChecks) {
    if ((await latestCheck(ctx.db, partyId, "pan"))?.status !== "pass") throw conflict("kyc_incomplete", "PAN must pass before submitting");
    if (detail.gst_registered && (await latestCheck(ctx.db, partyId, "gstin"))?.status === undefined) throw conflict("kyc_incomplete", "GSTIN check missing");
  }
  if (rules.needsBeneficialOwners && !detail.beneficial_owners_declared) throw conflict("kyc_incomplete", "beneficial owners must be declared before submitting");

  const docs = await ctx.db.query<{ kind: DocKind }>("select kind from kyc_documents where party_id = $1", [partyId]);
  const uploaded = new Set(docs.map((d) => d.kind));
  const { missing } = docsSatisfied(effectiveRequiredDocs(party.type, detail.gst_registered), effectiveMinSlots(party.type, detail.gst_registered), uploaded);
  if (missing.length > 0) throw conflict("documents_missing", `missing required documents: ${missing.map((s) => s.join(" or ")).join("; ")}`, missing);

  const signatory = await partyById(ctx.db, detail.signatory_party_id);
  if (!signatory || effectiveStatus(signatory, now) !== "verified") throw conflict("signatory_not_verified", "the signatory must complete their own individual KYC first");

  // Signatory authority (spec 13): on MCA's officer list, or an authorisation-type document is on file.
  const mca = (await ctx.db.query<{ detail: { officers?: string[] } }>("select detail from kyc_checks where party_id = $1 and kind = 'mca' order by created_at desc limit 1", [partyId]))[0];
  const onMca = (mca?.detail.officers ?? []).some((o) => passes(ctx, o, signatory.legal_name));
  const hasAuthorityDoc = AUTHORITY_DOC_KINDS.some((k) => uploaded.has(k));
  if (rules.hasEntityChecks && !onMca && !hasAuthorityDoc) throw conflict("signatory_authority_missing", "the signatory must be on MCA's officer list, or an authorisation letter / board resolution must be uploaded");

  const reasons: string[] = ["documents_pending_review"];
  if (rules.needsGstin && !detail.gst_registered) reasons.push("non_gst_entity");
  const gstinChk = await latestCheck(ctx.db, partyId, "gstin");
  if (gstinChk?.status === "review") reasons.push("gstin_name_mismatch");
  const panChk = await latestCheck(ctx.db, partyId, "pan");
  if (panChk?.status === "review") reasons.push("pan_name_mismatch");

  const screenTargets = [party.legal_name, signatory.legal_name, ...(mca?.detail.officers ?? [])];
  if (rules.needsBeneficialOwners) {
    const owners = await ctx.db.query<{ full_name: string }>("select full_name from beneficial_owners where party_id = $1", [partyId]);
    screenTargets.push(...owners.map((o) => o.full_name));
  }
  let screeningHit = false;
  const screenResults: { name: string; hit: boolean; providerRef: string }[] = [];
  for (const name of [...new Set(screenTargets)]) {
    const s = await ctx.kyc.screen({ name });
    screenResults.push({ name, hit: s.hit, providerRef: s.providerRef });
    if (s.hit) screeningHit = true;
  }
  if (screeningHit) reasons.push("screening_hit");

  const risk: "normal" | "high" = screeningHit || reasons.includes("non_gst_entity") || reasons.includes("gstin_name_mismatch") ? "high" : "normal";

  return txThenThrow(ctx.db, async (q) => {
    await recordCheck(q, partyId, "screening", screeningHit ? "review" : "pass", { results: screenResults }, "mock-entity-screen", now);
    await q.query("update parties set kyc_status='pending_review', updated_at=$2 where id=$1", [partyId, now.toISOString()]);
    await q.query("insert into kyc_reviews (id, party_id, risk, reasons, created_at) values ($1,$2,$3,$4::jsonb,$5)", [newId("rev"), partyId, risk, JSON.stringify(reasons), now.toISOString()]);
    await appendAudit(q, { actor: actorOf(accountId), action: "kyc.sent_to_review", before: { status: "in_progress" }, after: { status: "pending_review" }, detail: { partyId, reasons, risk }, at: now });
    return ok({ status: "pending_review" as KycStatus, reasons });
  });
}

// ---- reading ---------------------------------------------------------------------------------

export interface EntityKycView {
  partyId: string;
  type: EntityType;
  legalName: string;
  status: KycStatus;
  panMasked: string | null;
  gstinMasked: string | null;
  gstRegistered: boolean;
  regNo: string | null;
  signatoryPartyId: string;
  beneficialOwners: { fullName: string; pan: string; sharePct: number }[];
  documents: { kind: string; status: string }[];
  bankAccounts: { id: string; accountMasked: string; ifsc: string; status: string }[];
  reviewOpen: boolean;
}

export async function myEntities(ctx: AppContext, accountId: string): Promise<{ partyId: string; type: EntityType; legalName: string; status: KycStatus }[]> {
  const now = ctx.clock.now();
  const rows = await ctx.db.query<PartyRow & { type: EntityType }>("select * from parties where account_id = $1 and type != 'individual' order by created_at", [accountId]);
  return rows.map((p) => ({ partyId: p.id, type: p.type, legalName: p.legal_name, status: effectiveStatus(p, now) }));
}

export async function entityKycView(ctx: AppContext, accountId: string, partyId: string): Promise<EntityKycView> {
  const { party, detail } = await requireEntity(ctx, accountId, partyId);
  const owners = await ctx.db.query<{ full_name: string; pan: string; share_pct: string }>("select full_name, pan, share_pct from beneficial_owners where party_id = $1 order by created_at", [partyId]);
  const docs = await ctx.db.query<{ kind: string; status: string }>("select kind, status from kyc_documents where party_id = $1 order by created_at", [partyId]);
  const banks = await ctx.db.query<{ id: string; account_last4: string; ifsc: string; status: string }>("select id, account_last4, ifsc, status from bank_accounts where party_id = $1 order by created_at", [partyId]);
  const open = await ctx.db.query("select 1 from kyc_reviews where party_id = $1 and status = 'open'", [partyId]);
  return {
    partyId: party.id, type: party.type, legalName: party.legal_name, status: effectiveStatus(party, ctx.clock.now()),
    panMasked: party.pan ? maskPan(party.pan) : null, gstinMasked: detail.gstin ? maskGstin(detail.gstin) : null,
    gstRegistered: detail.gst_registered, regNo: detail.reg_no, signatoryPartyId: detail.signatory_party_id,
    beneficialOwners: owners.map((o) => ({ fullName: o.full_name, pan: o.pan, sharePct: Number(o.share_pct) })),
    documents: docs, bankAccounts: banks.map((b) => ({ id: b.id, accountMasked: maskAccount(b.account_last4), ifsc: b.ifsc, status: b.status })),
    reviewOpen: open.length > 0,
  };
}
