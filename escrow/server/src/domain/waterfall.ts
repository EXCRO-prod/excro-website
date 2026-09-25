// Deterministic waterfall (spec 03). Pure function: schedule + outcome inputs -> payout lines.
// No I/O, no clock, no randomness, no LLM. Same inputs always give the same lines.
//
// Every business number comes from the signed schedule. With all placeholders at zero the
// result is the plain outcome: seller gets the release, buyers get refunds, no other lines.
import { floorSplit, min, sum, type Minor } from "./money.js";
import { computeCommission, computeDeposits } from "./commission.js";
import { allCharges, chargeAmount, depositors, seller, type OutcomeKind, type ReleaseSchedule } from "./schedule.js";

export type OutcomeInput =
  | { kind: "release_all"; daysLate: number }
  | { kind: "partial"; acceptedUnits: number; daysLate: number }
  | { kind: "dispute"; acceptedUnits: number; heldUnits: number; daysLate: number }
  | { kind: "reject_all" }
  | { kind: "refund_full"; reason: string }
  | { kind: "buyer_cancel" };

export const EXCRO = "excro";
export const HELD = "held";

export type LineKind = "release" | "refund" | "charge" | "commission" | "fee_refund" | "rounding" | "held";

export interface PayoutLine {
  kind: LineKind;
  /** Participant id, `excro` (Excro's named fee account) or `held` (stays in escrow). */
  to: string;
  amountMinor: Minor;
  note: string;
  /** Commission collected at funding has already left escrow before the outcome. */
  withdrawnAtFunding?: boolean;
}

export interface OutcomeResult {
  input: OutcomeInput;
  totalDepositsMinor: Minor;
  lines: PayoutLine[];
  /** Charges/commission shares that exceeded what the payer had available (spec 14 rule 5). */
  waivedMinor: Minor;
  /** Commission collected outside escrow: invoiced, never deducted (spec 14 rule 6). */
  outsideEscrowInvoices: { participantId: string; amountMinor: Minor }[];
}

export class WaterfallError extends Error {}
/** Thrown when lines do not sum to deposits. Orchestrator halts and pages on-call (spec 03). */
export class WaterfallImbalance extends WaterfallError {}

const SUCCESS: readonly OutcomeKind[] = ["release_all", "partial", "dispute"];

export function computeOutcome(s: ReleaseSchedule, input: OutcomeInput): OutcomeResult {
  const n = s.deal.unitCount;
  const price = s.deal.unitPriceMinor;
  const V = s.deal.valueMinor;
  const success = SUCCESS.includes(input.kind);

  let accepted = 0;
  let held = 0;
  let daysLate = 0;
  if (input.kind === "release_all") {
    accepted = n;
    daysLate = input.daysLate;
  } else if (input.kind === "partial") {
    if (input.acceptedUnits < 1 || input.acceptedUnits > n - 1) throw new WaterfallError("partial needs 1..n-1 accepted units");
    accepted = input.acceptedUnits;
    daysLate = input.daysLate;
  } else if (input.kind === "dispute") {
    if (input.acceptedUnits < 0 || input.heldUnits < 1 || input.acceptedUnits + input.heldUnits > n) throw new WaterfallError("dispute needs at least 1 held unit and no more than n units in total");
    accepted = input.acceptedUnits;
    held = input.heldUnits;
    daysLate = input.daysLate;
  }
  if (daysLate < 0 || !Number.isInteger(daysLate)) throw new WaterfallError("daysLate must be a non-negative integer");

  const acceptedValue = BigInt(accepted) * price;
  const heldValue = BigInt(held) * price;
  const rejectedValue = BigInt(n - accepted) * price;

  const { totalMinor: totalDeposits } = computeDeposits(s);
  const commission = computeCommission(s);
  const payers = depositors(s);
  const payee = seller(s);
  const shareBps = payers.map((p) => p.depositShareBps);

  let payeePool: Minor = success ? acceptedValue : 0n;
  let refundPool: Minor = V - (success ? acceptedValue : 0n) - heldValue;
  let waived = 0n;
  let roundingTotal = 0n;
  const lines: PayoutLine[] = [];
  const toPayers: { label: string; amount: Minor }[] = [];

  const applyCharge = (ch: ReturnType<typeof allCharges>[number], base: Minor) => {
    const wanted = chargeAmount(ch, base, daysLate);
    if (wanted === 0n) return;
    const available = ch.from === "payee" ? payeePool : refundPool;
    const taken = min(wanted, available);
    waived += wanted - taken;
    if (taken === 0n) return;
    if (ch.from === "payee") payeePool -= taken;
    else refundPool -= taken;
    if (ch.to.type === "payers") toPayers.push({ label: ch.label, amount: taken });
    else if (ch.to.type === "payee") payeePool += taken;
    else lines.push({ kind: "charge", to: ch.to.id, amountMinor: taken, note: ch.label });
  };

  const baseOf = (ch: ReturnType<typeof allCharges>[number]): Minor =>
    ch.base === "deal_value" ? V : ch.base === "accepted_value" ? acceptedValue : ch.base === "rejected_value" ? rejectedValue : payeePool;

  const charges = allCharges(s).filter((c) => c.outcomes.includes(input.kind));
  // Deductions first, commission next, payee-release percentages (e.g. broker) last: each sees the net before it.
  for (const ch of charges.filter((c) => c.base !== "payee_release")) applyCharge(ch, baseOf(ch));

  // ---- commission (spec 14) ----
  const invoices: OutcomeResult["outsideEscrowInvoices"] = [];
  let excroAtFunding = 0n;
  let excroAtOutcome = 0n;
  if (s.commission.collect === "outside_escrow") {
    for (const sh of commission.shares) if (sh.amountMinor > 0n) invoices.push({ participantId: sh.participantId, amountMinor: sh.amountMinor });
  } else {
    const plan = s.commission;
    for (const sh of commission.shares) {
      if (sh.amountMinor === 0n) continue;
      if (sh.deposits) {
        if (plan.collect === "at_funding") excroAtFunding += sh.amountMinor;
        else if (success || plan.onFailure === "non_refundable") excroAtOutcome += sh.amountMinor;
        else if (plan.onFailure === "refundable") lines.push({ kind: "fee_refund", to: sh.participantId, amountMinor: sh.amountMinor, note: "Commission refunded (deal did not complete)" });
        else {
          const kept = min(sh.amountMinor, (plan.nonRefundableFixedMinor * sh.amountMinor) / commission.totalMinor);
          excroAtOutcome += kept;
          if (sh.amountMinor - kept > 0n) lines.push({ kind: "fee_refund", to: sh.participantId, amountMinor: sh.amountMinor - kept, note: "Commission refunded except non-refundable portion" });
        }
      } else if (success || plan.onFailure === "non_refundable") {
        // A payee's share can never exceed what they receive; any shortfall is waived.
        const taken = min(sh.amountMinor, payeePool);
        waived += sh.amountMinor - taken;
        payeePool -= taken;
        excroAtOutcome += taken;
      }
    }
  }

  for (const ch of charges.filter((c) => c.base === "payee_release")) applyCharge(ch, baseOf(ch));

  // ---- lines ----
  if (excroAtFunding > 0n) lines.push({ kind: "commission", to: EXCRO, amountMinor: excroAtFunding, note: "Excro commission (withdrawn at funding)", withdrawnAtFunding: true });
  if (excroAtOutcome > 0n) lines.push({ kind: "commission", to: EXCRO, amountMinor: excroAtOutcome, note: "Excro commission" });
  if (payeePool > 0n) lines.push({ kind: "release", to: payee.id, amountMinor: payeePool, note: "Release to payee" });

  const split = (total: Minor, kind: LineKind, note: string) => {
    if (total === 0n) return;
    const { parts, remainder } = floorSplit(total, shareBps);
    roundingTotal += remainder;
    parts.forEach((amt, i) => {
      const who = payers[i];
      if (who && amt > 0n) lines.push({ kind, to: who.id, amountMinor: amt, note });
    });
  };
  split(refundPool, "refund", "Refund of unreleased deal value");
  for (const c of toPayers) split(c.amount, "charge", c.label);

  if (heldValue > 0n) lines.push({ kind: "held", to: HELD, amountMinor: heldValue, note: "Disputed amount held pending settlement or award" });
  if (roundingTotal > 0n) lines.push({ kind: "rounding", to: s.roundingBeneficiary, amountMinor: roundingTotal, note: "Rounding remainder" });

  // Defensive invariant: pools conserve money by construction, so this only fires on a code bug.
  // The orchestrator treats it as a hard stop (halt payouts, page on-call), never as a warning.
  const total = sum(lines.map((l) => l.amountMinor));
  /* v8 ignore next */
  if (total !== totalDeposits) throw new WaterfallImbalance(`lines ${total} != deposits ${totalDeposits}`);
  return { input, totalDepositsMinor: totalDeposits, lines, waivedMinor: waived, outsideEscrowInvoices: invoices };
}
