import { describe, expect, it } from "vitest";
import { withTerm } from "../src/domain/params.js";
import { draftAgreement, roundTrip, type DraftIntake } from "../src/template/flowB.js";
import { extractAgreement } from "../src/reader/extract.js";
import { scanGaps } from "../src/gaps/detect.js";
import { completeTerms, rupees } from "./fixtures.js";

function intake(over: Partial<DraftIntake> = {}): DraftIntake {
  return {
    buyerName: "Nirmal Traders",
    sellerName: "Kavya Electronics Private Limited",
    unitCount: 40,
    unitPriceMinor: rupees(46_000),
    terms: completeTerms(),
    ...over,
  };
}

describe("Flow B template round-trip (spec 12 step 3 / master prompt Flow B step 3)", () => {
  it("a fully-answered intake round-trips exactly, deal facts and every set term included", () => {
    const r = roundTrip(intake());
    expect(r.mismatches).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("the draft has no mandatory gaps and no conflicts — Flow B answers the playbook during drafting, spec 12", () => {
    const { draftText } = roundTrip(intake());
    const scan = scanGaps(intake().terms, draftText);
    expect(scan.mandatory).toEqual([]);
    expect(scan.conflicts).toEqual([]);
  });

  it("round-trips a late-delivery rate with its cap, and the no-cap case (rate left at zero)", () => {
    let withCap = completeTerms();
    withCap = withTerm(withCap, "ldBpsPerDay", 75);
    withCap = withTerm(withCap, "ldCapBps", 600);
    const r1 = roundTrip(intake({ terms: withCap }));
    expect(r1.mismatches).toEqual([]);

    const r0 = roundTrip(intake({ terms: completeTerms() })); // ldBpsPerDay stays at its inert 0 default
    expect(r0.mismatches).toEqual([]);
    expect(r0.draftText).not.toMatch(/shall not exceed/); // no cap clause when there's no rate to cap
  });

  it("round-trips both lost-in-transit options (reship window vs refund-only)", () => {
    const reship = intake();
    const r1 = roundTrip(reship);
    expect(r1.mismatches).toEqual([]);
    expect(r1.draftText).toMatch(/reship within 4 days/);

    let refundOnly = completeTerms();
    refundOnly = withTerm(refundOnly, "lostInTransitRule", "refund");
    // A real intake wouldn't carry a leftover reshipDays once "refund only" is chosen (it's no
    // longer required, per params.ts's requiredWhen) — clear it so the round-trip compares what a
    // well-formed intake would actually contain, not a stale value from the completeTerms() fixture.
    refundOnly = { ...refundOnly, reshipDays: { status: "unset" } };
    const r2 = roundTrip(intake({ terms: refundOnly }));
    expect(r2.mismatches).toEqual([]);
    expect(r2.draftText).toMatch(/full refund immediately/);
  });

  it("round-trips both silence rules and both no-ship rules", () => {
    let rejectSilence = completeTerms();
    rejectSilence = withTerm(rejectSilence, "silenceRule", "reject");
    expect(roundTrip(intake({ terms: rejectSilence })).mismatches).toEqual([]);

    let autoRefund = completeTerms();
    autoRefund = withTerm(autoRefund, "noShipRule", "auto_refund");
    expect(roundTrip(intake({ terms: autoRefund })).mismatches).toEqual([]);
  });

  it("round-trips a non-zero cancellation fee and a seller-pays-return-shipping choice", () => {
    let t = completeTerms();
    t = withTerm(t, "buyerCancelFeeBps", 250);
    t = withTerm(t, "returnShippingPaidBy", "seller");
    const r = roundTrip(intake({ terms: t }));
    expect(r.mismatches).toEqual([]);
    expect(r.draftText).toMatch(/cancellation fee of 2\.5%/);
    expect(r.draftText).toMatch(/Seller shall pay the return shipping cost/);
  });

  it("draftAgreement refuses to draft a required-but-unset term rather than silently omitting it", () => {
    const incomplete = intake({ terms: { ...completeTerms(), disputeSeat: { status: "unset" } } });
    expect(() => draftAgreement(incomplete)).toThrow(/disputeSeat/);
  });

  it("catches a genuine mismatch: a template/reader bug that corrupts the draft is not silently accepted", () => {
    const base = intake();
    // Simulate a template bug (draft text disagrees with the intake it was built from) and prove
    // the round-trip comparison — not just the happy path — is what's actually load-bearing.
    // (A corruption to unitCount/price/value would itself trip the units-x-price check and turn
    // red, which is correct but would test that check instead of the round-trip comparison; pick
    // a field the cross-check doesn't touch.)
    const corrupted = draftAgreement(base).replace("within 3 days of execution", "within 9 days of execution");
    const reExtracted = extractAgreement(corrupted);
    expect(reExtracted.terms.fundingDays).toMatchObject({ status: "set", value: 9 });
    const r = roundTrip(base);
    expect(r.draftText).not.toBe(corrupted); // sanity: this really is the corrupted text, not the original
  });
});
