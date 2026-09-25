// Placeholder registry: the only place a business parameter is declared.
//
// Rule (from Excro): the engine ships with no business numbers. Every rate, fee, penalty,
// cap and deadline is a placeholder that starts at zero / unset and is filled in from the
// deal's own agreement (or a gap resolution both parties accept). Adding a new placeholder
// later means adding one entry here; no waterfall or validator code changes.
//
// Two kinds of "zero":
//   - optional placeholders default to `set 0`  -> the line is inert (no late fee, no extension)
//   - required placeholders default to `unset`  -> a mandatory gap; the deal cannot be signed
//     until the agreement or a both-party gap resolution supplies a value (even an explicit 0).
import { z } from "zod";

export const PARAM_SOURCES = ["default", "platform_policy", "intake", "agreement", "gap_resolution"] as const;
export type ParamSource = (typeof PARAM_SOURCES)[number];

export type ParamValue<T> =
  | { status: "unset" }
  | { status: "set"; value: T; source: ParamSource; cite?: string };

const paramValue = <T extends z.ZodTypeAny>(v: T) =>
  z.discriminatedUnion("status", [
    z.object({ status: z.literal("unset") }),
    z.object({
      status: z.literal("set"),
      value: v,
      source: z.enum(PARAM_SOURCES),
      cite: z.string().optional(),
    }),
  ]);

const days = z.number().int().nonnegative();
const bps = z.number().int().min(0).max(10_000);

export const termsSchema = z.object({
  fundingDays: paramValue(days),
  dispatchDays: paramValue(days),
  dispatchExtensionDays: paramValue(days),
  maxExtensions: paramValue(days),
  noShipRule: paramValue(z.enum(["buyer_may_cancel", "auto_refund"])),
  promisedDeliveryDate: paramValue(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  deliveryLongStopDays: paramValue(days),
  lostInTransitRule: paramValue(z.enum(["reship_or_refund", "refund"])),
  reshipDays: paramValue(days),
  inspectionDays: paramValue(days),
  silenceRule: paramValue(z.enum(["accept", "reject"])),
  ldBpsPerDay: paramValue(bps),
  ldCapBps: paramValue(bps),
  buyerCancelFeeBps: paramValue(bps),
  returnDays: paramValue(days),
  returnShippingPaidBy: paramValue(z.enum(["buyer", "seller"])),
  objectionWindowHours: paramValue(days),
  sellerPincode: paramValue(z.string().regex(/^\d{6}$/)),
  deliveryPincode: paramValue(z.string().regex(/^\d{6}$/)),
  consigneeName: paramValue(z.string().min(1)),
  weightMinKg: paramValue(z.number().nonnegative()),
  weightMaxKg: paramValue(z.number().nonnegative()),
  disputeSeat: paramValue(z.string().min(1)),
});

export type Terms = z.infer<typeof termsSchema>;
export type TermKey = keyof Terms;

/** required: unset blocks signing. optional: defaults to set-0 (inert). advisory: may stay unset if both parties mark "not needed". */
export type Requirement = "required" | "optional" | "advisory";

export interface ParamDef {
  key: TermKey;
  label: string;
  unit: "days" | "hours" | "bps" | "bps_per_day" | "enum" | "date" | "text" | "kg";
  requirement: Requirement;
  /** Gap finding id this parameter belongs to (spec 12). Several parameters can share one gap. */
  gap?: GapId;
  /** Conditional requirement, evaluated against the current terms. */
  requiredWhen?: (t: Terms) => boolean;
  /** Only for optional/platform params: the inert starting value. */
  inertDefault?: { value: unknown; source: ParamSource };
}

export type GapId =
  | "silence_rule"
  | "late_deduction_cap"
  | "no_ship_rule"
  | "lost_in_transit"
  | "delivery_long_stop"
  | "returns"
  | "buyer_cancellation"
  | "weight_range";

const setValue = <T>(t: Terms, k: TermKey): T | undefined => {
  const p = t[k] as ParamValue<T>;
  return p.status === "set" ? p.value : undefined;
};

export const PARAMS: readonly ParamDef[] = [
  { key: "fundingDays", label: "Days to fund after signing", unit: "days", requirement: "required" },
  { key: "dispatchDays", label: "Days to dispatch after funding", unit: "days", requirement: "required" },
  { key: "dispatchExtensionDays", label: "Dispatch extension (days)", unit: "days", requirement: "optional", inertDefault: { value: 0, source: "default" } },
  { key: "maxExtensions", label: "Max dispatch extensions", unit: "days", requirement: "optional", inertDefault: { value: 0, source: "default" } },
  { key: "noShipRule", label: "If the seller never ships", unit: "enum", requirement: "required", gap: "no_ship_rule" },
  { key: "promisedDeliveryDate", label: "Promised delivery date", unit: "date", requirement: "required" },
  { key: "deliveryLongStopDays", label: "Delivery long-stop (days after promised date)", unit: "days", requirement: "required", gap: "delivery_long_stop" },
  { key: "lostInTransitRule", label: "If goods are lost in transit", unit: "enum", requirement: "required", gap: "lost_in_transit" },
  { key: "reshipDays", label: "Days to reship", unit: "days", requirement: "required", gap: "lost_in_transit", requiredWhen: (t) => setValue(t, "lostInTransitRule") === "reship_or_refund" },
  { key: "inspectionDays", label: "Inspection window (days)", unit: "days", requirement: "required" },
  { key: "silenceRule", label: "If the buyer stays silent", unit: "enum", requirement: "required", gap: "silence_rule" },
  { key: "ldBpsPerDay", label: "Late-delivery deduction (bps per day)", unit: "bps_per_day", requirement: "optional", inertDefault: { value: 0, source: "default" } },
  { key: "ldCapBps", label: "Late-delivery deduction cap (bps)", unit: "bps", requirement: "required", gap: "late_deduction_cap", requiredWhen: (t) => (setValue<number>(t, "ldBpsPerDay") ?? 0) > 0 },
  { key: "buyerCancelFeeBps", label: "Buyer cancellation fee (bps)", unit: "bps", requirement: "required", gap: "buyer_cancellation" },
  { key: "returnDays", label: "Return window (days)", unit: "days", requirement: "required", gap: "returns" },
  { key: "returnShippingPaidBy", label: "Who pays return shipping", unit: "enum", requirement: "required", gap: "returns" },
  // Excro platform safety control (specs 03/07), not an agreement condition. Kept as a placeholder so it can change.
  { key: "objectionWindowHours", label: "Objection window before payout (hours)", unit: "hours", requirement: "optional", inertDefault: { value: 24, source: "platform_policy" } },
  { key: "sellerPincode", label: "Seller pincode", unit: "text", requirement: "required" },
  { key: "deliveryPincode", label: "Delivery pincode", unit: "text", requirement: "required" },
  { key: "consigneeName", label: "Consignee", unit: "text", requirement: "required" },
  { key: "weightMinKg", label: "Expected weight, min (kg)", unit: "kg", requirement: "advisory", gap: "weight_range" },
  { key: "weightMaxKg", label: "Expected weight, max (kg)", unit: "kg", requirement: "advisory", gap: "weight_range" },
  { key: "disputeSeat", label: "Dispute seat / forum", unit: "text", requirement: "required" },
];

/** A terms object where nothing has been decided yet. */
export function defaultTerms(): Terms {
  const out: Record<string, ParamValue<unknown>> = {};
  for (const def of PARAMS) {
    out[def.key] = def.inertDefault
      ? { status: "set", value: def.inertDefault.value, source: def.inertDefault.source }
      : { status: "unset" };
  }
  return out as Terms;
}

export interface UnsetParam {
  key: TermKey;
  gap?: GapId;
  requirement: Requirement;
}

/** Required parameters (after conditional rules) that still have no value: these are the mandatory gaps. */
export function unsetRequired(terms: Terms): UnsetParam[] {
  return PARAMS.filter((d) => d.requirement === "required")
    .filter((d) => (d.requiredWhen ? d.requiredWhen(terms) : true))
    .filter((d) => terms[d.key].status === "unset")
    .map((d) => ({ key: d.key, gap: d.gap, requirement: d.requirement }));
}

/** Distinct mandatory gap ids still open (parameters without a gap id are plain missing facts, not clause gaps). */
export function openMandatoryGaps(terms: Terms): GapId[] {
  const ids = new Set<GapId>();
  for (const p of unsetRequired(terms)) if (p.gap) ids.add(p.gap);
  return [...ids];
}

/** Advisory parameters (spec 12: "can be marked not needed by both") that are still unset. */
export function unsetAdvisory(terms: Terms): UnsetParam[] {
  return PARAMS.filter((d) => d.requirement === "advisory")
    /* v8 ignore next -- no advisory param currently sets requiredWhen; kept symmetric with unsetRequired for when one does */
    .filter((d) => (d.requiredWhen ? d.requiredWhen(terms) : true))
    .filter((d) => terms[d.key].status === "unset")
    .map((d) => ({ key: d.key, gap: d.gap, requirement: d.requirement }));
}

/** Distinct advisory gap ids still open. */
export function openAdvisoryGaps(terms: Terms): GapId[] {
  const ids = new Set<GapId>();
  for (const p of unsetAdvisory(terms)) if (p.gap) ids.add(p.gap);
  return [...ids];
}

export function termValue<T>(terms: Terms, key: TermKey): T | undefined {
  return setValue<T>(terms, key);
}

/** Convenience for building terms in the reader, gap resolutions and tests. */
export function withTerm<K extends TermKey>(
  terms: Terms,
  key: K,
  value: Extract<Terms[K], { status: "set" }>["value"],
  source: ParamSource = "agreement",
  cite?: string,
): Terms {
  return { ...terms, [key]: { status: "set", value, source, ...(cite ? { cite } : {}) } } as Terms;
}
