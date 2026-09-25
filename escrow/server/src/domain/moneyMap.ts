// Money-map validator (spec 02): must pass before a schedule can move to `signed`.
// Enumerates every outcome at the extremes and checks each row pays out exactly the deposits,
// with no negative line and no line to someone who cannot receive money.
import { depositors, isPayee, validateSchedule, type ReleaseSchedule, type ScheduleIssue } from "./schedule.js";
import { termValue } from "./params.js";
import { computeOutcome, EXCRO, HELD, type OutcomeInput, type OutcomeResult, type PayoutLine } from "./waterfall.js";

export interface MoneyMapRow {
  label: string;
  input: OutcomeInput;
  ok: boolean;
  errors: string[];
  result?: OutcomeResult;
}

export interface MoneyMapReport {
  issues: ScheduleIssue[];
  rows: MoneyMapRow[];
  /** True only when the schedule is structurally valid, has no unset required terms, and every row balances. */
  balanced: boolean;
}

function describe(i: OutcomeInput): string {
  switch (i.kind) {
    case "release_all": return `release_all, ${i.daysLate}d late`;
    case "partial": return `partial ${i.acceptedUnits} accepted, ${i.daysLate}d late`;
    case "dispute": return `dispute ${i.acceptedUnits} accepted / ${i.heldUnits} held, ${i.daysLate}d late`;
    case "reject_all": return "reject_all";
    case "refund_full": return "refund_full";
    case "buyer_cancel": return "buyer_cancel";
  }
}

const unique = <T>(xs: T[]): T[] => [...new Set(xs)];

/** Late-day extremes: none, one day, the day the cap bites, and one past it. */
function dayCases(s: ReleaseSchedule): number[] {
  const rate = termValue<number>(s.terms, "ldBpsPerDay") ?? 0;
  const cap = termValue<number>(s.terms, "ldCapBps") ?? 0;
  const saturates = rate > 0 && cap > 0 ? Math.ceil(cap / rate) : 1;
  return unique([0, 1, saturates, saturates + 1]);
}

export function enumerateOutcomes(s: ReleaseSchedule): OutcomeInput[] {
  const n = s.deal.unitCount;
  const days = dayCases(s);
  const out: OutcomeInput[] = [];
  for (const d of days) out.push({ kind: "release_all", daysLate: d });
  const partials = unique([1, Math.floor(n / 2), n - 1]).filter((k) => k >= 1 && k <= n - 1);
  for (const k of partials) for (const d of days) out.push({ kind: "partial", acceptedUnits: k, daysLate: d });
  const accepted = unique([0, 1, Math.floor(n / 2), n - 1]).filter((k) => k >= 0 && k <= n - 1);
  for (const k of accepted) {
    for (const m of unique([1, n - k])) {
      if (m >= 1 && k + m <= n) for (const d of days) out.push({ kind: "dispute", acceptedUnits: k, heldUnits: m, daysLate: d });
    }
  }
  out.push({ kind: "reject_all" }, { kind: "refund_full", reason: "no_ship" }, { kind: "buyer_cancel" });
  return out;
}

/** Exported so the guard can be tested against hand-made lines the engine itself never emits. */
export function checkPayoutLines(s: ReleaseSchedule, lines: PayoutLine[]): string[] {
  const errors: string[] = [];
  const byId = new Map(s.participants.map((p) => [p.id, p]));
  const payerIds = new Set(depositors(s).map((p) => p.id));
  for (const l of lines) {
    if (l.amountMinor < 0n) errors.push(`negative line to ${l.to}`);
    switch (l.kind) {
      case "release": {
        const who = byId.get(l.to);
        if (!who || !isPayee(who)) errors.push(`release to non-payee ${l.to}`);
        break;
      }
      case "refund":
      case "fee_refund":
        if (!payerIds.has(l.to)) errors.push(`${l.kind} to non-payer ${l.to}`);
        break;
      case "charge": {
        const who = byId.get(l.to);
        if (!who || who.role === "verifier" || who.role === "observer") errors.push(`charge to ${l.to}, who cannot receive money`);
        break;
      }
      case "commission":
        if (l.to !== EXCRO) errors.push("commission must go to Excro's fee account");
        break;
      case "rounding":
        if (l.to !== s.roundingBeneficiary) errors.push("rounding must go to the rounding beneficiary");
        break;
      case "held":
        if (l.to !== HELD) errors.push("held amounts stay in escrow");
        break;
    }
  }
  if (s.commission.amount.type === "none" && lines.some((l) => l.kind === "commission" || l.kind === "fee_refund")) errors.push("fee line present with zero commission");
  return errors;
}

export function validateMoneyMap(s: ReleaseSchedule): MoneyMapReport {
  const issues = validateSchedule(s);
  const rows: MoneyMapRow[] = [];
  for (const input of enumerateOutcomes(s)) {
    const label = describe(input);
    try {
      const result = computeOutcome(s, input);
      const errors = checkPayoutLines(s, result.lines);
      rows.push({ label, input, ok: errors.length === 0, errors, result });
    } catch (e) {
      rows.push({ label, input, ok: false, errors: [(e as Error).message] });
    }
  }
  return { issues, rows, balanced: issues.length === 0 && rows.every((r) => r.ok) };
}
