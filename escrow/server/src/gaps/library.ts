// Clause library (spec 12 step 4: "each [finding] has 2-3 options from the clause library plus a
// plain-language explanation"). PLACEHOLDER numbers and wording throughout — pending Excro's
// lawyer-approved clause library (CLAUDE.md: never invent legal wording; this is structure and
// plain-language option labels, not drafted clause text for a signed document).
//
// Picking an option is not an engine default: nothing here is applied automatically. A term is
// only set once both parties pick the same option (spec 12 step 5) via `withTerm(..., "gap_resolution")`
// in domain/params.ts — the same "no fixed numbers" placeholder machinery the rest of the engine uses.
import type { GapId, TermKey } from "../domain/params.js";

export interface OptionSet {
  key: TermKey;
  value: unknown;
}

export interface GapOption {
  libraryId: string;
  label: string;
  sets: OptionSet[];
}

export interface GapDef {
  id: GapId | "force_majeure";
  kind: "mandatory" | "advisory";
  title: string;
  explanation: string;
  options: GapOption[];
  /** Advisory only (spec 12): both parties may instead mark this "not needed", with no term effect. */
  allowNotNeeded: boolean;
}

export const GAP_LIBRARY: readonly GapDef[] = [
  {
    id: "silence_rule", kind: "mandatory", allowNotNeeded: false,
    title: "No rule for buyer silence after delivery",
    explanation: "The agreement doesn't say what happens if the buyer doesn't respond after the inspection window.",
    options: [
      { libraryId: "LIB-GS-SILENCE-001", label: "Silence after the inspection window counts as acceptance", sets: [{ key: "silenceRule", value: "accept" }] },
      { libraryId: "LIB-GS-SILENCE-002", label: "Silence after the inspection window counts as rejection", sets: [{ key: "silenceRule", value: "reject" }] },
    ],
  },
  {
    id: "late_deduction_cap", kind: "mandatory", allowNotNeeded: false,
    title: "Late-delivery penalty has no cap",
    explanation: "An uncapped per-day penalty could exceed the deal value. Excro's engine will not sign a schedule with an uncapped daily deduction.",
    options: [
      { libraryId: "LIB-GS-LDCAP-001", label: "Cap the late-delivery deduction at 5% of the accepted value", sets: [{ key: "ldCapBps", value: 500 }] },
      { libraryId: "LIB-GS-LDCAP-002", label: "Cap the late-delivery deduction at 10% of the accepted value", sets: [{ key: "ldCapBps", value: 1000 }] },
    ],
  },
  {
    id: "no_ship_rule", kind: "mandatory", allowNotNeeded: false,
    title: "No refund rule if the seller never ships",
    explanation: "The agreement doesn't say what happens to the buyer's money if the seller never dispatches the goods.",
    options: [
      { libraryId: "LIB-GS-NOSHIP-001", label: "Buyer may cancel for a full refund if the seller misses the dispatch deadline", sets: [{ key: "noShipRule", value: "buyer_may_cancel" }] },
      { libraryId: "LIB-GS-NOSHIP-002", label: "Automatic full refund if the seller misses the dispatch deadline", sets: [{ key: "noShipRule", value: "auto_refund" }] },
    ],
  },
  {
    id: "lost_in_transit", kind: "mandatory", allowNotNeeded: false,
    title: "No rule if the goods are lost in transit",
    explanation: "The agreement doesn't say who bears the risk, or what happens, if the courier loses the shipment.",
    options: [
      { libraryId: "LIB-GS-TRANSIT-001", label: "Seller may reship within 7 days, or the buyer gets a full refund", sets: [{ key: "lostInTransitRule", value: "reship_or_refund" }, { key: "reshipDays", value: 7 }] },
      { libraryId: "LIB-GS-TRANSIT-002", label: "Buyer gets a full refund immediately", sets: [{ key: "lostInTransitRule", value: "refund" }] },
    ],
  },
  {
    id: "delivery_long_stop", kind: "mandatory", allowNotNeeded: false,
    title: "No delivery long-stop date",
    explanation: "Without a long-stop, the deal could stay open indefinitely if delivery never happens.",
    options: [
      { libraryId: "LIB-GS-LONGSTOP-001", label: "Refund in full if not delivered within 10 days of the promised date", sets: [{ key: "deliveryLongStopDays", value: 10 }] },
      { libraryId: "LIB-GS-LONGSTOP-002", label: "Refund in full if not delivered within 30 days of the promised date", sets: [{ key: "deliveryLongStopDays", value: 30 }] },
    ],
  },
  {
    id: "returns", kind: "mandatory", allowNotNeeded: false,
    title: "No returns process for rejected goods",
    explanation: "The agreement doesn't say how long the buyer has to return rejected goods, or who pays return shipping.",
    options: [
      { libraryId: "LIB-GS-RETURNS-001", label: "Buyer returns rejected goods within 5 days; buyer pays return shipping", sets: [{ key: "returnDays", value: 5 }, { key: "returnShippingPaidBy", value: "buyer" }] },
      { libraryId: "LIB-GS-RETURNS-002", label: "Buyer returns rejected goods within 7 days; seller pays return shipping", sets: [{ key: "returnDays", value: 7 }, { key: "returnShippingPaidBy", value: "seller" }] },
    ],
  },
  {
    id: "buyer_cancellation", kind: "mandatory", allowNotNeeded: false,
    title: "No buyer cancellation rule",
    explanation: "The agreement doesn't say what happens if the buyer cancels after funding but before dispatch.",
    options: [
      { libraryId: "LIB-GS-CANCEL-001", label: "No cancellation fee", sets: [{ key: "buyerCancelFeeBps", value: 0 }] },
      { libraryId: "LIB-GS-CANCEL-002", label: "2% cancellation fee to the seller", sets: [{ key: "buyerCancelFeeBps", value: 200 }] },
      { libraryId: "LIB-GS-CANCEL-003", label: "5% cancellation fee to the seller", sets: [{ key: "buyerCancelFeeBps", value: 500 }] },
    ],
  },
  {
    id: "weight_range", kind: "advisory", allowNotNeeded: true,
    title: "No expected weight range for the shipment",
    explanation: "A weight range helps catch a mis-declared or substituted shipment at the dispatch check. Not required to sign.",
    options: [
      { libraryId: "LIB-GS-WEIGHT-001", label: "80–120 kg", sets: [{ key: "weightMinKg", value: 80 }, { key: "weightMaxKg", value: 120 }] },
    ],
  },
  {
    id: "force_majeure", kind: "advisory", allowNotNeeded: true,
    title: "No force-majeure clause",
    explanation: "Not required to sign. Phase 1 does not implement force majeure as an outcome — choosing this only records the parties' intent for the addendum text, pending Excro's lawyer-approved wording.",
    options: [
      { libraryId: "LIB-GS-FM-001", label: "Add a standard force-majeure clause (mutual cancellation; refund less documented costs, by mutual agreement)", sets: [] },
    ],
  },
];

export function gapDef(id: GapId | "force_majeure"): GapDef {
  const d = GAP_LIBRARY.find((g) => g.id === id);
  if (!d) throw new Error(`no gap library entry for ${id}`);
  return d;
}
