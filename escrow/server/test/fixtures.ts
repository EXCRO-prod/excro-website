// Test inputs only. Nothing here is a default: src/ ships with every business number at zero/unset.
// The figures reproduce the fixtures named in CLAUDE.md / MASTER_PROMPT.md (40 units x Rs 46,000).
import { defaultTerms, withTerm, type Terms } from "../src/domain/params.js";
import { noCommission, scheduleSchema, type CommissionPlan, type Participant, type ReleaseSchedule } from "../src/domain/schedule.js";

export const rupees = (r: number): bigint => BigInt(r) * 100n;

export const buyer = (share = 10_000, id = "buyer"): Participant =>
  ({ id, role: "payer", label: "Buyer", signs: true, depositShareBps: share, feeRule: { bps: 0, fixedMinor: 0n } });
export const sellerP = (): Participant =>
  ({ id: "seller", role: "payee", label: "Seller", signs: true, depositShareBps: 0, feeRule: { bps: 0, fixedMinor: 0n } });
export const broker = (bps = 0, fixedMinor = 0n): Participant =>
  ({ id: "broker", role: "fee_payee", label: "Broker", signs: true, depositShareBps: 0, feeRule: { bps, fixedMinor } });

/** Every required placeholder answered, every optional charge left at zero. */
export function completeTerms(): Terms {
  let t = defaultTerms();
  t = withTerm(t, "fundingDays", 3);
  t = withTerm(t, "dispatchDays", 5);
  t = withTerm(t, "noShipRule", "buyer_may_cancel");
  t = withTerm(t, "promisedDeliveryDate", "2026-09-30");
  t = withTerm(t, "deliveryLongStopDays", 10);
  t = withTerm(t, "lostInTransitRule", "reship_or_refund");
  t = withTerm(t, "reshipDays", 4);
  t = withTerm(t, "inspectionDays", 3);
  t = withTerm(t, "silenceRule", "accept");
  t = withTerm(t, "buyerCancelFeeBps", 0);
  t = withTerm(t, "returnDays", 5);
  t = withTerm(t, "returnShippingPaidBy", "buyer");
  t = withTerm(t, "sellerPincode", "560058");
  t = withTerm(t, "deliveryPincode", "141003");
  t = withTerm(t, "consigneeName", "Nirmal Traders");
  t = withTerm(t, "disputeSeat", "Bengaluru");
  return t;
}

export function makeSchedule(over: {
  participants?: Participant[];
  commission?: CommissionPlan;
  terms?: Terms;
  extraCharges?: unknown[];
  units?: number;
  price?: bigint;
  rounding?: string;
} = {}): ReleaseSchedule {
  const units = over.units ?? 40;
  const price = over.price ?? rupees(46_000);
  return scheduleSchema.parse({
    schema: "excro.release-schedule/1",
    version: 1,
    deal: { id: "EX-TEST-1", type: "goods_sale_inspection", currency: "INR", valueMinor: BigInt(units) * price, unitCount: units, unitPriceMinor: price },
    participants: over.participants ?? [buyer(), sellerP()],
    commission: over.commission ?? noCommission(),
    terms: over.terms ?? completeTerms(),
    extraCharges: over.extraCharges ?? [],
    roundingBeneficiary: over.rounding ?? "seller",
  });
}

/** Fixture (a): 0.5% commission, GST-inclusive, split 50/50 buyer/seller, collected at release, refundable. */
export const commissionFixtureA = (): CommissionPlan => ({
  amount: { type: "bps", bps: 50 },
  gst: { mode: "inclusive", rateBps: 1800 },
  payers: [{ participantId: "buyer", shareBps: 5000 }, { participantId: "seller", shareBps: 5000 }],
  collect: "at_release",
  onFailure: "refundable",
  nonRefundableFixedMinor: 0n,
});

/** Late deduction used by fixtures (a)/(b): 0.5% per day, capped at 5%. Supplied as terms, exactly as an agreement would. */
export function termsWithLateDeduction(): Terms {
  return withTerm(withTerm(completeTerms(), "ldBpsPerDay", 50), "ldCapBps", 500);
}

export const amountTo = (lines: { to: string; kind: string; amountMinor: bigint }[], to: string, kind?: string): bigint =>
  lines.filter((l) => l.to === to && (!kind || l.kind === kind)).reduce((a, l) => a + l.amountMinor, 0n);
