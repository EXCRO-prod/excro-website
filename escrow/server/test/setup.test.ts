import { describe, expect, it } from "vitest";
import { validateSetup, type SetupParty } from "../src/domain/setup.js";
import { noCommission } from "../src/domain/schedule.js";
import { commissionFixtureA } from "./fixtures.js";

const p = (id: string, role: SetupParty["role"], share = 0, fee = { bps: 0, fixedMinor: 0n }): SetupParty => ({ id, role, label: id, depositShareBps: share, feeRule: fee });
const codes = (parties: SetupParty[], c = noCommission()) => validateSetup(parties, c).map((i) => i.code);

describe("party setup validation", () => {
  it("a buyer and a seller with zero commission is valid", () => {
    expect(codes([p("buyer", "payer", 10_000), p("seller", "payee")])).toEqual([]);
  });
  it("accepts co-buyers, a broker, an inspector and an observer", () => {
    const parties = [p("b1", "payer", 6000), p("b2", "payer", 4000), p("seller", "payee"), p("broker", "fee_payee", 0, { bps: 100, fixedMinor: 0n }), p("insp", "verifier"), p("obs", "observer")];
    expect(codes(parties)).toEqual([]);
  });
  it("rejects the wrong shapes with the same codes signing uses", () => {
    expect(codes([p("buyer", "payer", 10_000)])).toEqual(["invalid_shape"]); // fewer than 2 parties
    expect(codes([p("buyer", "payer", 10_000), p("s1", "payee"), p("s2", "payee")])).toContain("payee_count");
    expect(codes([p("buyer", "payer", 5000), p("seller", "payee")])).toContain("deposit_shares");
    expect(codes([p("buyer", "payer", 10_000), p("buyer", "payee")])).toContain("participant_ids_unique");
    expect(codes([p("seller", "payee"), p("obs", "observer")])).toContain("payer_count");
  });
  it("commission plans are checked against the parties", () => {
    const parties = [p("buyer", "payer", 10_000), p("seller", "payee")];
    expect(codes(parties, { ...commissionFixtureA(), collect: "at_funding", onFailure: "refundable" })).toContain("at_funding_refundable");
    expect(codes(parties, { ...commissionFixtureA(), payers: [{ participantId: "ghost", shareBps: 10_000 }] })).toContain("commission_payer_role");
    expect(codes(parties, commissionFixtureA())).toEqual([]);
  });
  it("does not complain about things that only exist once a deal has value and terms", () => {
    const issues = codes([p("buyer", "payer", 10_000), p("seller", "payee")]);
    expect(issues).not.toContain("unset_required");
    expect(issues).not.toContain("units_times_price");
  });
  it("copes with a schedule that has no payee at all", () => {
    expect(codes([p("a", "payer", 5000), p("b", "payer", 5000)])).toContain("payee_count");
  });
  it("copes with an empty party list", () => {
    expect(codes([])).toEqual(["invalid_shape"]);
  });
});
