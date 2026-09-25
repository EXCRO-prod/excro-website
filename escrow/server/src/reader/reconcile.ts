// Reconcile two independent readers into one confidence-banded result per field (spec 04 A.4 and
// the confidence table, spec 04 A / master prompt §4.2):
//   green  — both readers agree, and every contributing citation verifies
//   amber  — only one reader found the field, and its citation verifies
//   red    — the readers disagree, or a citation fails to verify
// A field neither reader found is simply absent (it becomes a gap, not a red field).
import { verifyCitation } from "./citation.js";
import type { ConfidenceBand, FieldKey, Reader, ReaderResult, ReconciledField } from "./types.js";

function valuesEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "bigint" || typeof b === "bigint") return BigInt(a as bigint | number) === BigInt(b as bigint | number);
  return a === b;
}

export function reconcile(readers: readonly Reader[], results: readonly ReaderResult[], sourceText: string): ReconciledField[] {
  const keys = new Set<FieldKey>();
  for (const r of results) for (const k of Object.keys(r)) keys.add(k as FieldKey);

  const out: ReconciledField[] = [];
  for (const key of keys) {
    const readings = results.flatMap((r, idx) => {
      const f = r[key];
      if (!f) return [];
      return [{ readerId: readers[idx]!.id, value: f.value, clauseRef: f.clauseRef, quote: f.quote, citationVerified: verifyCitation(f.quote, sourceText) }];
    });

    const anyCitationFails = readings.some((r) => !r.citationVerified);
    let band: ConfidenceBand;
    let reason: string;
    let value: unknown;

    if (anyCitationFails) {
      band = "red";
      reason = "a citation could not be verified against the source text";
      value = readings[0]?.value;
    } else if (readings.length >= 2) {
      const allAgree = readings.every((r) => valuesEqual(r.value, readings[0]!.value));
      if (allAgree) {
        band = "green";
        reason = "both readers agree and the citation is verified";
        value = readings[0]!.value;
      } else {
        band = "red";
        reason = "the readers disagree";
        value = readings[0]!.value;
      }
    } else {
      band = "amber";
      reason = "only one reader found this field";
      value = readings[0]!.value;
    }

    out.push({ key, band, value, readings, reason });
  }
  return out;
}
