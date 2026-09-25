// Milestone 0b integration point: a deal role can be filled by an entity (company/LLP/...), not
// only by the signing individual, and readiness/the KYC gate must read the right party's status.
// Mirrors the master prompt's e2e scenario: buyer company (signatory + UBO), seller company,
// broker individual at 1% of seller release — blocked until every party's KYC is verified.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertKycGateOpen, KycGateError } from "../src/deals/service.js";
import { bearer, makeTestApp, signUpAndVerify, verifyIndividual, type TestHarness } from "./testApp.js";

let h: TestHarness;
beforeEach(async () => { h = await makeTestApp(); });
afterEach(async () => { await h.close(); });

const COMPANY_A_PAN = "AAACE1234F"; // 4th letter C = company
const COMPANY_A_GSTIN = "27AAACE1234F1Z5";
const COMPANY_A_CIN = "U12345KA2020PTC123456";
const COMPANY_B_PAN = "AAACR5678G";
const COMPANY_B_GSTIN = "27AAACR5678G1Z5";
const COMPANY_B_CIN = "U54321KA2019PTC654321";

async function verifiedSignatory(mobile: string, email: string, pan: string, name: string, acct: string) {
  const p = await signUpAndVerify(h, mobile, email);
  await verifyIndividual(h, p.token, pan, name, acct);
  return p;
}

let bankAcctCounter = 100000001; // avoid trailing 9999/0000: the mock pennyDrop treats those as special cases

/** Full company entity KYC through to `verified`, docs+UBO+bank included. */
async function verifiedCompany(signatoryToken: string, legalName: string, pan: string, gstin: string, cin: string): Promise<string> {
  const start = await h.json<{ partyId: string }>({ method: "POST", url: "/v1/kyc/entity", headers: bearer(signatoryToken), payload: { type: "company", legalName, pan, gstin, regNo: cin } });
  const partyId = start.body.partyId;
  await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/beneficial-owners`, headers: bearer(signatoryToken), payload: { owners: [{ fullName: "A Beneficial Owner", pan: "ABCPE9999F", sharePct: 40 }] } });
  for (const kind of ["incorporation_certificate", "moa_aoa", "address_proof"]) {
    await h.json({ method: "POST", url: `/v1/kyc/${partyId}/documents`, headers: bearer(signatoryToken), payload: { kind, reference: `ref-${kind}` } });
  }
  await h.json({ method: "POST", url: `/v1/kyc/entity/${partyId}/bank-account`, headers: bearer(signatoryToken), payload: { accountNumber: String(bankAcctCounter++), ifsc: "HDFC0001234" } });
  const submit = await h.json<{ status: string }>({ method: "POST", url: `/v1/kyc/entity/${partyId}/submit`, headers: bearer(signatoryToken) });
  if (submit.body.status !== "pending_review") throw new Error(`unexpected submit result: ${JSON.stringify(submit.body)}`);
  const maker = (await h.json<{ token: string }>({ method: "POST", url: "/v1/staff/login", payload: { email: "ops.maker@excro.local", mfaCode: "000000" } })).body.token;
  const queue = await h.json<{ reviewId: string; partyId: string }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
  const review = queue.body.find((q) => q.partyId === partyId)!;
  const decide = await h.json<{ status: string }>({ method: "POST", url: `/v1/ops/kyc/${review.reviewId}/decide`, headers: bearer(maker), payload: { decision: "approve", reasonCode: "OTHER_WITH_NOTE", note: "clean", mfaCode: "000000" } });
  if (decide.body.status !== "decided") throw new Error(`entity KYC did not verify in one decision: ${JSON.stringify(decide.body)}`);
  return partyId;
}

async function inviteTokenFor(mobile: string): Promise<string> {
  const [msg] = await h.ctx.db.query<{ body: string }>("select body from mock_outbox where channel = 'sms' and to_addr = $1 and body like '%invited%' order by id desc limit 1", [mobile]);
  const token = msg?.body.trim().split("\n").pop();
  if (!token) throw new Error(`no invite found for ${mobile}`);
  return token;
}

describe("a deal role filled by a company reads the company's KYC, not just the signatory's", () => {
  it("the buyer/seller/broker 3-party scenario: readiness only clears once the broker's own KYC is also verified", async () => {
    const buyerSig = await verifiedSignatory("9876543210", "buyer.sig@example.com", "ABCPE1111F", "Harpreet Singh", "111100001111");
    const sellerSig = await verifiedSignatory("9111111111", "seller.sig@example.com", "ABCPE2222F", "Kavya Rao", "222200002222");
    const broker = await signUpAndVerify(h, "9222222222", "broker@example.com"); // no KYC yet

    const buyerCompanyId = await verifiedCompany(buyerSig.token, "NT Imports Pvt Ltd", COMPANY_A_PAN, COMPANY_A_GSTIN, COMPANY_A_CIN);
    const sellerCompanyId = await verifiedCompany(sellerSig.token, "Kavya Electronics Pvt Ltd", COMPANY_B_PAN, COMPANY_B_GSTIN, COMPANY_B_CIN);

    const create = await h.json<{ dealId: string }>({
      method: "POST", url: "/v1/deals", headers: bearer(buyerSig.token),
      payload: {
        parties: [
          { ref: "buyer", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer.sig@example.com", depositShareBps: 10_000 },
          { ref: "seller", role: "payee", label: "Seller", mobile: "9111111111", email: "seller.sig@example.com" },
          { ref: "broker", role: "fee_payee", label: "Broker", mobile: "9222222222", email: "broker@example.com", feeRule: { bps: 100 } },
        ],
      },
    });
    const dealId = create.body.dealId;
    const deal = await h.json<{ participants: { id: string; ref: string }[] }>({ method: "GET", url: `/v1/deals/${dealId}`, headers: bearer(buyerSig.token) });
    const byRef = Object.fromEntries(deal.body.participants.map((p) => [p.ref, p.id]));

    await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(sellerSig.token), payload: { token: await inviteTokenFor("9111111111") } });
    await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(broker.token), payload: { token: await inviteTokenFor("9222222222") } });

    // Attach each company to its deal role. Only the signatory's own account can do this (proven below).
    const attachBuyer = await h.json({ method: "POST", url: `/v1/deals/${dealId}/participants/${byRef.buyer}/party`, headers: bearer(buyerSig.token), payload: { partyId: buyerCompanyId } });
    expect(attachBuyer.status).toBe(200);
    const attachSeller = await h.json({ method: "POST", url: `/v1/deals/${dealId}/participants/${byRef.seller}/party`, headers: bearer(sellerSig.token), payload: { partyId: sellerCompanyId } });
    expect(attachSeller.status).toBe(200);
    // The seller's signatory cannot attach a company party to the BUYER's role.
    const wrongRole = await h.json({ method: "POST", url: `/v1/deals/${dealId}/participants/${byRef.buyer}/party`, headers: bearer(sellerSig.token), payload: { partyId: sellerCompanyId } });
    expect(wrongRole.status).toBe(403);
    // Nobody can attach an entity they are not the signatory/owner of.
    const notYours = await h.json({ method: "POST", url: `/v1/deals/${dealId}/participants/${byRef.broker}/party`, headers: bearer(broker.token), payload: { partyId: buyerCompanyId } });
    expect(notYours.status).toBe(404);

    const readiness = await h.json<{ allReady: boolean; participants: { label: string; role: string; kycStatus: string; missing: string[] }[] }>({ method: "GET", url: `/v1/deals/${dealId}/readiness`, headers: bearer(buyerSig.token) });
    expect(readiness.body.allReady).toBe(false);
    const rows = Object.fromEntries(readiness.body.participants.map((p) => [p.role, p]));
    // Buyer and seller read the COMPANY's status, which is already verified — not the signatory's.
    expect(rows.payer!.kycStatus).toBe("verified");
    expect(rows.payee!.kycStatus).toBe("verified");
    // The broker (individual, no KYC yet) is what's still blocking readiness.
    expect(rows.fee_payee!.kycStatus).toBe("not_started");
    expect(rows.fee_payee!.missing).toContain("kyc");

    await expect(assertKycGateOpen(h.ctx, h.ctx.db, dealId)).rejects.toBeInstanceOf(KycGateError);

    // verifyIndividual already adds a verified bank account as part of the standard flow.
    await verifyIndividual(h, broker.token, "ABCPE3333F", "Aman Mehta", "333300003333");
    const readiness2 = await h.json<{ allReady: boolean; participants: unknown[] }>({ method: "GET", url: `/v1/deals/${dealId}/readiness`, headers: bearer(buyerSig.token) });
    expect(readiness2.body.allReady).toBe(true);
    await expect(assertKycGateOpen(h.ctx, h.ctx.db, dealId)).resolves.toBeUndefined();
  });

  it("the party for a role cannot be changed once the deal has signed", async () => {
    const sig = await verifiedSignatory("9876543210", "sig@example.com", "ABCPE1111F", "Harpreet Singh", "111100001111");
    await signUpAndVerify(h, "9111111111", "seller@example.com"); // just needs to exist as a party
    const create = await h.json<{ dealId: string }>({
      method: "POST", url: "/v1/deals", headers: bearer(sig.token),
      payload: { parties: [
        { ref: "buyer", role: "payer", label: "Buyer", mobile: "9876543210", email: "sig@example.com", depositShareBps: 10_000 },
        { ref: "seller", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ] },
    });
    const dealId = create.body.dealId;
    await h.ctx.db.query("update deals set status = 'signed' where id = $1", [dealId]);
    const deal = await h.json<{ participants: { id: string; ref: string }[] }>({ method: "GET", url: `/v1/deals/${dealId}`, headers: bearer(sig.token) });
    const buyerParticipantId = deal.body.participants.find((p) => p.ref === "buyer")!.id;
    const r = await h.json({ method: "POST", url: `/v1/deals/${dealId}/participants/${buyerParticipantId}/party`, headers: bearer(sig.token), payload: { partyId: "pty_whatever" } });
    expect(r.status).toBe(409);
    expect((r.body as { error: string }).error).toBe("too_late");
  });
});
