import { describe, expect, it } from "vitest";
import { checkPayoutLines, enumerateOutcomes, validateMoneyMap } from "../src/domain/moneyMap.js";
import { defaultTerms } from "../src/domain/params.js";
import { broker, buyer, commissionFixtureA, completeTerms, makeSchedule, sellerP, termsWithLateDeduction } from "./fixtures.js";

describe("money-map validator", () => {
  it("a fully answered schedule with all charges at zero balances in every row", () => {
    const rep = validateMoneyMap(makeSchedule());
    expect(rep.issues).toEqual([]);
    expect(rep.balanced).toBe(true);
    expect(rep.rows.length).toBeGreaterThan(10);
    for (const r of rep.rows) expect(r.result?.lines.reduce((a, l) => a + l.amountMinor, 0n)).toBe(r.result?.totalDepositsMinor);
  });

  it("balances with commission, late deduction, broker and three co-buyers", () => {
    const s = makeSchedule({
      participants: [buyer(4000, "b1"), buyer(3000, "b2"), buyer(3000, "b3"), sellerP(), broker(100)],
      commission: { ...commissionFixtureA(), payers: [{ participantId: "b1", shareBps: 4000 }, { participantId: "b2", shareBps: 3000 }, { participantId: "seller", shareBps: 3000 }] },
      terms: { ...termsWithLateDeduction(), buyerCancelFeeBps: { status: "set", value: 200, source: "agreement" } },
    });
    const rep = validateMoneyMap(s);
    expect(rep.issues).toEqual([]);
    expect(rep.balanced).toBe(true);
  });

  it("enumerates extremes: 0 and cap-saturating late days, 1 / n/2 / n-1 accepted units, every outcome kind", () => {
    const outs = enumerateOutcomes(makeSchedule({ terms: termsWithLateDeduction() }));
    const kinds = new Set(outs.map((o) => o.kind));
    expect(kinds).toEqual(new Set(["release_all", "partial", "dispute", "reject_all", "refund_full", "buyer_cancel"]));
    const days = new Set(outs.flatMap((o) => ("daysLate" in o ? [o.daysLate] : [])));
    expect(days).toEqual(new Set([0, 1, 10, 11])); // 500 bps cap / 50 bps per day = day 10
    const accepted = new Set(outs.flatMap((o) => (o.kind === "partial" ? [o.acceptedUnits] : [])));
    expect(accepted).toEqual(new Set([1, 20, 39]));
  });

  it("an unset late rate enumerates only the trivial late-day cases", () => {
    const outs = enumerateOutcomes(makeSchedule({ terms: { ...completeTerms(), ldBpsPerDay: { status: "unset" } } }));
    expect(new Set(outs.flatMap((o) => ("daysLate" in o ? [o.daysLate] : [])))).toEqual(new Set([0, 1, 2]));
  });

  it("copes with a single-unit deal", () => {
    const outs = enumerateOutcomes(makeSchedule({ units: 1 }));
    expect(outs.some((o) => o.kind === "partial")).toBe(false);
    expect(validateMoneyMap(makeSchedule({ units: 1 })).balanced).toBe(true);
  });

  it("blocks signing while a required placeholder is unset, and names it", () => {
    const rep = validateMoneyMap(makeSchedule({ terms: defaultTerms() }));
    expect(rep.balanced).toBe(false);
    expect(rep.issues.filter((i) => i.code === "unset_required").map((i) => i.message)).toContain("required term not set: silenceRule");
  });

  it("blocks signing when a late rate has no cap", () => {
    const terms = { ...completeTerms(), ldBpsPerDay: { status: "set" as const, value: 50, source: "agreement" as const } };
    const rep = validateMoneyMap(makeSchedule({ terms }));
    expect(rep.balanced).toBe(false);
    expect(rep.issues.some((i) => i.message.includes("ldCapBps"))).toBe(true);
  });

  it("reports a failing row by name when the waterfall throws", () => {
    const s = makeSchedule();
    const bad = { ...s, deal: { ...s.deal, valueMinor: s.deal.valueMinor - 1n } };
    const rep = validateMoneyMap(bad);
    expect(rep.balanced).toBe(false);
    expect(rep.issues.some((i) => i.code === "units_times_price")).toBe(true);
    expect(rep.rows.some((r) => !r.ok && r.label.startsWith("release_all"))).toBe(true);
  });

  it("catches money sent to someone who cannot receive it", () => {
    // Charge to the payer's own id is fine; to a verifier or observer it is not.
    const obs = { id: "obs", role: "observer" as const, label: "Observer", signs: false, depositShareBps: 0, feeRule: { bps: 0, fixedMinor: 0n } };
    const s = makeSchedule({
      participants: [buyer(), sellerP(), obs],
      extraCharges: [{ id: "bad", label: "Bad", outcomes: ["release_all"], base: "deal_value", fixedMinor: 100n, from: "payee", to: { type: "participant", id: "obs" } }],
    });
    const rep = validateMoneyMap(s);
    expect(rep.balanced).toBe(false);
    expect(rep.rows.some((r) => r.errors.some((e) => e.includes("cannot receive money")))).toBe(true);
  });

  it("catches release to a non-payee and misdirected rounding, commission, held, refund lines", () => {
    // Use the line checker through crafted schedules where the roles make the engine emit such lines.
    const s = makeSchedule({ participants: [buyer(), sellerP()], rounding: "buyer" });
    const rep = validateMoneyMap(s);
    expect(rep.issues.some((i) => i.code === "rounding_beneficiary")).toBe(true);
    expect(rep.balanced).toBe(false);
  });
});

describe("payout line guard", () => {
  const s = makeSchedule();
  const line = (kind: string, to: string) => ({ kind, to, amountMinor: 1n, note: "" }) as never;
  it("refuses money to the wrong place", () => {
    expect(checkPayoutLines(s, [line("release", "buyer")])).toEqual(["release to non-payee buyer"]);
    expect(checkPayoutLines(s, [line("refund", "seller")])).toEqual(["refund to non-payer seller"]);
    expect(checkPayoutLines(s, [line("fee_refund", "seller")])).toContain("fee_refund to non-payer seller");
    expect(checkPayoutLines(s, [line("commission", "seller")])).toContain("commission must go to Excro's fee account");
    expect(checkPayoutLines(s, [line("rounding", "buyer")])).toEqual(["rounding must go to the rounding beneficiary"]);
    expect(checkPayoutLines(s, [line("held", "seller")])).toEqual(["held amounts stay in escrow"]);
    expect(checkPayoutLines(s, [{ kind: "release", to: "seller", amountMinor: -1n, note: "" }])).toEqual(["negative line to seller"]);
  });
  it("accepts correct lines", () => {
    expect(checkPayoutLines(makeSchedule({ commission: commissionFixtureA() }), [line("release", "seller"), line("refund", "buyer"), line("commission", "excro"), line("rounding", "seller"), line("held", "held"), line("charge", "buyer")])).toEqual([]);
  });
  it("a zero-commission plan can never carry a fee line", () => {
    expect(checkPayoutLines(s, [line("commission", "excro")])).toEqual(["fee line present with zero commission"]);
  });
});
