import { z } from "zod";
import { termsSchema, type Terms, unsetRequired, termValue } from "./params.js";
import { canonicalStringify, sha256Hex } from "../util/canonical.js";
import { BPS, mulBps, mulDivHalfEven, type Minor } from "./money.js";

const minor = z
  .union([z.bigint(), z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((v) => BigInt(v));
const bps = z.number().int().min(0).max(10_000);

export const ROLES = ["payer", "payee", "payer_payee", "fee_payee", "verifier", "observer"] as const;
export type Role = (typeof ROLES)[number];

export const participantSchema = z.object({
  id: z.string().min(1),
  role: z.enum(ROLES),
  label: z.string().min(1),
  signs: z.boolean(),
  /** Payers only: share of the deal value they deposit. */
  depositShareBps: bps.default(0),
  /** Fee payee only: paid out of the payee's release. Both default to zero (inert). */
  feeRule: z.object({ bps: bps.default(0), fixedMinor: minor.default(0n) }).default({}),
});
export type Participant = z.infer<typeof participantSchema>;

export const commissionSchema = z.object({
  amount: z.discriminatedUnion("type", [
    z.object({ type: z.literal("none") }),
    z.object({ type: z.literal("fixed"), minor }),
    z.object({ type: z.literal("bps"), bps, minMinor: minor.optional(), maxMinor: minor.optional() }),
  ]),
  /** GST rate is itself a placeholder: 0 until Excro's CA supplies it. */
  gst: z.object({ mode: z.enum(["exclusive", "inclusive"]), rateBps: z.number().int().min(0) }),
  payers: z.array(z.object({ participantId: z.string(), shareBps: bps })),
  collect: z.enum(["at_funding", "at_release", "outside_escrow"]),
  onFailure: z.enum(["refundable", "non_refundable", "refundable_except_fixed"]),
  /** Only used by refundable_except_fixed. */
  nonRefundableFixedMinor: minor.default(0n),
});
export type CommissionPlan = z.infer<typeof commissionSchema>;

export const noCommission = (): CommissionPlan => ({
  amount: { type: "none" },
  gst: { mode: "exclusive", rateBps: 0 },
  payers: [],
  collect: "at_release",
  onFailure: "refundable",
  nonRefundableFixedMinor: 0n,
});

export const OUTCOME_KINDS = ["release_all", "partial", "dispute", "reject_all", "refund_full", "buyer_cancel"] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

/** A generic, schedule-defined charge. This is how new "placeholders" appear later without engine changes. */
export const chargeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  outcomes: z.array(z.enum(OUTCOME_KINDS)).min(1),
  base: z.enum(["deal_value", "accepted_value", "rejected_value", "payee_release"]),
  bps: bps.default(0),
  perDayLate: z.boolean().default(false),
  fixedMinor: minor.default(0n),
  minMinor: minor.optional(),
  maxMinor: minor.optional(),
  capBps: bps.optional(),
  from: z.enum(["payee", "payers"]),
  to: z.discriminatedUnion("type", [
    z.object({ type: z.literal("payers") }),
    z.object({ type: z.literal("payee") }),
    z.object({ type: z.literal("participant"), id: z.string() }),
  ]),
});
export type Charge = z.infer<typeof chargeSchema>;

export const scheduleSchema = z.object({
  schema: z.literal("excro.release-schedule/1"),
  version: z.number().int().min(1),
  deal: z.object({
    id: z.string().min(1),
    type: z.literal("goods_sale_inspection"),
    currency: z.literal("INR"),
    valueMinor: minor,
    unitCount: z.number().int().min(1),
    unitPriceMinor: minor,
  }),
  participants: z.array(participantSchema).min(2).max(10),
  commission: commissionSchema,
  terms: termsSchema,
  extraCharges: z.array(chargeSchema).default([]),
  /** Participant id that absorbs the few paise left over when a payout is split pro-rata. */
  roundingBeneficiary: z.string().min(1),
});
export type ReleaseSchedule = z.infer<typeof scheduleSchema>;

// ---- canonical hash -------------------------------------------------------------------

export function canonicalJson(s: ReleaseSchedule): string {
  return canonicalStringify(s);
}

/** The fingerprint that goes into the signed addendum/annex. Any change means a new signature from everyone. */
export function scheduleSha256(s: ReleaseSchedule): string {
  return sha256Hex(canonicalJson(s));
}

// ---- role helpers ---------------------------------------------------------------------

export const isDepositor = (p: Participant) => p.role === "payer" || p.role === "payer_payee";
export const isPayee = (p: Participant) => p.role === "payee" || p.role === "payer_payee";

export function depositors(s: ReleaseSchedule): Participant[] {
  return s.participants.filter(isDepositor);
}

/** Phase 1 goods template has exactly one payee (the seller). */
export function seller(s: ReleaseSchedule): Participant {
  const payees = s.participants.filter((p) => p.role === "payee");
  const only = payees[0];
  if (payees.length !== 1 || !only) throw new Error("goods template needs exactly one payee");
  return only;
}

// ---- structural validation (blocks signing) ------------------------------------------

export interface ScheduleIssue {
  code: string;
  message: string;
}

export function validateSchedule(s: ReleaseSchedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];
  const add = (code: string, message: string) => issues.push({ code, message });
  const byId = new Map(s.participants.map((p) => [p.id, p]));
  if (byId.size !== s.participants.length) add("participant_ids_unique", "participant ids must be unique");

  const payers = depositors(s);
  const payees = s.participants.filter((p) => p.role === "payee");
  if (payers.length < 1 || payers.length > 3) add("payer_count", "goods template needs 1-3 payers");
  if (payees.length !== 1) add("payee_count", "goods template needs exactly one payee");
  if (s.participants.filter((p) => p.role === "fee_payee").length > 1) add("fee_payee_count", "at most one fee payee");
  if (payers.reduce((a, p) => a + p.depositShareBps, 0) !== 10_000) add("deposit_shares", "payer deposit shares must total 100%");
  for (const p of s.participants) {
    const canSign = p.role !== "observer";
    if (p.signs !== canSign) add("signing_roles", `${p.label}: observers never sign; every other role signs`);
    if (!isDepositor(p) && p.depositShareBps !== 0) add("deposit_share_role", `${p.label}: only payers hold a deposit share`);
    const fr = p.feeRule;
    if (p.role !== "fee_payee" && (fr.bps > 0 || fr.fixedMinor > 0n)) add("fee_rule_role", `${p.label}: only a fee payee can carry a fee rule`);
  }

  const d = s.deal;
  if (d.valueMinor <= 0n) add("deal_value", "deal value must be positive");
  if (BigInt(d.unitCount) * d.unitPriceMinor !== d.valueMinor) add("units_times_price", "units x unit price must equal the deal value");

  const rb = byId.get(s.roundingBeneficiary);
  if (!rb || !isPayee(rb)) add("rounding_beneficiary", "rounding beneficiary must be a payee");

  // Commission plan (spec 14)
  const c = s.commission;
  const active = c.amount.type !== "none";
  if (!active && c.payers.length > 0) add("commission_payers_when_none", "no commission means no commission payers");
  if (active) {
    if (c.payers.length === 0) add("commission_payers", "commission needs at least one payer");
    if (c.payers.reduce((a, p) => a + p.shareBps, 0) !== 10_000) add("commission_shares", "commission payer shares must total 100%");
    for (const cp of c.payers) {
      const who = byId.get(cp.participantId);
      if (!who || !(isDepositor(who) || isPayee(who))) add("commission_payer_role", "commission payers must be payers or payees");
      if (c.collect === "at_funding" && who && !isDepositor(who)) add("at_funding_needs_depositors", "collecting at funding needs every commission payer to deposit into escrow");
    }
    if (c.collect === "at_funding" && c.onFailure !== "non_refundable") add("at_funding_refundable", "a fee withdrawn at funding has left escrow, so it must be non-refundable");
    if (c.amount.type === "bps" && c.amount.minMinor !== undefined && c.amount.maxMinor !== undefined && c.amount.minMinor > c.amount.maxMinor) add("commission_min_max", "commission minimum exceeds maximum");
  }

  // Charges: an uncapped per-day deduction can exceed the deal value (spec 12 mandatory gap).
  for (const ch of allCharges(s)) {
    if (ch.perDayLate && ch.bps > 0 && ch.capBps === undefined && ch.maxMinor === undefined) add("uncapped_charge", `${ch.label}: per-day charge needs a cap`);
    if (ch.to.type === "participant" && !byId.has(ch.to.id)) add("charge_target", `${ch.label}: unknown beneficiary`);
  }

  // Every required placeholder must be answered (this is what "mandatory gap" means in code).
  for (const u of unsetRequired(s.terms)) add("unset_required", `required term not set: ${u.key}`);
  return issues;
}

// ---- charges derived from terms + participants ---------------------------------------

/** Built-in charges are just Charge records derived from placeholders; custom ones come from extraCharges. */
export function derivedCharges(s: ReleaseSchedule): Charge[] {
  const t: Terms = s.terms;
  const out: Charge[] = [];
  const ld = termValue<number>(t, "ldBpsPerDay") ?? 0;
  out.push({
    id: "late_delivery",
    label: "Late-delivery deduction",
    outcomes: ["release_all", "partial", "dispute"],
    base: "accepted_value",
    bps: ld,
    perDayLate: true,
    fixedMinor: 0n,
    capBps: termValue<number>(t, "ldCapBps"),
    from: "payee",
    to: { type: "payers" },
  });
  out.push({
    id: "buyer_cancel_fee",
    label: "Buyer cancellation fee",
    outcomes: ["buyer_cancel"],
    base: "deal_value",
    bps: termValue<number>(t, "buyerCancelFeeBps") ?? 0,
    perDayLate: false,
    fixedMinor: 0n,
    from: "payers",
    to: { type: "payee" },
  });
  for (const p of s.participants.filter((x) => x.role === "fee_payee")) {
    out.push({
      id: `fee_${p.id}`,
      label: `${p.label} fee`,
      outcomes: ["release_all", "partial", "dispute"],
      base: "payee_release",
      bps: p.feeRule.bps,
      perDayLate: false,
      fixedMinor: p.feeRule.fixedMinor,
      from: "payee",
      to: { type: "participant", id: p.id },
    });
  }
  return out;
}

export function allCharges(s: ReleaseSchedule): Charge[] {
  return [...derivedCharges(s), ...s.extraCharges];
}

export function chargeAmount(ch: Charge, base: Minor, daysLate: number): Minor {
  // One rounding step for rate x days, so 1 day at 50 bps and 2 days at 25 bps agree to the paisa.
  const rateBps = BigInt(ch.bps) * BigInt(ch.perDayLate ? daysLate : 1);
  let amt = ch.fixedMinor + mulDivHalfEven(base, rateBps, BPS);
  if (ch.capBps !== undefined) {
    const cap = mulBps(base, ch.capBps);
    if (amt > cap) amt = cap;
  }
  if (ch.minMinor !== undefined && amt < ch.minMinor) amt = ch.minMinor;
  if (ch.maxMinor !== undefined && amt > ch.maxMinor) amt = ch.maxMinor;
  return amt;
}
