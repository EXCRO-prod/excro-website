// Flow B: draft an agreement from the intake form + playbook choices (spec 12 step 2), then
// round-trip it through the reader (spec 12 step 3 / spec 04 D.4): "the agreement and the schedule
// can never disagree." Clauses 1-8 reuse the exact sentence structures already in the sample
// agreement (server/samples/supply-agreement-nirmal-kavya.txt) — user-supplied wording, safe to
// parametrize. Clauses 9-15 answer the playbook gaps that sample doesn't cover (spec 12's mandatory
// gap list) in plain, obviously-generated sentences — CLAUDE.md: never invent legal drafting
// language; every such clause is marked PLACEHOLDER pending Excro's lawyer-approved clause library.
import { termValue, type Terms } from "../domain/params.js";
import { bpsToPercentString, isoToLongDate } from "../reader/parse.js";
import { extractAgreement } from "../reader/extract.js";
import type { DealFacts } from "../reader/extract.js";

export interface DraftIntake {
  buyerName: string;
  sellerName: string;
  unitCount: number;
  unitPriceMinor: bigint;
  /** Every required placeholder already answered — Flow B resolves gaps *during* drafting (spec 12), not after. */
  terms: Terms;
}

function need<T>(terms: Terms, key: keyof Terms): T {
  const v = termValue<T>(terms, key);
  if (v === undefined) throw new Error(`draftAgreement: ${key} must be set before drafting (Flow B resolves gaps during intake)`);
  return v;
}

export function draftAgreement(intake: DraftIntake): string {
  const t = intake.terms;
  const valueMinor = BigInt(intake.unitCount) * intake.unitPriceMinor;
  const unitPriceRupees = (intake.unitPriceMinor / 100n).toLocaleString("en-IN");
  const valueRupees = (valueMinor / 100n).toLocaleString("en-IN");

  const silence = need<"accept" | "reject">(t, "silenceRule");
  const noShip = need<"buyer_may_cancel" | "auto_refund">(t, "noShipRule");
  const lostInTransit = need<"reship_or_refund" | "refund">(t, "lostInTransitRule");
  const returnPaidBy = need<"buyer" | "seller">(t, "returnShippingPaidBy");
  const ldBps = termValue<number>(t, "ldBpsPerDay") ?? 0;
  const cancelBps = need<number>(t, "buyerCancelFeeBps");

  const lostInTransitClause = lostInTransit === "reship_or_refund"
    ? `If the Goods are lost in transit, the Seller shall reship within ${need<number>(t, "reshipDays")} days, failing which the Buyer shall receive a full refund.`
    : "If the Goods are lost in transit, the Buyer shall receive a full refund immediately.";
  const cancellationClause = cancelBps === 0
    ? "If the Buyer cancels this Agreement after funding but before dispatch, no cancellation fee shall apply."
    : `If the Buyer cancels this Agreement after funding but before dispatch, the Buyer shall pay the Seller a cancellation fee of ${bpsToPercentString(cancelBps)}% of the value of the Goods.`;
  // Same conditional rule as the placeholder registry (domain/params.ts): a cap is only required,
  // and only drafted, when a late-delivery rate is actually in force.
  const ldCapClause = ldBps > 0 ? `8.2 The liquidated damages under clause 6 shall not exceed ${bpsToPercentString(need<number>(t, "ldCapBps"))}% of the value of the Goods.\n` : "";

  return `SUPPLY AGREEMENT

This Supply Agreement ("Agreement") is made between ${intake.buyerName} (the "Buyer"), and ${intake.sellerName} (the "Seller").

1. GOODS
1.1 The Seller shall supply ${intake.unitCount} units of the Goods.

2. PRICE
2.1 The price per unit is Rs. ${unitPriceRupees}/-.
2.2 The total consideration is Rs. ${valueRupees}/-.

3. PAYMENT THROUGH ESCROW
3.1 The Buyer shall deposit the total consideration into an escrow account within ${need<number>(t, "fundingDays")} days of execution of this Agreement.
3.2 The amount held in escrow shall be released to the Seller upon acceptance of the Goods by the Buyer.

4. DELIVERY
4.1 The Seller shall dispatch the Goods by courier within ${need<number>(t, "dispatchDays")} days of the escrow deposit being confirmed.
4.2 Delivery shall be made at ${need<string>(t, "deliveryPincode")} to ${need<string>(t, "consigneeName")} on or before ${isoToLongDate(need<string>(t, "promisedDeliveryDate"))}.
4.3 Seller's premises: ${need<string>(t, "sellerPincode")}.

5. INSPECTION
5.1 The Buyer shall inspect the Goods within ${need<number>(t, "inspectionDays")} days of delivery and notify the Seller of acceptance or rejection.

6. LATE DELIVERY
6.1 If the Goods are delivered after the date in clause 4.2, the Seller shall pay liquidated damages of ${bpsToPercentString(ldBps)}% of the value of the Goods per day of delay.

7. GOVERNING LAW
7.1 This Agreement is governed by the laws of India and the courts at ${need<string>(t, "disputeSeat")} shall have exclusive jurisdiction.

8. FAILURE PLAYBOOK [PLACEHOLDER CLAUSES — structure and numbers only, pending Excro's lawyer-approved clause library. Do not use as a final agreement.]
8.1 If the Buyer does not respond within the inspection window in clause 5.1, the Goods are deemed ${silence === "accept" ? "accepted" : "rejected"}.
${ldCapClause}8.3 If the Seller does not dispatch the Goods within the time in clause 4.1, the Buyer may ${noShip === "buyer_may_cancel" ? "cancel this Agreement for a full refund" : "receive an automatic full refund"}.
8.4 ${lostInTransitClause}
8.5 If the Goods are not delivered within ${need<number>(t, "deliveryLongStopDays")} days of the date in clause 4.2, the Buyer shall receive a full refund.
8.6 If the Buyer rejects any Goods, the Buyer shall return them within ${need<number>(t, "returnDays")} days, and the ${returnPaidBy === "buyer" ? "Buyer" : "Seller"} shall pay the return shipping cost.
8.7 ${cancellationClause}

IN WITNESS WHEREOF the parties have signed this Agreement.
`;
}

export interface RoundTripResult {
  ok: boolean;
  mismatches: string[];
  draftText: string;
}

const compareKey = <T,>(a: T, b: T): boolean => (typeof a === "bigint" || typeof b === "bigint" ? BigInt(a as never) === BigInt(b as never) : a === b);

/** Spec 12 step 3: regenerate the draft, re-read it, and require an exact match on every intake fact and term. */
export function roundTrip(intake: DraftIntake): RoundTripResult {
  const draftText = draftAgreement(intake);
  const mismatches: string[] = [];
  let reExtracted: ReturnType<typeof extractAgreement>;
  try {
    reExtracted = extractAgreement(draftText);
  } catch (e) {
    return { ok: false, mismatches: [`extraction failed: ${e instanceof Error ? e.message : String(e)}`], draftText };
  }

  const dealChecks: [keyof DealFacts, unknown][] = [
    ["unitCount", intake.unitCount],
    ["unitPriceMinor", intake.unitPriceMinor],
    ["valueMinor", BigInt(intake.unitCount) * intake.unitPriceMinor],
    ["buyerName", intake.buyerName],
    ["sellerName", intake.sellerName],
  ];
  for (const [key, expected] of dealChecks) {
    const got = reExtracted.dealFacts[key];
    if (got === undefined) mismatches.push(`${key}: not re-extracted from the draft`);
    else if (!compareKey(got, expected)) mismatches.push(`${key}: intake ${expected} != re-extracted ${got}`);
  }

  for (const key of Object.keys(intake.terms) as (keyof Terms)[]) {
    const expected = termValue(intake.terms, key);
    if (expected === undefined) continue; // intake left it unset (optional, inert) — nothing to round-trip
    const got = termValue(reExtracted.terms, key);
    if (got === undefined) mismatches.push(`${key}: not re-extracted from the draft`);
    else if (!compareKey(got, expected)) mismatches.push(`${key}: intake ${String(expected)} != re-extracted ${String(got)}`);
  }

  return { ok: mismatches.length === 0, mismatches, draftText };
}
