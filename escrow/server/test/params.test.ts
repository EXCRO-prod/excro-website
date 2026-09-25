import { describe, expect, it } from "vitest";
import { defaultTerms, openMandatoryGaps, PARAMS, termsSchema, termValue, unsetRequired, withTerm } from "../src/domain/params.js";
import { completeTerms } from "./fixtures.js";

describe("placeholder registry", () => {
  it("covers every term exactly once", () => {
    const keys = PARAMS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.sort()).toEqual(Object.keys(termsSchema.shape).sort());
  });

  it("ships no business numbers: optional charges are set to zero, everything agreement-driven is unset", () => {
    const t = defaultTerms();
    expect(termValue(t, "ldBpsPerDay")).toBe(0);
    expect(termValue(t, "dispatchExtensionDays")).toBe(0);
    expect(termValue(t, "maxExtensions")).toBe(0);
    for (const k of ["silenceRule", "noShipRule", "lostInTransitRule", "buyerCancelFeeBps", "returnDays", "deliveryLongStopDays", "inspectionDays", "fundingDays", "dispatchDays"] as const) {
      expect(t[k].status).toBe("unset");
    }
    // The only non-zero starting value is Excro's own platform safety control, and it is labelled as such.
    const nonZero = PARAMS.filter((p) => p.inertDefault && p.inertDefault.value !== 0);
    expect(nonZero.map((p) => [p.key, p.inertDefault?.source])).toEqual([["objectionWindowHours", "platform_policy"]]);
  });

  it("a blank deal has the six unconditional mandatory gaps", () => {
    expect(openMandatoryGaps(defaultTerms()).sort()).toEqual(
      ["buyer_cancellation", "delivery_long_stop", "lost_in_transit", "no_ship_rule", "returns", "silence_rule"],
    );
  });

  it("a late-delivery rate with no cap opens the cap gap (the 7th gap of the sample agreement)", () => {
    const t = withTerm(defaultTerms(), "ldBpsPerDay", 50);
    expect(openMandatoryGaps(t)).toContain("late_deduction_cap");
    expect(openMandatoryGaps(withTerm(t, "ldCapBps", 500))).not.toContain("late_deduction_cap");
  });

  it("reship days are only required when the lost-in-transit rule is reship_or_refund", () => {
    const refundOnly = withTerm(completeTerms(), "lostInTransitRule", "refund");
    const cleared = { ...refundOnly, reshipDays: { status: "unset" as const } };
    expect(unsetRequired(cleared).map((u) => u.key)).not.toContain("reshipDays");
    const reship = { ...completeTerms(), reshipDays: { status: "unset" as const } };
    expect(unsetRequired(reship).map((u) => u.key)).toContain("reshipDays");
  });

  it("the cap gap ignores an unset late rate", () => {
    const t = { ...defaultTerms(), ldBpsPerDay: { status: "unset" as const } };
    expect(openMandatoryGaps(t)).not.toContain("late_deduction_cap");
  });

  it("an explicit zero counts as an answer; only unset blocks", () => {
    const t = withTerm(defaultTerms(), "buyerCancelFeeBps", 0);
    expect(openMandatoryGaps(t)).not.toContain("buyer_cancellation");
  });

  it("withTerm records source and citation", () => {
    const t = withTerm(defaultTerms(), "inspectionDays", 3, "agreement", "§5.1 p4");
    expect(t.inspectionDays).toEqual({ status: "set", value: 3, source: "agreement", cite: "§5.1 p4" });
  });

  it("rejects values outside the type (bps above 100%)", () => {
    expect(termsSchema.safeParse({ ...defaultTerms(), ldBpsPerDay: { status: "set", value: 10_001, source: "agreement" } }).success).toBe(false);
  });
});
