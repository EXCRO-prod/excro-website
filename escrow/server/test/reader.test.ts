import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { termValue } from "../src/domain/params.js";
import { verifyCitation } from "../src/reader/citation.js";
import { extractAgreement } from "../src/reader/extract.js";
import { readerA } from "../src/reader/readerA.js";
import { readerB } from "../src/reader/readerB.js";
import { reconcile } from "../src/reader/reconcile.js";

const SAMPLE = readFileSync(join(import.meta.dirname, "../samples/supply-agreement-nirmal-kavya.txt"), "utf8");

describe("citation verifier", () => {
  it("passes a verbatim substring and a whitespace-normalised near-match", () => {
    expect(verifyCitation("40 units of", SAMPLE)).toBe(true);
    expect(verifyCitation("40   units\nof", SAMPLE)).toBe(true); // whitespace differences only
  });
  it("fails a quote that isn't in the text, and an empty quote", () => {
    expect(verifyCitation("500 units of", SAMPLE)).toBe(false);
    expect(verifyCitation("", SAMPLE)).toBe(false);
  });
});

describe("readers on the sample agreement (each independently)", () => {
  it("reader A (clause-structured) finds every Phase-1 field with a correct citation", () => {
    const r = readerA.read(SAMPLE);
    expect(r.unitCount?.value).toBe(40);
    expect(r.unitPriceMinor?.value).toBe(4_600_000n);
    expect(r.valueMinor?.value).toBe(184_000_000n);
    expect(r.fundingDays?.value).toBe(3);
    expect(r.dispatchDays?.value).toBe(5);
    expect(r.deliveryPincode?.value).toBe("141003");
    expect(r.sellerPincode?.value).toBe("560058");
    expect(r.consigneeName?.value).toBe("Nirmal Traders");
    expect(r.promisedDeliveryDate?.value).toBe("2026-09-30");
    expect(r.inspectionDays?.value).toBe(3);
    expect(r.ldBpsPerDay?.value).toBe(50);
    expect(r.disputeSeat?.value).toBe("Bengaluru");
    expect(r.buyerName?.value).toBe("Nirmal Traders");
    expect(r.sellerName?.value).toBe("Kavya Electronics Private Limited");
    // Every citation is a real substring of the source (the point of the verifier).
    for (const f of Object.values(r)) expect(verifyCitation(f!.quote, SAMPLE)).toBe(true);
  });

  it("reader B (whole-document scan) independently finds the same facts via different patterns", () => {
    const r = readerB.read(SAMPLE);
    expect(r.unitCount?.value).toBe(40);
    expect(r.unitPriceMinor?.value).toBe(4_600_000n);
    expect(r.valueMinor?.value).toBe(184_000_000n);
    expect(r.fundingDays?.value).toBe(3);
    expect(r.dispatchDays?.value).toBe(5);
    expect(r.deliveryPincode?.value).toBe("141003");
    expect(r.sellerPincode?.value).toBe("560058");
    expect(r.consigneeName?.value).toBe("Nirmal Traders");
    expect(r.promisedDeliveryDate?.value).toBe("2026-09-30");
    expect(r.inspectionDays?.value).toBe(3);
    expect(r.ldBpsPerDay?.value).toBe(50);
    expect(r.disputeSeat?.value).toBe("Bengaluru");
    // Never mistakes clause 7.1's "within 30 days of invoice" for fundingDays/dispatchDays/inspectionDays.
    expect(r.fundingDays?.value).not.toBe(30);
  });

  it("neither reader mistakes the clause 7.1 conflict for a real deadline", () => {
    const a = readerA.read(SAMPLE);
    const b = readerB.read(SAMPLE);
    for (const key of ["fundingDays", "dispatchDays", "inspectionDays"] as const) {
      expect(a[key]?.value).not.toBe(30);
      expect(b[key]?.value).not.toBe(30);
    }
  });
});

describe("reconciliation and confidence bands", () => {
  it("a clean agreement reads green on every field both readers found", () => {
    const { fields } = extractAgreement(SAMPLE);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    for (const key of ["unitCount", "unitPriceMinor", "valueMinor", "fundingDays", "dispatchDays", "deliveryPincode", "sellerPincode", "inspectionDays", "ldBpsPerDay", "disputeSeat", "consigneeName", "promisedDeliveryDate"]) {
      expect(byKey[key]?.band, `${key} should be green`).toBe("green");
    }
  });

  it("amber: a field only one reader finds", () => {
    const results = [{ fundingDays: { value: 3, clauseRef: "§3.1", quote: "3 days" } }, {}];
    const fields = reconcile([readerA, readerB], results, "text containing 3 days somewhere");
    expect(fields[0]!.band).toBe("amber");
    expect(fields[0]!.readings).toHaveLength(1);
  });

  it("red: the two readers disagree", () => {
    const results = [
      { fundingDays: { value: 3, clauseRef: "§3.1", quote: "within 3 days" } },
      { fundingDays: { value: 5, clauseRef: "text scan", quote: "within 5 days" } },
    ];
    const fields = reconcile([readerA, readerB], results, "within 3 days ... within 5 days");
    expect(fields[0]!.band).toBe("red");
    expect(fields[0]!.reason).toMatch(/disagree/);
    expect(fields[0]!.readings).toHaveLength(2);
  });

  it("red: a citation that does not verify, even with reader agreement", () => {
    const results = [
      { fundingDays: { value: 3, clauseRef: "§3.1", quote: "within 3 days" } },
      { fundingDays: { value: 3, clauseRef: "text scan", quote: "within 3 days" } },
    ];
    // Source text does not actually contain the quoted phrase.
    const fields = reconcile([readerA, readerB], results, "a completely unrelated sentence");
    expect(fields[0]!.band).toBe("red");
    expect(fields[0]!.reason).toMatch(/citation/);
  });

  it("units x price != total forces all three fields red, even though each individually would be green", () => {
    const bad = SAMPLE.replace("Rs. 18,40,000/-", "Rs. 99,00,000/-").replace("(Rupees Eighteen Lakh Forty Thousand only)", "(Rupees Ninety Nine Lakh only)");
    const { fields, terms } = extractAgreement(bad);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.unitCount?.band).toBe("red");
    expect(byKey.unitPriceMinor?.band).toBe("red");
    expect(byKey.valueMinor?.band).toBe("red");
    // Red fields never reach Terms.
    expect(termValue(terms, "fundingDays")).toBe(3); // unaffected fields still populate
  });
});

describe("extractAgreement builds Terms and deal facts, excluding red fields", () => {
  it("populates every extractable Terms placeholder from the clean sample", () => {
    const { terms, dealFacts } = extractAgreement(SAMPLE);
    expect(termValue(terms, "fundingDays")).toBe(3);
    expect(termValue(terms, "dispatchDays")).toBe(5);
    expect(termValue(terms, "sellerPincode")).toBe("560058");
    expect(termValue(terms, "deliveryPincode")).toBe("141003");
    expect(termValue(terms, "consigneeName")).toBe("Nirmal Traders");
    expect(termValue(terms, "promisedDeliveryDate")).toBe("2026-09-30");
    expect(termValue(terms, "inspectionDays")).toBe(3);
    expect(termValue(terms, "ldBpsPerDay")).toBe(50);
    expect(termValue(terms, "disputeSeat")).toBe("Bengaluru");
    expect(dealFacts.unitCount).toBe(40);
    expect(dealFacts.unitPriceMinor).toBe(4_600_000n);
    expect(dealFacts.valueMinor).toBe(184_000_000n);
    expect(dealFacts.buyerName).toBe("Nirmal Traders");
    expect(dealFacts.sellerName).toBe("Kavya Electronics Private Limited");
    // Terms the agreement never states stay unset — never a silent invented default.
    expect(terms.silenceRule.status).toBe("unset");
    expect(terms.ldCapBps.status).toBe("unset");
  });
});
