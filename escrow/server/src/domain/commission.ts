import { max, min, mulBps, splitToFirst, sum, type Minor, BPS, mulDivHalfEven } from "./money.js";
import { depositors, isDepositor, type ReleaseSchedule } from "./schedule.js";

export interface CommissionShare {
  participantId: string;
  amountMinor: Minor;
  /** True when this payer deposits into escrow, so their share sits in escrow from funding. */
  deposits: boolean;
}

export interface CommissionResult {
  feeMinor: Minor; // before GST
  gstMinor: Minor; // GST included in totalMinor (informational: invoices are out of Phase 1 scope)
  totalMinor: Minor;
  shares: CommissionShare[];
}

const ZERO: CommissionResult = { feeMinor: 0n, gstMinor: 0n, totalMinor: 0n, shares: [] };

/** Spec 14. A `none` plan yields no lines at all. */
export function computeCommission(s: ReleaseSchedule): CommissionResult {
  const c = s.commission;
  if (c.amount.type === "none") return ZERO;

  let fee: Minor;
  if (c.amount.type === "fixed") fee = c.amount.minor;
  else {
    fee = mulBps(s.deal.valueMinor, c.amount.bps);
    if (c.amount.minMinor !== undefined) fee = max(fee, c.amount.minMinor);
    if (c.amount.maxMinor !== undefined) fee = min(fee, c.amount.maxMinor);
  }

  const rate = BigInt(c.gst.rateBps);
  let total: Minor;
  let gst: Minor;
  if (c.gst.mode === "exclusive") {
    gst = mulBps(fee, c.gst.rateBps);
    total = fee + gst;
  } else {
    // Inclusive: the stated fee already contains GST; back the GST portion out for display.
    total = fee;
    gst = rate === 0n ? 0n : mulDivHalfEven(fee, rate, BPS + rate);
  }

  const parts = splitToFirst(total, c.payers.map((p) => p.shareBps));
  const byId = new Map(s.participants.map((p) => [p.id, p]));
  const shares = c.payers.map((p, i) => {
    const who = byId.get(p.participantId);
    return { participantId: p.participantId, amountMinor: parts[i] as Minor, deposits: !!who && isDepositor(who) };
  });
  return { feeMinor: fee, gstMinor: gst, totalMinor: total, shares };
}

export interface Deposit {
  participantId: string;
  dealMinor: Minor;
  feeMinor: Minor;
  totalMinor: Minor;
}

/**
 * What each payer must send to the bank. Fee shares are included only when the fee is
 * collected from escrow (A or B) and that payer deposits; `outside_escrow` deposits are deal value only.
 */
export function computeDeposits(s: ReleaseSchedule): { deposits: Deposit[]; totalMinor: Minor } {
  const payers = depositors(s);
  const dealParts = splitToFirst(s.deal.valueMinor, payers.map((p) => p.depositShareBps));
  const commission = computeCommission(s);
  const inEscrow = s.commission.collect !== "outside_escrow";
  const deposits = payers.map((p, i) => {
    const feeShare = inEscrow ? (commission.shares.find((x) => x.participantId === p.id)?.amountMinor ?? 0n) : 0n;
    const dealMinor = dealParts[i] as Minor;
    return { participantId: p.id, dealMinor, feeMinor: feeShare, totalMinor: dealMinor + feeShare };
  });
  return { deposits, totalMinor: sum(deposits.map((d) => d.totalMinor)) };
}
