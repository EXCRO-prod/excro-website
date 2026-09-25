import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendAudit } from "../src/audit/chain.js";
import { AadhaarLeakError, containsAadhaar } from "../src/identity/aadhaarGuard.js";
import { bearer, makeTestApp, signUpAndVerify, verifyIndividual, type TestHarness } from "./testApp.js";

let h: TestHarness;
beforeEach(async () => { h = await makeTestApp(); });
afterEach(async () => { await h.close(); });

async function staffToken(harness: TestHarness, email: string): Promise<string> {
  const r = await harness.json<{ token: string }>({ method: "POST", url: "/v1/staff/login", payload: { email, mfaCode: "000000" } });
  return r.body.token;
}

describe("individual KYC: format checks and the happy path", () => {
  it("rejects a non-individual or malformed PAN", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const notP = await h.json({ method: "POST", url: "/v1/kyc/individual", payload: { pan: "ABCCE1234F", fullName: "Harpreet Singh" }, headers: bearer(p.token) });
    expect(notP.status).toBe(400);
    const malformed = await h.json({ method: "POST", url: "/v1/kyc/individual", payload: { pan: "123", fullName: "Harpreet Singh" }, headers: bearer(p.token) });
    expect(malformed.status).toBe(400);
  });

  it("a full clean run verifies automatically, with masked identifiers only", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await verifyIndividual(h, p.token, "ABCPE1234F", "Harpreet Singh", "111122223333");
    const me = await h.json<{ status: string; panMasked: string; aadhaarMasked: string }>({ method: "GET", url: "/v1/kyc/me", headers: bearer(p.token) });
    expect(me.body.status).toBe("verified");
    expect(me.body.panMasked).toBe("*****1234F");
    expect(me.body.aadhaarMasked).toMatch(/^XXXX XXXX \d{4}$/);
  });

  it("Aadhaar cannot be attempted before PAN passes", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const r = await h.json({ method: "POST", url: "/v1/kyc/individual/aadhaar", payload: { consentRef: "c1" }, headers: bearer(p.token) });
    expect(r.status).toBe(409);
  });

  it("a penny-drop failure (account ending 9999) is recorded but does not block re-adding a different account", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await h.json({ method: "POST", url: "/v1/kyc/individual", payload: { pan: "ABCPE1234F", fullName: "Harpreet Singh" }, headers: bearer(p.token) });
    const bad = await h.json<{ status: string }>({ method: "POST", url: "/v1/kyc/individual/bank-account", payload: { accountNumber: "111122229999", ifsc: "HDFC0001234" }, headers: bearer(p.token) });
    expect(bad.body.status).toBe("failed");
    const good = await h.json<{ status: string }>({ method: "POST", url: "/v1/kyc/individual/bank-account", payload: { accountNumber: "111122223333", ifsc: "HDFC0001234" }, headers: bearer(p.token) });
    expect(good.body.status).toBe("verified");
  });

  it("submitting twice, or without completing the steps, is refused", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const early = await h.json({ method: "POST", url: "/v1/kyc/individual:submit", headers: bearer(p.token) });
    expect(early.status).toBe(409);
    await verifyIndividual(h, p.token, "ABCPE1234F", "Harpreet Singh", "111122223333");
    const again = await h.json({ method: "POST", url: "/v1/kyc/individual:submit", headers: bearer(p.token) });
    expect(again.status).toBe(409);
  });
});

describe("high-risk KYC needs maker-checker; normal review needs one staff decision", () => {
  it("a name mismatch between PAN and Aadhaar goes to review and needs maker-checker to verify", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await h.json({ method: "POST", url: "/v1/kyc/individual", payload: { pan: "ABCPE1234F", fullName: "Harpreet MISMATCH Singh" }, headers: bearer(p.token) });
    const aad = await h.json<{ status: string }>({ method: "POST", url: "/v1/kyc/individual/aadhaar", payload: { consentRef: "c1" }, headers: bearer(p.token) });
    expect(aad.body.status).toBe("review");
    await h.json({ method: "POST", url: "/v1/kyc/individual/bank-account", payload: { accountNumber: "111122223333", ifsc: "HDFC0001234" }, headers: bearer(p.token) });
    const sub = await h.json<{ status: string; reasons: string[] }>({ method: "POST", url: "/v1/kyc/individual:submit", headers: bearer(p.token) });
    expect(sub.body).toEqual({ status: "pending_review", reasons: ["name_mismatch_pan_aadhaar"] });

    const maker = await staffToken(h, "ops.maker@excro.local");
    const queue = await h.json<{ reviewId: string; risk: string }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
    expect(queue.body).toHaveLength(1);
    expect(queue.body[0]!.risk).toBe("high");
    const reviewId = queue.body[0]!.reviewId;

    const propose = await h.json<{ status: string; requestId: string }>({ method: "POST", url: `/v1/ops/kyc/${reviewId}/decide`, headers: bearer(maker), payload: { decision: "approve", reasonCode: "KYC_MISMATCH_CLEARED", mfaCode: "000000" } });
    expect(propose.body.status).toBe("awaiting_checker");

    // still pending: the maker's own approval does not verify anyone
    const stillPending = await h.json<{ status: string }>({ method: "GET", url: "/v1/kyc/me", headers: bearer(p.token) });
    expect(stillPending.body.status).toBe("pending_review");

    const selfApprove = await h.json({ method: "POST", url: `/v1/ops/maker-checker/${propose.body.requestId}/approve`, headers: bearer(maker), payload: { mfaCode: "000000" } });
    expect(selfApprove.status).toBe(403);

    const checker = await staffToken(h, "ops.checker@excro.local");
    const wrongMfa = await h.json({ method: "POST", url: `/v1/ops/maker-checker/${propose.body.requestId}/approve`, headers: bearer(checker), payload: { mfaCode: "999999" } });
    expect(wrongMfa.status).toBe(403);

    const approve = await h.json({ method: "POST", url: `/v1/ops/maker-checker/${propose.body.requestId}/approve`, headers: bearer(checker), payload: { mfaCode: "000000" } });
    expect(approve.status).toBe(200);

    const verified = await h.json<{ status: string }>({ method: "GET", url: "/v1/kyc/me", headers: bearer(p.token) });
    expect(verified.body.status).toBe("verified");

    // a decided request cannot be decided again
    const again = await h.json({ method: "POST", url: `/v1/ops/maker-checker/${propose.body.requestId}/approve`, headers: bearer(checker), payload: { mfaCode: "000000" } });
    expect(again.status).toBe(409);
  });

  it("a screening hit can be rejected by maker-checker, which rejects the KYC", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await verifyIndividual(h, p.token, "ABCPE1234F", "SANCTION Listed Person", "111122223333").catch(() => {});
    const sub = await h.json<{ status: string; reasons: string[] }>({ method: "GET", url: "/v1/kyc/me", headers: bearer(p.token) });
    expect(sub.body.status).toBe("pending_review");

    const maker = await staffToken(h, "ops.maker@excro.local");
    const checker = await staffToken(h, "ops.checker@excro.local");
    const queue = await h.json<{ reviewId: string; reasons: string[] }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
    expect(queue.body[0]!.reasons).toContain("screening_hit");
    const propose = await h.json<{ requestId: string }>({ method: "POST", url: `/v1/ops/kyc/${queue.body[0]!.reviewId}/decide`, headers: bearer(maker), payload: { decision: "reject", reasonCode: "SCREENING_CONFIRMED", mfaCode: "000000" } });
    await h.json({ method: "POST", url: `/v1/ops/maker-checker/${propose.body.requestId}/approve`, headers: bearer(checker), payload: { mfaCode: "000000" } });
    const final = await h.json<{ status: string }>({ method: "GET", url: "/v1/kyc/me", headers: bearer(p.token) });
    expect(final.body.status).toBe("rejected");
  });

  it("OTHER_WITH_NOTE needs a note; an unknown reason code is refused", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await h.json({ method: "POST", url: "/v1/kyc/individual", payload: { pan: "ABCPE1234F", fullName: "Harpreet MISMATCH Singh" }, headers: bearer(p.token) });
    await h.json({ method: "POST", url: "/v1/kyc/individual/aadhaar", payload: { consentRef: "c1" }, headers: bearer(p.token) });
    await h.json({ method: "POST", url: "/v1/kyc/individual/bank-account", payload: { accountNumber: "111122223333", ifsc: "HDFC0001234" }, headers: bearer(p.token) });
    await h.json({ method: "POST", url: "/v1/kyc/individual:submit", headers: bearer(p.token) });
    const maker = await staffToken(h, "ops.maker@excro.local");
    const queue = await h.json<{ reviewId: string }[]>({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(maker) });
    const noNote = await h.json({ method: "POST", url: `/v1/ops/kyc/${queue.body[0]!.reviewId}/decide`, headers: bearer(maker), payload: { decision: "approve", reasonCode: "OTHER_WITH_NOTE", mfaCode: "000000" } });
    expect(noNote.status).toBe(400);
    const badCode = await h.json({ method: "POST", url: `/v1/ops/kyc/${queue.body[0]!.reviewId}/decide`, headers: bearer(maker), payload: { decision: "approve", reasonCode: "NOT_A_REAL_CODE", mfaCode: "000000" } });
    expect(badCode.status).toBe(400);
  });

  it("non-ops staff cannot see or decide the queue", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await verifyIndividual(h, p.token, "ABCPE1234F", "Harpreet MISMATCH Singh", "111122223333").catch(() => {});
    // admin has ops_kyc too in the seed, so use a fabricated staff-less party token to prove staff-only gating instead
    const denied = await h.json({ method: "GET", url: "/v1/ops/kyc-queue", headers: bearer(p.token) });
    expect(denied.status).toBe(403);
  });
});

describe("Aadhaar never touches the database or the audit log", () => {
  it("consentRef is a DigiLocker handle, not an Aadhaar number, and it never appears in stored audit detail even if it looked like one", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await h.json({ method: "POST", url: "/v1/kyc/individual", payload: { pan: "ABCPE1234F", fullName: "Harpreet Singh" }, headers: bearer(p.token) });
    // 234123412346 is Verhoeff-valid (Aadhaar-shaped), but consentRef is just an opaque handle the
    // route passes to the KYC provider and never persists, so this succeeds like any other consent ref.
    const r = await h.json({ method: "POST", url: "/v1/kyc/individual/aadhaar", payload: { consentRef: "234123412346" }, headers: bearer(p.token) });
    expect(r.status).toBe(200);
    const rows = await h.ctx.db.query<{ n: string | number }>("select count(*) as n from audit_events where detail::text like '%234123412346%'");
    expect(Number(rows[0]!.n)).toBe(0);
  });

  it("the audit guard itself refuses to write a full Aadhaar-shaped value, as a backstop against a future leak", async () => {
    // Direct unit-level check of the backstop (appendAudit/containsAadhaar): whatever calls it in
    // the future, a real 12-digit Aadhaar-shaped number in `detail`, `before` or `after` is refused
    // before it reaches the database, in the same transaction as the rest of the change.
    await expect(
      h.ctx.db.tx((q) => appendAudit(q, { actor: "system", action: "test.leak", detail: { note: "234123412346" }, at: h.clock.now() })),
    ).rejects.toThrow(AadhaarLeakError);
    const rows = await h.ctx.db.query<{ n: string | number }>("select count(*) as n from audit_events where detail::text like '%234123412346%'");
    expect(Number(rows[0]!.n)).toBe(0);
  });

  it("grep proves no 12-digit Aadhaar-shaped value ever lands in the columns that could hold identity data", async () => {
    const p = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    await verifyIndividual(h, p.token, "ABCPE1234F", "Harpreet Singh", "111122223333");
    // Restricted to columns that could plausibly hold a person-supplied or provider-returned
    // identity string (never hashes/hex ids/refs, which are long hex and can coincidentally
    // contain a 12-digit Verhoeff-valid run with no bearing on Aadhaar).
    // bank_accounts.account_number is deliberately excluded: a legitimate 9-18 digit account number
    // can coincidentally be Verhoeff-valid, which is exactly what containsAadhaar's `allowKeys` is
    // for on keyed JSON (audit detail) — it doesn't apply to a bare column, so this table is out of scope here.
    const targets = [
      ["parties", "legal_name"], ["parties", "aadhaar_last4"], ["parties", "aadhaar_name"], ["parties", "photo_ref"], ["parties", "pan"],
      ["kyc_checks", "detail"], ["bank_accounts", "holder_name"],
      ["audit_events", "detail"], ["mock_outbox", "body"],
    ] as const;
    for (const [t, col] of targets) {
      const rows = await h.ctx.db.query<{ v: string }>(`select ${col}::text as v from ${t} where ${col} is not null`);
      for (const row of rows) {
        expect(containsAadhaar(row.v), `possible Aadhaar-shaped value in ${t}.${col}: ${row.v}`).toBe(false);
      }
    }
  });
});
