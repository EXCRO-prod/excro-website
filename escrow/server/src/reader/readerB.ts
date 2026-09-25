// Reader B: whole-document keyword/proximity extraction — a second, independent strategy (spec
// 04 A.3: "two different model families... into the same schema"). Where Reader A parses one
// bounded clause at a time, Reader B searches the raw text for every occurrence of a pattern and
// classifies matches by nearby context (e.g. every 6-digit run, tagged seller/delivery by what
// precedes it), so the two readers can genuinely disagree on messy or ambiguous text instead of
// being the same regex twice.
import { parseLongDateToIso, parseRupeesToMinor, percentStringToBps } from "./parse.js";
import type { ExtractedField, ReaderResult, Reader } from "./types.js";

function field(value: unknown, clauseRef: string, quote: string): ExtractedField {
  return { value, clauseRef, quote };
}

/** Windowed classification: every match of `pattern`, tagged by whether `context` appears in the
 * `before` characters preceding it. Used for fields (like pincodes) that repeat with different roles. */
function findClassified(text: string, pattern: RegExp, context: RegExp, before = 80): RegExpMatchArray | undefined {
  const re = new RegExp(pattern, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  for (const m of text.matchAll(re)) {
    const windowStart = Math.max(0, m.index! - before);
    if (context.test(text.slice(windowStart, m.index!))) return m;
  }
  return undefined;
}

export const readerB: Reader = {
  id: "whole-document-scan",
  read(text: string): ReaderResult {
    const out: ReaderResult = {};

    const unitCount = text.match(/shall\s+supply\s+(\d+)\s+units?/i);
    if (unitCount) out.unitCount = field(Number(unitCount[1]), "text scan", unitCount[0]);

    const unitPrice = text.match(/price per unit is\s+Rs\.?\s*([\d,]+)\/-/i);
    if (unitPrice) out.unitPriceMinor = field(parseRupeesToMinor(unitPrice[1]!), "text scan", unitPrice[0]);

    const total = text.match(/total consideration is\s+Rs\.?\s*([\d,]+)\/-/i);
    if (total) out.valueMinor = field(parseRupeesToMinor(total[1]!), "text scan", total[0]);

    const funding = text.match(/within\s+(\d+)\s+days?\s+of\s+execution\s+of\s+this\s+Agreement/i);
    if (funding) out.fundingDays = field(Number(funding[1]), "text scan", funding[0]);

    const dispatch = text.match(/dispatch\s+the\s+Goods\s+by\s+courier\s+within\s+(\d+)\s+days?/i);
    if (dispatch) out.dispatchDays = field(Number(dispatch[1]), "text scan", dispatch[0]);

    const inspect = text.match(/inspect\s+the\s+Goods\s+within\s+(\d+)\s+days?/i);
    if (inspect) out.inspectionDays = field(Number(inspect[1]), "text scan", inspect[0]);

    const ld = text.match(/liquidated\s+damages\s+of\s+(\d+(?:\.\d+)?)\s*%/i);
    if (ld) out.ldBpsPerDay = field(percentStringToBps(ld[1]!), "text scan", ld[0]);

    const seatMatch = text.match(/courts?\s+at\s+([A-Za-z]+)/i);
    if (seatMatch) out.disputeSeat = field(seatMatch[1], "text scan", seatMatch[0]);

    const consigneeDate = text.match(/to\s+([A-Z][A-Za-z ]+?)\s+on\s+or\s+before\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i);
    if (consigneeDate) {
      out.consigneeName = field(consigneeDate[1]!.trim(), "text scan", consigneeDate[0]);
      const iso = parseLongDateToIso(consigneeDate[2]!, consigneeDate[3]!, consigneeDate[4]!);
      if (iso) out.promisedDeliveryDate = field(iso, "text scan", consigneeDate[0]);
    }

    // Every 6-digit run in the document, classified by what word precedes it: this is the part
    // that genuinely differs from Reader A's single bounded clause match.
    const sellerPin = findClassified(text, /\d{6}/g, /premises/i);
    if (sellerPin) out.sellerPincode = field(sellerPin[0], "text scan (context: premises)", sellerPin[0]);
    const deliveryPin = findClassified(text, /\d{6}/g, /Delivery shall be made/i);
    if (deliveryPin) out.deliveryPincode = field(deliveryPin[0], "text scan (context: delivery)", deliveryPin[0]);

    // Same "stop at the first comma or '(the'" trick as reader A, independently anchored (this
    // one keys off "Agreement...between", not a bare "between").
    const buyer = text.match(/Agreement.*?between\s+([^,(]+?)\s*(?:,|\(the)/i);
    if (buyer) out.buyerName = field(buyer[1]!.trim(), "text scan", buyer[0]);
    const seller = text.match(/"Buyer"\)\s*,\s*and\s+([^,(]+?)\s*(?:,|\(the)/i);
    if (seller) out.sellerName = field(seller[1]!.trim(), "text scan", seller[0]);

    // Playbook clauses (Flow B round-trip): same target fields as reader A, independently anchored.
    const silence = text.match(/deemed\s+(accepted|rejected)/i);
    if (silence) out.silenceRule = field(silence[1]!.toLowerCase() === "accepted" ? "accept" : "reject", "text scan", silence[0]);

    const ldCap = text.match(/shall\s+not\s+exceed\s+(\d+(?:\.\d+)?)\s*%\s+of\s+the\s+value/i);
    if (ldCap) out.ldCapBps = field(percentStringToBps(ldCap[1]!), "text scan", ldCap[0]);

    const noShipCancel = text.match(/cancel\s+this\s+Agreement\s+for\s+a\s+full\s+refund/i);
    const noShipAuto = text.match(/receive\s+an\s+automatic\s+full\s+refund/i);
    if (noShipCancel) out.noShipRule = field("buyer_may_cancel", "text scan", noShipCancel[0]);
    else if (noShipAuto) out.noShipRule = field("auto_refund", "text scan", noShipAuto[0]);

    const reship = text.match(/reship\s+within\s+(\d+)\s+days/i);
    if (reship) { out.lostInTransitRule = field("reship_or_refund", "text scan", reship[0]); out.reshipDays = field(Number(reship[1]), "text scan", reship[0]); }
    else {
      const refundOnly = text.match(/full\s+refund\s+immediately/i);
      if (refundOnly) out.lostInTransitRule = field("refund", "text scan", refundOnly[0]);
    }

    const longStop = text.match(/not\s+delivered\s+within\s+(\d+)\s+days/i);
    if (longStop) out.deliveryLongStopDays = field(Number(longStop[1]), "text scan", longStop[0]);

    const returnDays = text.match(/return\s+them\s+within\s+(\d+)\s+days/i);
    if (returnDays) out.returnDays = field(Number(returnDays[1]), "text scan", returnDays[0]);
    const returnPayer = text.match(/(Buyer|Seller)\s+shall\s+pay\s+the\s+return\s+shipping/i);
    if (returnPayer) out.returnShippingPaidBy = field(returnPayer[1]!.toLowerCase(), "text scan", returnPayer[0]);

    const cancelFee = text.match(/cancellation\s+fee\s+of\s+(\d+(?:\.\d+)?)\s*%/i);
    const noCancelFee = text.match(/no\s+cancellation\s+fee\s+shall\s+apply/i);
    if (cancelFee) out.buyerCancelFeeBps = field(percentStringToBps(cancelFee[1]!), "text scan", cancelFee[0]);
    else if (noCancelFee) out.buyerCancelFeeBps = field(0, "text scan", noCancelFee[0]);

    return out;
  },
};
