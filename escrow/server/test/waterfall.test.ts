import { describe, expect, it } from "vitest";
import { computeOutcome, EXCRO, HELD, WaterfallError } from "../src/domain/waterfall.js";
import { computeCommission, computeDeposits } from "../src/domain/commission.js";
import { noCommission } from "../src/domain/schedule.js";
import { defaultTerms } from "../src/domain/params.js";
import { amountTo, broker, buyer, commissionFixtureA, completeTerms, makeSchedule, rupees, sellerP, termsWithLateDeduction } from "./fixtures.js";

const R = rupees;

describe("fixture (a): commission 0.5% GST-inclusive, 50/50, at release, refundable", () => {
  const s = makeSchedule({ commission: commissionFixtureA(), terms: termsWithLateDeduction() });
  it("38 of 40 accepted, 1 day late", () => {
    const r = computeOutcome(s, { kind: "partial", acceptedUnits: 38, daysLate: 1 });
    expect(r.totalDepositsMinor).toBe(R(1_844_600));
    expect(amountTo(r.lines, "seller")).toBe(R(1_734_660));
    expect(amountTo(r.lines, "buyer", "refund")).toBe(R(92_000));
    expect(amountTo(r.lines, "buyer", "charge")).toBe(R(8_740));
    expect(amountTo(r.lines, EXCRO)).toBe(R(9_200));
    expect(r.lines.reduce((a, l) => a + l.amountMinor, 0n)).toBe(R(1_844_600));
    expect(r.waivedMinor).toBe(0n);
  });
});

describe("fixture (b): same deal, default zero commission", () => {
  const s = makeSchedule({ terms: termsWithLateDeduction() });
  it("deposit is deal value only and no fee line exists", () => {
    const r = computeOutcome(s, { kind: "partial", acceptedUnits: 38, daysLate: 1 });
    expect(r.totalDepositsMinor).toBe(R(1_840_000));
    expect(amountTo(r.lines, "seller")).toBe(R(1_739_260));
    expect(amountTo(r.lines, "buyer", "refund")).toBe(R(92_000));
    expect(amountTo(r.lines, "buyer", "charge")).toBe(R(8_740));
    expect(r.lines.some((l) => l.kind === "commission" || l.kind === "fee_refund")).toBe(false);
  });
});

describe("zero placeholders mean plain outcomes", () => {
  const s = makeSchedule(); // every charge placeholder at zero
  it("release_all pays the seller everything, even when very late", () => {
    const r = computeOutcome(s, { kind: "release_all", daysLate: 400 });
    expect(r.lines).toEqual([{ kind: "release", to: "seller", amountMinor: R(1_840_000), note: "Release to payee" }]);
  });
  it("buyer_cancel with a zero fee refunds everything", () => {
    const r = computeOutcome(s, { kind: "buyer_cancel" });
    expect(amountTo(r.lines, "buyer")).toBe(R(1_840_000));
    expect(amountTo(r.lines, "seller")).toBe(0n);
  });
  it("an unset late rate is treated as zero, not as a hidden default", () => {
    const blank = makeSchedule({ terms: { ...completeTerms(), ldBpsPerDay: { status: "unset" } } });
    expect(amountTo(computeOutcome(blank, { kind: "release_all", daysLate: 9 }).lines, "seller")).toBe(R(1_840_000));
  });
});

describe("spec 14 example rows (deal value Rs 18,40,000)", () => {
  const release = { kind: "release_all", daysLate: 0 } as const;
  const noShip = { kind: "refund_full", reason: "no_ship" } as const;

  it("row 1: none", () => {
    const s = makeSchedule();
    expect(amountTo(computeOutcome(s, release).lines, "seller")).toBe(R(1_840_000));
    expect(amountTo(computeOutcome(s, noShip).lines, "buyer")).toBe(R(1_840_000));
  });

  it("row 2: 0.5% inclusive, 50/50, at release, refundable", () => {
    const s = makeSchedule({ commission: commissionFixtureA() });
    expect(computeDeposits(s).totalMinor).toBe(R(1_844_600));
    const rel = computeOutcome(s, release);
    expect(amountTo(rel.lines, "seller")).toBe(R(1_835_400));
    expect(amountTo(rel.lines, EXCRO)).toBe(R(9_200));
    const fail = computeOutcome(s, noShip);
    expect(amountTo(fail.lines, "buyer")).toBe(R(1_844_600));
    expect(amountTo(fail.lines, EXCRO)).toBe(0n);
  });

  it("row 3: 0.5% inclusive, buyer pays, at funding, non-refundable", () => {
    const s = makeSchedule({
      commission: { ...commissionFixtureA(), payers: [{ participantId: "buyer", shareBps: 10_000 }], collect: "at_funding", onFailure: "non_refundable" },
    });
    expect(computeDeposits(s).totalMinor).toBe(R(1_849_200));
    const rel = computeOutcome(s, release);
    expect(amountTo(rel.lines, "seller")).toBe(R(1_840_000));
    expect(amountTo(rel.lines, EXCRO)).toBe(R(9_200));
    expect(rel.lines.find((l) => l.kind === "commission")?.withdrawnAtFunding).toBe(true);
    const fail = computeOutcome(s, noShip);
    expect(amountTo(fail.lines, "buyer")).toBe(R(1_840_000));
    expect(amountTo(fail.lines, EXCRO)).toBe(R(9_200));
  });

  it("row 4: 0.5% + 18% GST, seller pays, outside escrow", () => {
    const s = makeSchedule({
      commission: {
        amount: { type: "bps", bps: 50 },
        gst: { mode: "exclusive", rateBps: 1800 },
        payers: [{ participantId: "seller", shareBps: 10_000 }],
        collect: "outside_escrow",
        onFailure: "refundable",
        nonRefundableFixedMinor: 0n,
      },
    });
    expect(computeDeposits(s).totalMinor).toBe(R(1_840_000));
    const rel = computeOutcome(s, release);
    expect(amountTo(rel.lines, "seller")).toBe(R(1_840_000));
    expect(rel.lines.some((l) => l.to === EXCRO)).toBe(false);
    expect(rel.outsideEscrowInvoices).toEqual([{ participantId: "seller", amountMinor: R(10_856) }]);
    expect(computeCommission(s).gstMinor).toBe(R(1_656));
  });
});

describe("commission plan variants", () => {
  const plan = (over: Record<string, unknown>) => ({ ...commissionFixtureA(), ...over }) as ReturnType<typeof commissionFixtureA>;

  it("fixed amount, and min/max clamps on a percentage", () => {
    const fixed = makeSchedule({ commission: plan({ amount: { type: "fixed", minor: R(1_000) } }) });
    expect(computeCommission(fixed).feeMinor).toBe(R(1_000));
    const floor = makeSchedule({ commission: plan({ amount: { type: "bps", bps: 50, minMinor: R(20_000) } }) });
    expect(computeCommission(floor).feeMinor).toBe(R(20_000));
    const ceil = makeSchedule({ commission: plan({ amount: { type: "bps", bps: 50, maxMinor: R(5_000) } }) });
    expect(computeCommission(ceil).feeMinor).toBe(R(5_000));
    const inRange = makeSchedule({ commission: plan({ amount: { type: "bps", bps: 50, minMinor: R(1), maxMinor: R(99_999) } }) });
    expect(computeCommission(inRange).feeMinor).toBe(R(9_200));
  });

  it("inclusive GST with a zero rate backs out zero GST", () => {
    const s = makeSchedule({ commission: plan({ gst: { mode: "inclusive", rateBps: 0 } }) });
    expect(computeCommission(s).gstMinor).toBe(0n);
  });

  it("non-refundable at release: the payer's fee share is kept on failure", () => {
    const s = makeSchedule({ commission: plan({ onFailure: "non_refundable" }) });
    const fail = computeOutcome(s, { kind: "refund_full", reason: "lost" });
    expect(amountTo(fail.lines, "buyer")).toBe(R(1_840_000));
    expect(amountTo(fail.lines, EXCRO)).toBe(R(4_600));
    expect(fail.waivedMinor).toBe(R(4_600)); // seller's share: nothing to take it from
  });

  it("refundable except a fixed portion", () => {
    const s = makeSchedule({ commission: plan({ onFailure: "refundable_except_fixed", nonRefundableFixedMinor: R(1_000) }) });
    const fail = computeOutcome(s, { kind: "refund_full", reason: "lost" });
    expect(amountTo(fail.lines, EXCRO)).toBe(R(500)); // buyer's half of the fixed portion
    expect(amountTo(fail.lines, "buyer", "fee_refund")).toBe(R(4_100));
    // A fixed portion larger than the share is capped at the share.
    const big = makeSchedule({ commission: plan({ onFailure: "refundable_except_fixed", nonRefundableFixedMinor: R(1_000_000) }) });
    const failBig = computeOutcome(big, { kind: "refund_full", reason: "lost" });
    expect(amountTo(failBig.lines, EXCRO)).toBe(R(4_600));
    expect(failBig.lines.some((l) => l.kind === "fee_refund")).toBe(false);
  });

  it("a payee's commission share is capped by their payout and the shortfall is waived", () => {
    const s = makeSchedule({ commission: plan({ amount: { type: "fixed", minor: R(2_000_000) }, payers: [{ participantId: "seller", shareBps: 10_000 }] }), units: 1, price: R(1_000) });
    const r = computeOutcome(s, { kind: "release_all", daysLate: 0 });
    expect(amountTo(r.lines, EXCRO)).toBe(R(1_000));
    expect(amountTo(r.lines, "seller")).toBe(0n);
    expect(r.waivedMinor).toBe(R(1_999_000));
  });

  it("payee share is not taken on a refundable failure but is taken from a cancellation fee when non-refundable", () => {
    const terms = { ...completeTerms(), buyerCancelFeeBps: { status: "set" as const, value: 200, source: "agreement" as const } };
    const refundable = makeSchedule({ commission: plan({}), terms });
    const a = computeOutcome(refundable, { kind: "buyer_cancel" });
    expect(amountTo(a.lines, "seller")).toBe(R(36_800));
    expect(amountTo(a.lines, "buyer", "fee_refund")).toBe(R(4_600));
    const nonRef = makeSchedule({ commission: plan({ onFailure: "non_refundable" }), terms });
    const b = computeOutcome(nonRef, { kind: "buyer_cancel" });
    expect(amountTo(b.lines, "seller")).toBe(R(36_800) - R(4_600));
    expect(amountTo(b.lines, EXCRO)).toBe(R(9_200));
  });

  it("dispute takes the commission with the undisputed release and holds the disputed units", () => {
    const s = makeSchedule({ commission: commissionFixtureA(), terms: termsWithLateDeduction() });
    const r = computeOutcome(s, { kind: "dispute", acceptedUnits: 38, heldUnits: 2, daysLate: 1 });
    expect(amountTo(r.lines, HELD)).toBe(R(92_000));
    expect(amountTo(r.lines, "seller")).toBe(R(1_734_660));
    expect(amountTo(r.lines, EXCRO)).toBe(R(9_200));
    expect(amountTo(r.lines, "buyer", "refund")).toBe(0n);
  });
});

describe("charges", () => {
  it("late deduction caps at the agreed cap", () => {
    const s = makeSchedule({ terms: termsWithLateDeduction() });
    const r = computeOutcome(s, { kind: "release_all", daysLate: 400 });
    expect(amountTo(r.lines, "buyer", "charge")).toBe(R(92_000)); // 5% of 18,40,000
    expect(amountTo(r.lines, "seller")).toBe(R(1_748_000));
  });

  it("buyer cancellation fee comes out of the refund and goes to the seller", () => {
    const s = makeSchedule({ terms: { ...completeTerms(), buyerCancelFeeBps: { status: "set", value: 200, source: "agreement" } } });
    const r = computeOutcome(s, { kind: "buyer_cancel" });
    expect(amountTo(r.lines, "seller")).toBe(R(36_800));
    expect(amountTo(r.lines, "buyer")).toBe(R(1_803_200));
  });

  it("broker fee is a percentage of the seller's net release", () => {
    const s = makeSchedule({ participants: [buyer(), sellerP(), broker(100)], commission: commissionFixtureA(), terms: termsWithLateDeduction() });
    const r = computeOutcome(s, { kind: "partial", acceptedUnits: 38, daysLate: 1 });
    // seller net = 17,34,660; broker 1% = 17,346.60
    expect(amountTo(r.lines, "broker")).toBe(1_734_660_00n / 100n);
    expect(amountTo(r.lines, "seller")).toBe(R(1_734_660) - 1_734_660_00n / 100n);
    expect(amountTo(r.lines, "broker") + amountTo(r.lines, "seller")).toBe(R(1_734_660));
  });

  it("a broker gets nothing when the seller receives nothing", () => {
    const s = makeSchedule({ participants: [buyer(), sellerP(), broker(100, R(500))] });
    const r = computeOutcome(s, { kind: "refund_full", reason: "no_ship" });
    expect(amountTo(r.lines, "broker")).toBe(0n); // fee rules only apply to release outcomes
    expect(r.waivedMinor).toBe(0n);
    // On a release too small to cover the fixed fee, the fee is capped at the release and the rest waived.
    const tiny = makeSchedule({ participants: [buyer(), sellerP(), broker(0, R(500))], units: 1, price: R(200) });
    const t = computeOutcome(tiny, { kind: "release_all", daysLate: 0 });
    expect(amountTo(t.lines, "broker")).toBe(R(200));
    expect(amountTo(t.lines, "seller")).toBe(0n);
    expect(t.waivedMinor).toBe(R(300));
  });

  it("custom charges (future placeholders) plug in without engine changes", () => {
    const s = makeSchedule({
      extraCharges: [{ id: "x1", label: "Handling", outcomes: ["release_all"], base: "deal_value", bps: 100, from: "payee", to: { type: "participant", id: "buyer" }, minMinor: R(10) }],
    });
    const r = computeOutcome(s, { kind: "release_all", daysLate: 0 });
    expect(amountTo(r.lines, "buyer", "charge")).toBe(R(18_400));
    expect(amountTo(r.lines, "seller")).toBe(R(1_840_000) - R(18_400));
    // outside its listed outcomes it does nothing
    expect(amountTo(computeOutcome(s, { kind: "buyer_cancel" }).lines, "buyer", "charge")).toBe(0n);
  });

  it("a charge taken from payers to a participant reduces their refund; a payee-to-payee charge stays with the payee", () => {
    const s = makeSchedule({
      participants: [buyer(), sellerP(), broker()],
      extraCharges: [
        { id: "p1", label: "Service", outcomes: ["reject_all"], base: "deal_value", fixedMinor: R(1_000), from: "payers", to: { type: "participant", id: "broker" } },
        { id: "p2", label: "Self", outcomes: ["release_all"], base: "deal_value", fixedMinor: R(1_000), from: "payee", to: { type: "payee" } },
      ],
    });
    const a = computeOutcome(s, { kind: "reject_all" });
    expect(amountTo(a.lines, "broker")).toBe(R(1_000));
    expect(amountTo(a.lines, "buyer")).toBe(R(1_839_000));
    expect(amountTo(computeOutcome(s, { kind: "release_all", daysLate: 0 }).lines, "seller")).toBe(R(1_840_000));
  });
});

describe("charge edge cases", () => {
  const custom = (over: Record<string, unknown>) =>
    makeSchedule({ extraCharges: [{ id: "c", label: "Custom", outcomes: ["partial", "refund_full"], base: "deal_value", from: "payee", to: { type: "payers" }, fixedMinor: R(100), ...over }] });

  it("a charge on an empty pool is waived, not invented", () => {
    const r = computeOutcome(custom({}), { kind: "refund_full", reason: "no_ship" });
    expect(amountTo(r.lines, "buyer")).toBe(R(1_840_000));
    expect(r.waivedMinor).toBe(R(100));
  });
  it("rejected_value is a usable base", () => {
    const r = computeOutcome(custom({ base: "rejected_value", fixedMinor: 0n, bps: 100 }), { kind: "partial", acceptedUnits: 38, daysLate: 0 });
    expect(amountTo(r.lines, "buyer", "charge")).toBe(R(920)); // 1% of 2 x 46,000
  });
  it("a fixed commission of zero yields no lines at all", () => {
    const s = makeSchedule({ commission: { ...commissionFixtureA(), amount: { type: "fixed", minor: 0n } } });
    expect(computeOutcome(s, { kind: "release_all", daysLate: 0 }).lines.map((l) => l.kind)).toEqual(["release"]);
  });
  it("commission naming a participant who does not exist is treated as a payee-side share, never a deposit", () => {
    const s = makeSchedule({ commission: { ...commissionFixtureA(), payers: [{ participantId: "ghost", shareBps: 10_000 }] } });
    expect(computeCommission(s).shares[0]?.deposits).toBe(false);
  });
  it("a payer who is not a commission payer deposits deal value only", () => {
    const s = makeSchedule({ participants: [buyer(5000, "b1"), buyer(5000, "b2"), sellerP()], commission: { ...commissionFixtureA(), payers: [{ participantId: "b1", shareBps: 10_000 }] } });
    expect(computeDeposits(s).deposits.map((d) => d.feeMinor)).toEqual([R(9_200), 0n]);
  });
});

describe("co-buyers", () => {
  const two = (a: number, b: number) => [buyer(a, "b1"), buyer(b, "b2"), sellerP()];
  it("refunds and late deductions go pro-rata; leftover paise go to the rounding beneficiary", () => {
    const s = makeSchedule({ participants: [buyer(3333, "b1"), buyer(3333, "b2"), buyer(3334, "b3"), sellerP()], terms: termsWithLateDeduction(), units: 3, price: 101n });
    const r = computeOutcome(s, { kind: "partial", acceptedUnits: 1, daysLate: 1 });
    expect(r.lines.reduce((a, l) => a + l.amountMinor, 0n)).toBe(r.totalDepositsMinor);
    expect(r.lines.some((l) => l.kind === "rounding" && l.to === "seller")).toBe(true);
  });
  it("deposit shares split the deal value and the fee share", () => {
    const s = makeSchedule({ participants: two(7000, 3000), commission: { ...commissionFixtureA(), payers: [{ participantId: "b1", shareBps: 7000 }, { participantId: "b2", shareBps: 3000 }] } });
    const d = computeDeposits(s);
    expect(d.deposits.map((x) => x.dealMinor)).toEqual([R(1_288_000), R(552_000)]);
    expect(d.deposits.map((x) => x.feeMinor)).toEqual([R(6_440), R(2_760)]);
    const r = computeOutcome(s, { kind: "refund_full", reason: "lost" });
    expect(amountTo(r.lines, "b1")).toBe(R(1_294_440));
  });
});

describe("input validation", () => {
  const s = makeSchedule();
  it("rejects impossible unit counts", () => {
    expect(() => computeOutcome(s, { kind: "partial", acceptedUnits: 0, daysLate: 0 })).toThrow(WaterfallError);
    expect(() => computeOutcome(s, { kind: "partial", acceptedUnits: 40, daysLate: 0 })).toThrow(WaterfallError);
    expect(() => computeOutcome(s, { kind: "dispute", acceptedUnits: 0, heldUnits: 0, daysLate: 0 })).toThrow(WaterfallError);
    expect(() => computeOutcome(s, { kind: "dispute", acceptedUnits: -1, heldUnits: 1, daysLate: 0 })).toThrow(WaterfallError);
    expect(() => computeOutcome(s, { kind: "dispute", acceptedUnits: 39, heldUnits: 2, daysLate: 0 })).toThrow(WaterfallError);
    expect(() => computeOutcome(s, { kind: "release_all", daysLate: -1 })).toThrow(WaterfallError);
    expect(() => computeOutcome(s, { kind: "release_all", daysLate: 1.5 })).toThrow(WaterfallError);
  });
  it("a deal value that disagrees with units x price cannot produce a payout (validator also blocks signing)", () => {
    const bad = { ...s, deal: { ...s.deal, valueMinor: s.deal.valueMinor - 1n } };
    expect(() => computeOutcome(bad, { kind: "release_all", daysLate: 0 })).toThrow();
  });
  it("needs exactly one payee", () => {
    expect(() => computeOutcome(makeSchedule({ participants: [buyer(), sellerP(), { ...sellerP(), id: "s2" }] }), { kind: "release_all", daysLate: 0 })).toThrow();
  });
});

describe("defaults", () => {
  it("noCommission() plus default terms is inert", () => {
    expect(noCommission().amount.type).toBe("none");
    expect(defaultTerms().ldBpsPerDay).toMatchObject({ status: "set", value: 0 });
  });
});
