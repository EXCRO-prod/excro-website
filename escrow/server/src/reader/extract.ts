// Top-level extraction pipeline (spec 04 A): run both readers, reconcile into confidence bands,
// apply the units x price cross-check, then project the result into a Terms object (domain/params.ts)
// and the deal-level facts (unit count/price/value, party names) that aren't schedule placeholders.
import { defaultTerms, termsSchema, withTerm, type TermKey, type Terms } from "../domain/params.js";
import { reconcile } from "./reconcile.js";
import { readerA } from "./readerA.js";
import { readerB } from "./readerB.js";
import type { DealFieldKey, FieldKey, ReconciledField } from "./types.js";

const READERS = [readerA, readerB];
const isTermKey = (k: FieldKey): k is TermKey => k in termsSchema.shape;

export interface DealFacts {
  unitCount?: number;
  unitPriceMinor?: bigint;
  valueMinor?: bigint;
  buyerName?: string;
  sellerName?: string;
}

export interface ExtractionResult {
  /** Every field either reader found, confidence-banded. What the review UI iterates over. */
  fields: ReconciledField[];
  /** Terms built from green/amber fields only — red fields are excluded, same as "blocks signing" (spec 04). */
  terms: Terms;
  dealFacts: DealFacts;
}

function fieldByKey(fields: ReconciledField[], key: FieldKey): ReconciledField | undefined {
  return fields.find((f) => f.key === key);
}

/** "units x price != total" (master prompt §4.2): a red condition in its own right, independent of reader agreement. */
function applyUnitsTimesPriceCheck(fields: ReconciledField[]): void {
  const units = fieldByKey(fields, "unitCount");
  const price = fieldByKey(fields, "unitPriceMinor");
  const total = fieldByKey(fields, "valueMinor");
  if (!units || !price || !total) return;
  const computed = BigInt(units.value as number) * BigInt(price.value as bigint);
  if (computed !== BigInt(total.value as bigint)) {
    for (const f of [units, price, total]) {
      f.band = "red";
      f.reason = "units x unit price does not equal the stated total";
    }
  }
}

export function extractAgreement(text: string): ExtractionResult {
  const results = READERS.map((r) => r.read(text));
  const fields = reconcile(READERS, results, text);
  applyUnitsTimesPriceCheck(fields);

  let terms = defaultTerms();
  const dealFacts: DealFacts = {};

  for (const f of fields) {
    if (f.band === "red") continue; // red fields never reach Terms — they block signing until a human resolves them
    const cite = f.readings.find((r) => r.readerId === readerA.id)?.clauseRef ?? f.readings[0]!.clauseRef;
    if (isTermKey(f.key)) {
      terms = withTerm(terms, f.key, f.value as never, "agreement", cite);
    } else {
      (dealFacts as Record<DealFieldKey, unknown>)[f.key] = f.value;
    }
  }
  return { fields, terms, dealFacts };
}
