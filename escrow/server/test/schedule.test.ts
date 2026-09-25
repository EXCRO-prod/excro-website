import { describe, expect, it } from "vitest";
import { allCharges, canonicalJson, chargeAmount, depositors, scheduleSchema, scheduleSha256, seller, validateSchedule } from "../src/domain/schedule.js";
import { defaultTerms } from "../src/domain/params.js";
import { broker, buyer, commissionFixtureA, completeTerms, makeSchedule, sellerP, termsWithLateDeduction } from "./fixtures.js";

const codes = (s: ReturnType<typeof makeSchedule>) => validateSchedule(s).map((i) => i.code);

describe("schedule JSON", () => {
  it("parses money given as strings and canonicalises bigint as strings", () => {
    const s = makeSchedule();
    const json = JSON.parse(canonicalJson(s));
    expect(json.deal.valueMinor).toBe("184000000");
    const round = scheduleSchema.parse(json);
    expect(round.deal.valueMinor).toBe(184_000_000n);
  });

  it("sha256 is stable across key order and changes with any term", () => {
    const s = makeSchedule();
    const reverseKeys = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(reverseKeys)
        : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reverseKeys(x)]))
        : v;
    const reordered = scheduleSchema.parse(reverseKeys(JSON.parse(canonicalJson(s))));
    expect(scheduleSha256(reordered)).toBe(scheduleSha256(s));
    expect(scheduleSha256(s)).toMatch(/^[0-9a-f]{64}$/);
    const changed = makeSchedule({ terms: { ...completeTerms(), inspectionDays: { status: "set", value: 4, source: "agreement" } } });
    expect(scheduleSha256(changed)).not.toBe(scheduleSha256(s));
    expect(scheduleSha256(makeSchedule({ commission: commissionFixtureA() }))).not.toBe(scheduleSha256(s));
  });

  it("rejects malformed money and participant counts", () => {
    const j = JSON.parse(canonicalJson(makeSchedule()));
    j.deal.valueMinor = "18.4";
    expect(scheduleSchema.safeParse(j).success).toBe(false);
    const k = JSON.parse(canonicalJson(makeSchedule()));
    k.participants = [k.participants[0]];
    expect(scheduleSchema.safeParse(k).success).toBe(false);
  });
});

describe("structural validation", () => {
  it("a complete schedule is clean", () => {
    expect(validateSchedule(makeSchedule())).toEqual([]);
    expect(validateSchedule(makeSchedule({ commission: commissionFixtureA(), terms: termsWithLateDeduction() }))).toEqual([]);
  });
  it("participants and roles", () => {
    expect(codes(makeSchedule({ participants: [buyer(5000), sellerP()] }))).toContain("deposit_shares");
    expect(codes(makeSchedule({ participants: [buyer(), sellerP(), { ...sellerP(), id: "s2" }] }))).toContain("payee_count");
    expect(codes(makeSchedule({ participants: [buyer(2500, "a"), buyer(2500, "b"), buyer(2500, "c"), buyer(2500, "d"), sellerP()] }))).toContain("payer_count");
    expect(codes(makeSchedule({ participants: [buyer(), sellerP(), broker(), { ...broker(), id: "b2" }] }))).toContain("fee_payee_count");
    expect(codes(makeSchedule({ participants: [buyer(), buyer(0, "buyer"), sellerP()] }))).toContain("participant_ids_unique");
    expect(codes(makeSchedule({ participants: [{ ...buyer(), signs: false }, sellerP()] }))).toContain("signing_roles");
    const obs = { id: "obs", role: "observer" as const, label: "O", signs: true, depositShareBps: 0, feeRule: { bps: 0, fixedMinor: 0n } };
    expect(codes(makeSchedule({ participants: [buyer(), sellerP(), obs] }))).toContain("signing_roles");
    expect(codes(makeSchedule({ participants: [buyer(), { ...sellerP(), depositShareBps: 100 }] }))).toContain("deposit_share_role");
    expect(codes(makeSchedule({ participants: [buyer(), { ...sellerP(), feeRule: { bps: 10, fixedMinor: 0n } }] }))).toContain("fee_rule_role");
    expect(codes(makeSchedule({ participants: [buyer(), { ...sellerP(), feeRule: { bps: 0, fixedMinor: 5n } }] }))).toContain("fee_rule_role");
  });
  it("deal value and rounding", () => {
    const s = makeSchedule();
    expect(validateSchedule({ ...s, deal: { ...s.deal, valueMinor: 0n, unitPriceMinor: 0n } }).map((i) => i.code)).toContain("deal_value");
    expect(validateSchedule({ ...s, deal: { ...s.deal, valueMinor: s.deal.valueMinor + 1n } }).map((i) => i.code)).toContain("units_times_price");
    expect(codes(makeSchedule({ rounding: "ghost" }))).toContain("rounding_beneficiary");
  });
  it("commission rules (spec 14)", () => {
    const c = commissionFixtureA();
    expect(codes(makeSchedule({ commission: { ...c, payers: [] } }))).toContain("commission_payers");
    expect(codes(makeSchedule({ commission: { ...c, payers: [{ participantId: "buyer", shareBps: 4000 }, { participantId: "seller", shareBps: 5000 }] } }))).toContain("commission_shares");
    expect(codes(makeSchedule({ commission: { ...c, payers: [{ participantId: "ghost", shareBps: 5000 }, { participantId: "seller", shareBps: 5000 }] } }))).toContain("commission_payer_role");
    expect(codes(makeSchedule({ commission: { ...c, payers: [{ participantId: "broker", shareBps: 5000 }, { participantId: "seller", shareBps: 5000 }], }, participants: [buyer(), sellerP(), broker()] }))).toContain("commission_payer_role");
    expect(codes(makeSchedule({ commission: { ...c, collect: "at_funding", onFailure: "refundable" } }))).toContain("at_funding_refundable");
    expect(codes(makeSchedule({ commission: { ...c, collect: "at_funding", onFailure: "refundable_except_fixed" } }))).toContain("at_funding_refundable");
    expect(codes(makeSchedule({ commission: { ...c, collect: "at_funding", onFailure: "non_refundable" } }))).toContain("at_funding_needs_depositors");
    expect(codes(makeSchedule({ commission: { ...c, collect: "at_funding", onFailure: "non_refundable", payers: [{ participantId: "buyer", shareBps: 10_000 }] } }))).toEqual([]);
    expect(codes(makeSchedule({ commission: { ...c, amount: { type: "bps", bps: 50, minMinor: 10n, maxMinor: 5n } } }))).toContain("commission_min_max");
    expect(codes(makeSchedule({ commission: { ...c, amount: { type: "none" } } }))).toContain("commission_payers_when_none");
  });
  it("uncapped per-day charges and unknown beneficiaries", () => {
    const perDay = { id: "d", label: "Delay", outcomes: ["release_all"], base: "deal_value", bps: 10, perDayLate: true, from: "payee", to: { type: "payers" } };
    expect(codes(makeSchedule({ extraCharges: [perDay] }))).toContain("uncapped_charge");
    expect(codes(makeSchedule({ extraCharges: [{ ...perDay, capBps: 500 }] }))).toEqual([]);
    expect(codes(makeSchedule({ extraCharges: [{ ...perDay, maxMinor: 100 }] }))).toEqual([]);
    expect(codes(makeSchedule({ extraCharges: [{ ...perDay, bps: 0 }] }))).toEqual([]);
    expect(codes(makeSchedule({ extraCharges: [{ ...perDay, capBps: 5, to: { type: "participant", id: "ghost" } }] }))).toContain("charge_target");
  });
  it("unset required terms block", () => {
    expect(codes(makeSchedule({ terms: defaultTerms() }))).toContain("unset_required");
  });
});

describe("charges", () => {
  it("derives late delivery, cancellation and broker charges from placeholders", () => {
    const s = makeSchedule({ participants: [buyer(), sellerP(), broker(100)] });
    expect(allCharges(s).map((c) => c.id)).toEqual(["late_delivery", "buyer_cancel_fee", "fee_broker"]);
    expect(allCharges(makeSchedule({ terms: defaultTerms() })).every((c) => c.bps === 0)).toBe(true);
  });
  it("chargeAmount: one rounding step, caps, min and max", () => {
    const [ld] = allCharges(makeSchedule({ terms: termsWithLateDeduction() }));
    expect(ld).toBeDefined();
    if (!ld) return;
    expect(chargeAmount(ld, 174_800_000n, 1)).toBe(874_000n);
    expect(chargeAmount(ld, 174_800_000n, 100)).toBe(8_740_000n); // capped at 5%
    expect(chargeAmount(ld, 174_800_000n, 0)).toBe(0n);
    expect(chargeAmount({ ...ld, capBps: undefined, minMinor: 1_000_000n }, 174_800_000n, 1)).toBe(1_000_000n);
    expect(chargeAmount({ ...ld, capBps: undefined, maxMinor: 500_000n }, 174_800_000n, 1)).toBe(500_000n);
    expect(chargeAmount({ ...ld, bps: 0, capBps: undefined, fixedMinor: 700n }, 1n, 5)).toBe(700n);
  });
  it("role helpers", () => {
    const s = makeSchedule();
    expect(depositors(s).map((p) => p.id)).toEqual(["buyer"]);
    expect(seller(s).id).toBe("seller");
    expect(() => seller(makeSchedule({ participants: [buyer(), buyer(0, "x")] }) as never)).toThrow();
  });
});
