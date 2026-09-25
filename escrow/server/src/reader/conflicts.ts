// Conflict detection (spec 12 step 4, "conflicts with escrow mechanics"): pattern rules over the
// raw text that name a payment/dispute mechanism escrow can't follow. Structurally the same
// GapOption shape as the clause library, but a conflict's resolution is an acknowledgment
// (the addendum's precedence clause governs release), not a Terms change — Phase 1 doesn't model
// contract amendment, so `sets` is always empty here.
//
// Only the one rule the Phase 1 golden sample exercises ("...days of invoice") is populated;
// spec 12 also names instalments not summing to the price, a different bank/account named, and an
// unsupported dispute forum as conflict types — the same ConflictRule shape covers them, they're
// just not needed until a golden-set agreement exercises them.
import type { GapOption } from "../gaps/library.js";

export interface ConflictFinding {
  id: string;
  title: string;
  explanation: string;
  /** The matched text, for citation — same verbatim-quote discipline as extracted fields. */
  quote: string;
  clauseRef: string;
  options: GapOption[];
}

interface ConflictRule {
  id: string;
  pattern: RegExp;
  title: string;
  explanation: string;
  options: GapOption[];
}

const ACKNOWLEDGE_ADDENDUM_GOVERNS: GapOption = {
  libraryId: "LIB-GS-CONFLICT-ACK-001",
  label: "Confirmed: for release of the escrowed funds only, the Escrow Release Addendum's conditions govern — this clause is otherwise unaffected",
  sets: [],
};
const ESCALATE_FOR_LEGAL_REVIEW: GapOption = {
  libraryId: "LIB-GS-CONFLICT-ESCALATE-001",
  label: "Flag for the parties' own legal review before proceeding",
  sets: [],
};

const CONFLICT_RULES: ConflictRule[] = [
  {
    id: "payment_terms_not_tied_to_delivery",
    pattern: /(?:paid|payable)\s+within\s+\d+\s+days?\s+of\s+invoice/i,
    title: "Payment terms not tied to delivery or acceptance",
    explanation: "This clause ties payment to an invoice date, not to the escrow schedule's dispatch/delivery/inspection conditions. The escrow account only releases funds per the signed Release Schedule.",
    options: [ACKNOWLEDGE_ADDENDUM_GOVERNS, ESCALATE_FOR_LEGAL_REVIEW],
  },
];

function clauseRefNear(text: string, index: number): string {
  const before = text.slice(0, index);
  const m = [...before.matchAll(/^(\d+\.\d+)\s+/gm)].at(-1);
  return m ? `§${m[1]}` : "unreferenced";
}

export function detectConflicts(text: string): ConflictFinding[] {
  const out: ConflictFinding[] = [];
  for (const rule of CONFLICT_RULES) {
    const m = text.match(rule.pattern);
    if (!m) continue;
    out.push({ id: rule.id, title: rule.title, explanation: rule.explanation, quote: m[0], clauseRef: clauseRefNear(text, m.index!), options: rule.options });
  }
  return out;
}
