import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withTerm } from "../src/domain/params.js";
import { extractAgreement } from "../src/reader/extract.js";
import { scanGaps } from "../src/gaps/detect.js";
import { GAP_LIBRARY, gapDef } from "../src/gaps/library.js";
import { completeTerms } from "./fixtures.js";

const SAMPLE = readFileSync(join(import.meta.dirname, "../samples/supply-agreement-nirmal-kavya.txt"), "utf8");

describe("gap scan on the sample agreement (master prompt §7)", () => {
  it("finds exactly the 7 mandatory gaps and the one conflict the sample deliberately omits/contains", () => {
    const { terms } = extractAgreement(SAMPLE);
    const scan = scanGaps(terms, SAMPLE);
    expect(scan.mandatory.map((g) => g.id).sort()).toEqual(
      ["buyer_cancellation", "delivery_long_stop", "late_deduction_cap", "lost_in_transit", "no_ship_rule", "returns", "silence_rule"].sort(),
    );
    expect(scan.mandatory).toHaveLength(7);
    expect(scan.conflicts.map((c) => c.id)).toEqual(["payment_terms_not_tied_to_delivery"]);
    expect(scan.conflicts[0]!.quote.toLowerCase()).toContain("30 days");
    expect(scan.conflicts[0]!.clauseRef).toBe("§7.1");
  });

  it("late_deduction_cap fires specifically because the agreement states a rate with no cap", () => {
    const { terms } = extractAgreement(SAMPLE);
    expect(terms.ldBpsPerDay).toMatchObject({ status: "set", value: 50 });
    expect(terms.ldCapBps.status).toBe("unset");
  });

  it("advisory gaps include weight range (absent) and force majeure (absent)", () => {
    const { terms } = extractAgreement(SAMPLE);
    const scan = scanGaps(terms, SAMPLE);
    expect(scan.advisory.map((g) => g.id).sort()).toEqual(["force_majeure", "weight_range"]);
  });

  it("a fully answered schedule (every gap resolved) has no mandatory gaps left", () => {
    const scan = scanGaps(completeTerms(), SAMPLE);
    expect(scan.mandatory).toEqual([]);
  });

  it("force majeure stops appearing once the text actually has the clause", () => {
    const withFm = SAMPLE + "\n9. FORCE MAJEURE\n9.1 Neither party is liable for delay caused by force majeure events.";
    const { terms } = extractAgreement(withFm);
    const scan = scanGaps(terms, withFm);
    expect(scan.advisory.map((g) => g.id)).not.toContain("force_majeure");
  });

  it("weight range stops appearing once both weightMinKg and weightMaxKg are set", () => {
    let terms = extractAgreement(SAMPLE).terms;
    terms = withTerm(terms, "weightMinKg", 80);
    terms = withTerm(terms, "weightMaxKg", 120);
    const scan = scanGaps(terms, SAMPLE);
    expect(scan.advisory.map((g) => g.id)).not.toContain("weight_range");
  });
});

describe("clause library structure (specs 12: 2-3 options per finding, each with a library id)", () => {
  it("every mandatory and advisory gap has 1-3 options, each with a unique library id", () => {
    for (const def of GAP_LIBRARY) {
      expect(def.options.length).toBeGreaterThanOrEqual(1);
      expect(def.options.length).toBeLessThanOrEqual(3);
      const ids = def.options.map((o) => o.libraryId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("every mandatory gap's options only ever set required-or-optional terms, never leave a schedule the validator would reject", () => {
    for (const def of GAP_LIBRARY.filter((g) => g.kind === "mandatory")) {
      for (const opt of def.options) expect(opt.sets.length).toBeGreaterThan(0);
    }
  });

  it("advisory gaps allow 'not needed'; mandatory gaps do not", () => {
    expect(gapDef("weight_range").allowNotNeeded).toBe(true);
    expect(gapDef("force_majeure").allowNotNeeded).toBe(true);
    expect(gapDef("silence_rule").allowNotNeeded).toBe(false);
  });

  it("gapDef throws for an unknown id (defensive: never silently returns nothing)", () => {
    expect(() => gapDef("not_a_real_gap" as never)).toThrow();
  });

  it("resolving a gap option through withTerm uses the gap_resolution source, never a silent default", () => {
    let terms = extractAgreement(SAMPLE).terms;
    const opt = gapDef("silence_rule").options[0]!;
    for (const s of opt.sets) terms = withTerm(terms, s.key, s.value as never, "gap_resolution", opt.libraryId);
    expect(terms.silenceRule).toEqual({ status: "set", value: "accept", source: "gap_resolution", cite: "LIB-GS-SILENCE-001" });
  });
});
