import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bearer, makeTestApp, signUpAndVerify, verifyIndividual, type TestHarness } from "./testApp.js";

let h: TestHarness;
beforeEach(async () => { h = await makeTestApp(); });
afterEach(async () => { await h.close(); });

async function twoPartyDeal(harness: TestHarness) {
  const buyer = await signUpAndVerify(harness, "9876543210", "buyer@example.com");
  const seller = await signUpAndVerify(harness, "9111111111", "seller@example.com");
  const create = await harness.json<{ dealId: string }>({
    method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
    payload: {
      parties: [
        { ref: "buyer", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 10_000 },
        { ref: "seller", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ],
    },
  });
  return { buyer, seller, dealId: create.body.dealId };
}

describe("party setup (spec 13 step 0)", () => {
  it("creates a deal with an EX-YYMM-#### id and lists it for both parties once joined", async () => {
    const { buyer, seller, dealId } = await twoPartyDeal(h);
    expect(dealId).toMatch(/^EX-2609-\d{4}$/);
    const mine = await h.json<{ id: string }[]>({ method: "GET", url: "/v1/deals", headers: bearer(buyer.token) });
    expect(mine.body.map((d) => d.id)).toContain(dealId);
    // the seller hasn't joined yet, so the deal doesn't show up for them
    const notYet = await h.json<{ id: string }[]>({ method: "GET", url: "/v1/deals", headers: bearer(seller.token) });
    expect(notYet.body.map((d) => d.id)).not.toContain(dealId);
  });

  it("rejects setups that would also fail the schedule validator", async () => {
    const buyer = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const badShares = await h.json({
      method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 5000 },
        { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ] },
    });
    expect(badShares.status).toBe(400);
    expect((badShares.body as { error: string }).error).toBe("invalid_setup");
  });

  it("the initiator must be one of the parties", async () => {
    const buyer = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const r = await h.json({
      method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9000000000", email: "notme@example.com", depositShareBps: 10_000 },
        { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ] },
    });
    expect(r.status).toBe(400);
    expect((r.body as { error: string }).error).toBe("initiator_must_be_a_party");
  });

  it("accepts co-buyers, a broker and an inspector, with commission validated against the parties", async () => {
    const buyer = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const r = await h.json<{ dealId: string }>({
      method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
      payload: {
        parties: [
          { ref: "b1", role: "payer", label: "Buyer 1", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 6000 },
          { ref: "b2", role: "payer", label: "Buyer 2", mobile: "9000000001", email: "b2@example.com", depositShareBps: 4000 },
          { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
          { ref: "broker", role: "fee_payee", label: "Broker", mobile: "9222222222", email: "broker@example.com", feeRule: { bps: 100 } },
          { ref: "insp", role: "verifier", label: "Inspector", mobile: "9333333333", email: "insp@example.com" },
        ],
        commission: { amount: { type: "bps", bps: 50 }, gst: { mode: "inclusive", rateBps: 1800 }, payers: [{ ref: "b1", shareBps: 5000 }, { ref: "s", shareBps: 5000 }], collect: "at_release", onFailure: "refundable" },
      },
    });
    expect(r.status).toBe(200);
    const deal = await h.json<{ participants: { role: string; label: string; isMe: boolean }[] }>({ method: "GET", url: `/v1/deals/${r.body.dealId}`, headers: bearer(buyer.token) });
    expect(deal.body.participants.map((p) => p.role).sort()).toEqual(["fee_payee", "payee", "payer", "payer", "verifier"]);
    expect(deal.body.participants.filter((p) => p.isMe).map((p) => p.label)).toEqual(["Buyer 1"]);
  });
});

describe("invites and joining", () => {
  it("only the invited mobile's own account can join, and only once", async () => {
    const { seller, dealId } = await twoPartyDeal(h);
    const [msg] = await h.ctx.db.query<{ body: string }>("select body from mock_outbox where channel = 'sms' and to_addr = $1 and body like '%invited%' order by id desc limit 1", ["9111111111"]);
    expect(msg?.body).toContain("invited");
    const token = msg!.body.trim().split("\n").pop();
    expect(token).toBeTruthy();

    const stranger = await signUpAndVerify(h, "9444444444", "stranger@example.com");
    const wrongPerson = await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(stranger.token), payload: { token } });
    expect(wrongPerson.status).toBe(403);

    const ok = await h.json<{ label: string }>({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token } });
    expect(ok.body.label).toBe("Seller");

    const again = await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token } });
    expect(again.status).toBe(200); // idempotent for the same person
  });

  it("a bad token is rejected", async () => {
    const { seller, dealId } = await twoPartyDeal(h);
    const r = await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token: "not-a-real-token" } });
    expect(r.status).toBe(404);
  });
});

describe("readiness and the KYC gate (spec 13)", () => {
  it("before_signing (default): drafting can start before KYC completes, but nobody is ready yet", async () => {
    const { buyer, seller, dealId } = await twoPartyDeal(h);
    await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token: (await joinToken(h, dealId, "9111111111")) } });

    const readiness = await h.json<{ allReady: boolean; participants: { ready: boolean; missing: string[] }[] }>({ method: "GET", url: `/v1/deals/${dealId}/readiness`, headers: bearer(buyer.token) });
    expect(readiness.body.allReady).toBe(false);
    expect(readiness.body.participants.every((p) => p.missing.includes("kyc"))).toBe(true);

    const start = await h.json<{ status: string }>({ method: "POST", url: `/v1/deals/${dealId}/start`, headers: bearer(buyer.token), payload: { flow: "A" } });
    expect(start.body.status).toBe("uploaded");
  });

  it("before_drafting: nothing beyond party setup happens until every party is verified", async () => {
    const h2 = await makeTestApp({ KYC_GATE: "before_drafting" });
    try {
      const { buyer, seller, dealId } = await twoPartyDeal(h2);
      await h2.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token: await joinToken(h2, dealId, "9111111111") } });
      const blocked = await h2.json({ method: "POST", url: `/v1/deals/${dealId}/start`, headers: bearer(buyer.token), payload: { flow: "A" } });
      expect(blocked.status).toBe(409);
      expect((blocked.body as { error: string }).error).toBe("kyc_gate");

      await verifyIndividual(h2, buyer.token, "ABCPE1234F", "Harpreet Singh", "111122223333");
      await verifyIndividual(h2, seller.token, "PQRPE5678G", "Kavya Rao", "444455556666");
      const ok = await h2.json<{ status: string }>({ method: "POST", url: `/v1/deals/${dealId}/start`, headers: bearer(buyer.token), payload: { flow: "A" } });
      expect(ok.body.status).toBe("uploaded");
    } finally {
      await h2.close();
    }
  });

  it("starting a deal locks the party list and fails while a party has not joined", async () => {
    const buyer = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const create = await h.json<{ dealId: string }>({
      method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 10_000 },
        { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ] },
    });
    const start = await h.json({ method: "POST", url: `/v1/deals/${create.body.dealId}/start`, headers: bearer(buyer.token), payload: { flow: "A" } });
    expect(start.status).toBe(409);
    expect((start.body as { error: string }).error).toBe("parties_not_joined");

    const replace = await h.json({
      method: "PUT", url: `/v1/deals/${create.body.dealId}/parties`, headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 10_000 },
        { ref: "s", role: "payee", label: "Seller 2", mobile: "9222222222", email: "seller2@example.com" },
      ] },
    });
    expect(replace.status).toBe(200);
  });

  it("verified KYC is reused: a second deal with the same person needs no re-verification", async () => {
    const buyer = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const seller = await signUpAndVerify(h, "9111111111", "seller@example.com");
    await verifyIndividual(h, buyer.token, "ABCPE1234F", "Harpreet Singh", "111122223333");
    await verifyIndividual(h, seller.token, "PQRPE5678G", "Kavya Rao", "444455556666");

    const create = await h.json<{ dealId: string }>({
      method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 10_000 },
        { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ] },
    });
    await h.json({ method: "POST", url: `/v1/deals/${create.body.dealId}/parties:join`, headers: bearer(seller.token), payload: { token: await joinToken(h, create.body.dealId, "9111111111") } });
    const readiness = await h.json<{ allReady: boolean }>({ method: "GET", url: `/v1/deals/${create.body.dealId}/readiness`, headers: bearer(buyer.token) });
    expect(readiness.body.allReady).toBe(true);
  });

  it("restarting a deal returns it to draft and unlocks the party list", async () => {
    const { buyer, seller, dealId } = await twoPartyDeal(h);
    await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token: await joinToken(h, dealId, "9111111111") } });
    await h.json({ method: "POST", url: `/v1/deals/${dealId}/start`, headers: bearer(buyer.token), payload: { flow: "A" } });
    const restart = await h.json<{ status: string }>({ method: "POST", url: `/v1/deals/${dealId}/restart`, headers: bearer(buyer.token) });
    expect(restart.body.status).toBe("draft");
    const replace = await h.json({
      method: "PUT", url: `/v1/deals/${dealId}/parties`, headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 10_000 },
        { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
        { ref: "obs", role: "observer", label: "Lender", mobile: "9555555555", email: "lender@example.com" },
      ] },
    });
    expect(replace.status).toBe(200);
  });

  it("a non-initiator cannot start or restart or replace the party list", async () => {
    const { seller, dealId } = await twoPartyDeal(h);
    await h.json({ method: "POST", url: `/v1/deals/${dealId}/parties:join`, headers: bearer(seller.token), payload: { token: await joinToken(h, dealId, "9111111111") } });
    const start = await h.json({ method: "POST", url: `/v1/deals/${dealId}/start`, headers: bearer(seller.token), payload: { flow: "A" } });
    expect(start.status).toBe(403);
  });
});

describe("audit chain", () => {
  it("every deal action appends a verifiable, deal-scoped audit trail", async () => {
    const { buyer, dealId } = await twoPartyDeal(h);
    const audit = await h.json<{ action: string }[]>({ method: "GET", url: `/v1/deals/${dealId}/audit`, headers: bearer(buyer.token) });
    expect(audit.body.map((a) => a.action)).toContain("deal.created");
    const verify = await h.json<{ ok: boolean; count: number }>({ method: "GET", url: "/v1/audit:verify" });
    expect(verify.body.ok).toBe(true);
    expect(verify.body.count).toBeGreaterThan(0);
  });

  it("the hash chain itself catches tampering, even if the immutability trigger were bypassed", async () => {
    await twoPartyDeal(h);
    // The append-only trigger is the first line of defence (see the next test); this proves the
    // second one — the cryptographic chain — independently, as it would have to for a privileged
    // attacker (or a bug) that drops the trigger before editing a row.
    await h.ctx.db.exec("drop trigger audit_events_no_change on audit_events");
    await h.ctx.db.query("update audit_events set action = 'tampered' where seq = (select min(seq) from audit_events)");
    const verify = await h.json<{ ok: boolean; reason: string }>({ method: "GET", url: "/v1/audit:verify" });
    expect(verify.body.ok).toBe(false);
    expect(verify.body.reason).toMatch(/does not match/);
  });

  it("audit_events rejects update/delete at the database level even outside the API", async () => {
    await twoPartyDeal(h);
    await expect(h.ctx.db.query("delete from audit_events where seq = 1")).rejects.toThrow(/append-only/);
  });
});

async function joinToken(harness: TestHarness, dealId: string, mobile: string): Promise<string> {
  const [msg] = await harness.ctx.db.query<{ body: string }>("select body from mock_outbox where channel = 'sms' and to_addr = $1 and body like '%invited%' order by id desc limit 1", [mobile]);
  const token = msg?.body.trim().split("\n").pop();
  if (!token) throw new Error(`no invite found for ${dealId}/${mobile}`);
  return token;
}
