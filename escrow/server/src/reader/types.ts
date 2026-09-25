// Reader types (specs 04 A, 12 Flow A step 2). Deterministic rule-based extraction today; the
// same shapes are what an LLM-backed extractor (Azure OpenAI / Foundry, enabled by env vars per
// specs/05) would plug in later, one extractor at a time, behind this module.
import type { TermKey } from "../domain/params.js";

/** Deal-level facts the reader also extracts, alongside the Terms placeholders. */
export type DealFieldKey = "unitCount" | "unitPriceMinor" | "valueMinor" | "buyerName" | "sellerName";
export type FieldKey = TermKey | DealFieldKey;

export interface ExtractedField {
  value: unknown;
  /** Clause reference, e.g. "§3.1". No page number for plain text; PDFs add one at the upload layer (milestone 4). */
  clauseRef: string;
  /** Verbatim quote from the source text this value was read from. */
  quote: string;
}

/** One independent extraction pass over the source text. */
export type ReaderResult = Partial<Record<FieldKey, ExtractedField>>;

export interface Reader {
  /** A short id for this extraction strategy, shown in reconciliation output (never to end users as a "model name"). */
  id: string;
  read(text: string): ReaderResult;
}

export type ConfidenceBand = "green" | "amber" | "red";

export interface ReconciledField {
  key: FieldKey;
  band: ConfidenceBand;
  value: unknown;
  /** Per-reader readings that contributed, so a red (disagreement) field can show both. */
  readings: { readerId: string; value: unknown; clauseRef: string; quote: string; citationVerified: boolean }[];
  /** Why this field landed in this band, for the review UI (spec 04: "disagreement", "citation fails", etc). */
  reason: string;
}
