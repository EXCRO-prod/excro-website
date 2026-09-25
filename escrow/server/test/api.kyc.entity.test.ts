import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bearer, makeTestApp, signUpAndVerify, verifyIndividual, type TestHarness } from "./testApp.js";

let h: TestHarness;
beforeEach(async () => { h = await makeTestApp(); });
afterEach(async () => { await h.close(); });

async function staffToken(harness: TestHarness, email: string): Promise<string> {
  const r = await harness.json<{ token: string }>({ method: "POST", url: "/v1/staff/login", payload: { email, mfaCode: "000000" } });
  return r.body.token;
}

// Realistic-shaped test identifiers (format-valid, never real):
const COMPANY_PAN = "AAACE1234F"; // 4th letter C = company
const COMPANY_GSTIN = "27AAACE1234F1Z5"; // embeds COMPANY_PAN
const COMPANY_CIN = "U12345KA2020PTC123456";
const LLP_PAN = "AAAFE1234F"; // 4th letter F = firm/LLP
const LLP_GSTIN = "27AAAFE1234F1Z5";
const LLP_LLPIN = "AAA1234";
const PARTNERSHIP_PAN = "AAAFP1234G";
const PARTNERSHIP_GSTIN = "27AAAFP1234G1Z5";

async function verifiedSignatory(mobile: string, email: string, pan: string, name: string, acct: string) {
  const p = await signUpAndVerify(h, mobile, email);
  await verifyIndividual(h, p.token, pan, name, acct);
  return p;
}

describe("entity KYC: signatory precondition and format checks", () => {
  it("cannot start entity KYC before the caller has at least started their own individual KYC", async () => {
    const p = await signUpAndVerify(h, "9876543210", "signatory@example.com");
    const r = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(p.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    expect(r.status).toBe(409);
    expect((r.body as { error: string }).error).toBe("signatory_kyc_first");
  });

  it("rejects a PAN whose holder-type letter does not match the entity type", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const r = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: "ABCPE1234F" /* individual PAN */, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toBe("invalid_pan");
  });

  it("rejects a GSTIN that does not embed the entity's own PAN", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const r = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: "27ZZZZZ9999Z1Z5", regNo: COMPANY_CIN } });
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toBe("gstin_pan_mismatch");
  });

  it("requires either a GSTIN or an explicit GST-exempt declaration", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const r = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, regNo: COMPANY_CIN } });
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toBe("gstin_or_exemption_required");
  });

  it("rejects an inactive GSTIN or an inactive CIN outright, before an application even exists", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    // GSTIN's active/inactive signal lives in the free-text legal name (the GSTIN itself is rigidly
    // formatted and cross-checked against the PAN, so there's no room to embed a trigger word in it).
    const inactiveGstin = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd INACTIVE", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    expect(inactiveGstin.status).toBe(400);
    expect((inactiveGstin.body as { error: string }).error).toBe("gstin_inactive");
    // CIN's inactive signal is a reserved trailing-digit suffix (000000), matching the mock's penny-drop convention.
    const inactiveCin = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: "U12345KA2020PTC000000" } });
    expect(inactiveCin.status).toBe(400);
    expect((inactiveCin.body as { error: string }).error).toBe("mca_inactive");
  });
});

describe("entity KYC: company happy path, normal-risk single ops decision", () => {
  it("goes to review with only documents_pending_review, and verifies on one ops decision", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string; status: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    expect(start.status).toBe(200);
    const partyId = start.body.partyId;

    const listed = await h.json<{ partyId: string; type: string }[]>({ method: "GET", url: "/v1/kyc/entities", headers: bearer(sig.token) });
    expect(listed.body.map((e) => e.partyId)).toContain(partyId);

    const bo = await h.json<{ count: number }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [{ fullName: "Kavya Rao", pan: "ABCPE1234F", sharePct: 60 }] } });
    expect(bo.body.count).toBe(1);

    // The signatory is echoed back by MCA (COMPANY_CIN doesn't end 999999), so authority is
    // established via MCA and no board_resolution/authorisation_letter is needed here.
    for (const kind of ["incorporation_certificate", "moa_aoa", "address_proof"]) {
      const d = await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind, reference: `ref-${kind}` } });
      expect(d.status).toBe(200);
    }

    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/bank-account`, headers: bearer(sig.token), payload: { accountNumber: "222233334444", ifsc: "HDFC0001234" } });

    const submit = await h.json<{ status: string; reasons: string[] }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(submit.body).toEqual({ status: "pending_review", reasons: ["documents_pending_review"] });

    const maker = await staffToken(h, "ops.maker@excro.local");
    const queue = await h.json<{ reviewId: string; risk: string }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
    const item = queue.body.find((q) => q.risk === "normal");
    expect(item).toBeTruthy();
    const decide = await h.json<{ status: string }>({ method: "POST", url: `/v1/ops/kyc/${item!.reviewId}/decide`, headers: bearer(maker), payload: { decision: "approve", reasonCode: "OTHER_WITH_NOTE", note: "docs look fine", mfaCode: "000000" } });
    expect(decide.body.status).toBe("decided"); // normal risk: one staff decision, no maker-checker

    const view = await h.json<{ status: string; panMasked: string; gstinMasked: string; beneficialOwners: unknown[]; documents: unknown[] }>({ method: "GET", url: `/v1/kyc/entity/${partyId}`, headers: bearer(sig.token) });
    expect(view.body.status).toBe("verified");
    expect(view.body.panMasked).toBe("*****1234F");
    expect(view.body.gstinMasked).toBe("27*********1Z5");
    expect(view.body.beneficialOwners).toHaveLength(1);
    expect(view.body.documents).toHaveLength(3);
  });

  it("cannot submit until all required document slots and beneficial owners are in place", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    const partyId = start.body.partyId;
    const early = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(early.status).toBe(409);
    expect((early.body as { error: string }).error).toBe("kyc_incomplete");

    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "incorporation_certificate", reference: "r1" } });
    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [], noneAbove10Percent: true } });
    const stillMissing = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(stillMissing.status).toBe(409);
    expect((stillMissing.body as { error: string }).error).toBe("documents_missing");
  });

  it("beneficial owners: empty declaration needs the explicit flag; PAN and share % are validated", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    const partyId = start.body.partyId;
    const noFlag = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [] } });
    expect(noFlag.status).toBe(400);
    const badPan = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [{ fullName: "X", pan: "notapan", sharePct: 20 }] } });
    expect(badPan.status).toBe(400);
    const belowThreshold = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [{ fullName: "X", pan: "ABCPE1234F", sharePct: 5 }] } });
    expect(belowThreshold.status).toBe(400);
    const ok = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [], noneAbove10Percent: true } });
    expect(ok.status).toBe(200);
  });
});

describe("entity KYC: high-risk triggers need maker-checker (normal risk is a single decision)", () => {
  async function readyCompany(over: { gstExempt?: boolean; legalNameSuffix?: string } = {}) {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const legalName = `Kavya Electronics Pvt Ltd${over.legalNameSuffix ?? ""}`;
    const payload: Record<string, unknown> = { type: "company", legalName, pan: COMPANY_PAN, regNo: COMPANY_CIN };
    if (over.gstExempt) payload.gstExempt = true;
    else payload.gstin = COMPANY_GSTIN;
    const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload });
    const partyId = start.body.partyId;
    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [], noneAbove10Percent: true } });
    const docs = over.gstExempt
      ? ["incorporation_certificate", "moa_aoa", "address_proof", "udyam_certificate"]
      : ["incorporation_certificate", "moa_aoa", "address_proof"];
    for (const kind of docs) await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind, reference: `ref-${kind}` } });
    return { sig, partyId };
  }

  it("a non-GST-registered entity is high-risk and needs the extra Udyam/shop-establishment proof", async () => {
    const { sig, partyId } = await readyCompany({ gstExempt: true });
    const submit = await h.json<{ status: string; reasons: string[] }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(submit.body.reasons).toEqual(expect.arrayContaining(["documents_pending_review", "non_gst_entity"]));

    const maker = await staffToken(h, "ops.maker@excro.local");
    const queue = await h.json<{ reviewId: string; risk: string; partyId: string }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
    const item = queue.body.find((q) => q.partyId === partyId)!;
    expect(item.risk).toBe("high");
    const propose = await h.json<{ status: string; requestId: string }>({ method: "POST", url: `/v1/ops/kyc/${item.reviewId}/decide`, headers: bearer(maker), payload: { decision: "approve", reasonCode: "OTHER_WITH_NOTE", note: "exempt confirmed", mfaCode: "000000" } });
    expect(propose.body.status).toBe("awaiting_checker"); // high risk: a second staff identity must confirm

    const checker = await staffToken(h, "ops.checker@excro.local");
    await h.json({ method: "POST", url: `/v1/ops/maker-checker/${propose.body.requestId}/approve`, headers: bearer(checker), payload: { mfaCode: "000000" } });
    const view = await h.json<{ status: string }>({ method: "GET", url: `/v1/kyc/entity/${partyId}`, headers: bearer(sig.token) });
    expect(view.body.status).toBe("verified");
  });

  it("a GSTIN legal-name mismatch is also high-risk", async () => {
    const { sig, partyId } = await readyCompany({ legalNameSuffix: " MISMATCH" });
    const submit = await h.json<{ reasons: string[] }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(submit.body.reasons).toContain("gstin_name_mismatch");
    const maker = await staffToken(h, "ops.maker@excro.local");
    const queue = await h.json<{ reviewId: string; risk: string; partyId: string }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
    expect(queue.body.find((q) => q.partyId === partyId)!.risk).toBe("high");
  });

  it("a screening hit on a beneficial owner is high-risk", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    const partyId = start.body.partyId;
    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [{ fullName: "SANCTIONED Person", pan: "ABCPE1234F", sharePct: 25 }] } });
    for (const kind of ["incorporation_certificate", "moa_aoa", "address_proof"]) {
      await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind, reference: `ref-${kind}` } });
    }
    const submit = await h.json<{ reasons: string[] }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(submit.body.reasons).toContain("screening_hit");
  });
});

describe("entity KYC: LLP with a signatory not on MCA, established by document instead", () => {
  it("rejects a registration number that fails the LLPIN format outright", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "llp", legalName: "Speedstar Labs LLP", pan: LLP_PAN, gstin: LLP_GSTIN, regNo: "not-an-llpin" } });
    expect(start.status).toBe(400);
    expect((start.body as { error: string }).error).toBe("invalid_reg_no");
  });

  it("no MCA officers (LLPIN ending 9999): submit blocked until an authorisation letter is uploaded, then it passes", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({
      method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token),
      payload: { type: "llp", legalName: "Speedstar Labs LLP", pan: LLP_PAN, gstin: LLP_GSTIN, regNo: "AAA9999" },
    });
    const partyId = start.body.partyId;
    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [], noneAbove10Percent: true } });
    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "llp_agreement", reference: "r1" } });
    const noAuthority = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(noAuthority.status).toBe(409);
    expect((noAuthority.body as { error: string }).error).toBe("signatory_authority_missing");

    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "authorisation_letter", reference: "r2" } });
    const ok = await h.json<{ status: string }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(ok.body.status).toBe("pending_review");
  });

  it("an inactive LLPIN (ending 0000) is rejected at start", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "llp", legalName: "Speedstar Labs LLP", pan: LLP_PAN, gstin: LLP_GSTIN, regNo: "AAA0000" } });
    expect(start.status).toBe(400);
    expect((start.body as { error: string }).error).toBe("mca_inactive");
  });

  it("signatory found on MCA's officer list: no document needed", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "llp", legalName: "Speedstar Labs LLP", pan: LLP_PAN, gstin: LLP_GSTIN, regNo: LLP_LLPIN } });
    const partyId = start.body.partyId;
    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [], noneAbove10Percent: true } });
    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "llp_agreement", reference: "r1" } });
    const submit = await h.json<{ status: string }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(submit.body.status).toBe("pending_review"); // authority came from MCA, not a document
  });
});

describe("entity KYC: partnership has no MCA alternative, so it always needs the authority letter", () => {
  it("the partnership deed alone satisfies the document checklist, but authority still needs the letter", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({
      method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token),
      payload: { type: "partnership", legalName: "Nirmal Traders", pan: PARTNERSHIP_PAN, gstin: PARTNERSHIP_GSTIN },
    });
    const partyId = start.body.partyId;
    await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(sig.token), payload: { owners: [], noneAbove10Percent: true } });
    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "partnership_deed", reference: "r1" } });
    const noAuthority = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(noAuthority.status).toBe(409);
    expect((noAuthority.body as { error: string }).error).toBe("signatory_authority_missing");

    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "authorisation_letter", reference: "r2" } });
    const ok = await h.json<{ status: string }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(ok.body.status).toBe("pending_review");
  });
});

describe("entity KYC: trust also has no MCA alternative", () => {
  it("needs the trust deed and, separately, the resolution establishing signatory authority", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({
      method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token),
      payload: { type: "trust", legalName: "Speedstar Welfare Trust", pan: "AAATE1234F", regNo: "TRUST-REG-001" },
    });
    expect(start.status).toBe(200);
    const partyId = start.body.partyId;
    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "trust_deed", reference: "r1" } });
    const noAuthority = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(noAuthority.status).toBe(409);
    expect((noAuthority.body as { error: string }).error).toBe("signatory_authority_missing");

    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(sig.token), payload: { kind: "board_resolution", reference: "r2" } });
    const submit = await h.json<{ status: string; reasons: string[] }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(sig.token) });
    expect(submit.body).toEqual({ status: "pending_review", reasons: ["documents_pending_review"] }); // no GSTIN concept for trusts (no needsBeneficialOwners, and not GST-exempt-flagged since it never runs the GSTIN path without one supplied)
  });
});

describe("entity KYC: proprietorship uses the proprietor's own individual KYC", () => {
  it("needs no entity PAN/GSTIN/MCA, just two of the three business proofs", async () => {
    const proprietor = await verifiedSignatory("9876543210", "proprietor@example.com", "ABCPE1234F", "Harpreet Singh", "111122223333");
    const start = await h.json<{ partyId: string; status: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(proprietor.token), payload: { type: "proprietorship", legalName: "Nirmal Traders" } });
    expect(start.status).toBe(200);
    const partyId = start.body.partyId;

    const tooFew = await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(proprietor.token), payload: { kind: "gstin_certificate", reference: "r1" } });
    expect(tooFew.status).toBe(200);
    const submitTooEarly = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(proprietor.token) });
    expect(submitTooEarly.status).toBe(409);

    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(proprietor.token), payload: { kind: "shop_establishment_certificate", reference: "r2" } });
    const submit = await h.json<{ status: string; reasons: string[] }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(proprietor.token) });
    expect(submit.body).toEqual({ status: "pending_review", reasons: ["documents_pending_review"] }); // never non_gst_entity for proprietorships
  });
});

describe("entity KYC: ownership and cross-account protection", () => {
  it("a different account cannot view, modify, or submit someone else's entity KYC", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1234F", "Kavya Rao", "111100001111");
    const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(sig.token), payload: { type: "company", legalName: "Kavya Electronics Pvt Ltd", pan: COMPANY_PAN, gstin: COMPANY_GSTIN, regNo: COMPANY_CIN } });
    const partyId = start.body.partyId;
    const stranger = await verifiedSignatory("9000000001", "stranger@example.com", "PQRPE5678H", "Someone Else", "999900001111");
    const view = await h.json({ method: "GET", url: `/v1/kyc/entity/${partyId}`, headers: bearer(stranger.token) });
    expect(view.status).toBe(404);
    const doc = await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(stranger.token), payload: { kind: "moa_aoa", reference: "r" } });
    expect(doc.status).toBe(404);
    const submit = await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(stranger.token) });
    expect(submit.status).toBe(404);
  });
});
