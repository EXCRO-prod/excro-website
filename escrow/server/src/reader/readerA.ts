// Reader A: clause-structured extraction. Splits the text into its numbered clauses (§1.1, §4.2, ...)
// and reads each one for the field(s) it expects to find there. Tuned to Phase 1's one deal type
// (goods sale with inspection, spec 04's own checklist: deposit, dispatch, delivery, inspection,
// acceptance, termination, dispute seat) — a different deal type is future work, not this reader's job.
import { parseLongDateToIso, parseRupeesToMinor, percentStringToBps } from "./parse.js";
import type { ExtractedField, ReaderResult, Reader } from "./types.js";

function field(value: unknown, clauseRef: string, quote: string): ExtractedField {
  return { value, clauseRef, quote };
}

interface Clause {
  ref: string;
  body: string;
}

/** Numbered clauses ("1.1 ...", "4.2 ...") at line starts; a clause runs until the next clause marker. */
function splitClauses(text: string): Clause[] {
  const marker = /^(\d+\.\d+)\s+/gm;
  const hits = [...text.matchAll(marker)];
  return hits.map((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < hits.length ? hits[i + 1]!.index! : text.length;
    return { ref: m[1]!, body: text.slice(start, end).trim() };
  });
}

const clauseMatchers: { test: RegExp; apply: (m: RegExpMatchArray, ref: string, out: ReaderResult) => void }[] = [
  {
    test: /(\d+)\s+units?\s+of/i,
    apply: (m, ref, out) => { out.unitCount = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /price per unit is\s+Rs\.?\s*([\d,]+)\/-/i,
    apply: (m, ref, out) => { out.unitPriceMinor = field(parseRupeesToMinor(m[1]!), `§${ref}`, m[0]); },
  },
  {
    test: /total consideration is\s+Rs\.?\s*([\d,]+)\/-/i,
    apply: (m, ref, out) => { out.valueMinor = field(parseRupeesToMinor(m[1]!), `§${ref}`, m[0]); },
  },
  {
    test: /within\s+(\d+)\s+days?\s+of\s+execution/i,
    apply: (m, ref, out) => { out.fundingDays = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /within\s+(\d+)\s+days?\s+of\s+(?:the\s+)?(?:escrow\s+)?deposit/i,
    apply: (m, ref, out) => { out.dispatchDays = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /at\s+.*?(\d{6})\s+to\s+(.+?)\s+on\s+or\s+before\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i,
    apply: (m, ref, out) => {
      const [, pincode, consignee, day, month, year] = m;
      out.deliveryPincode = field(pincode, `§${ref}`, m[0]);
      out.consigneeName = field(consignee!.trim(), `§${ref}`, m[0]);
      const iso = parseLongDateToIso(day!, month!, year!);
      if (iso) out.promisedDeliveryDate = field(iso, `§${ref}`, m[0]);
    },
  },
  {
    test: /premises:?\s*.*?(\d{6})/i,
    apply: (m, ref, out) => { out.sellerPincode = field(m[1], `§${ref}`, m[0]); },
  },
  {
    test: /within\s+(\d+)\s+days?\s+of\s+delivery/i,
    apply: (m, ref, out) => { out.inspectionDays = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /(\d+(?:\.\d+)?)\s*%\s+of\s+the\s+value.*?per\s+day/i,
    apply: (m, ref, out) => { out.ldBpsPerDay = field(percentStringToBps(m[1]!), `§${ref}`, m[0]); },
  },
  {
    test: /courts?\s+at\s+([A-Za-z]+)\s+shall\s+have\s+exclusive\s+jurisdiction/i,
    apply: (m, ref, out) => { out.disputeSeat = field(m[1], `§${ref}`, m[0]); },
  },
  // Playbook clauses (Flow B template, spec 12 step 2): the sample agreement has none of these —
  // they're what the 7 mandatory gaps are about — but a Flow B draft always includes them, and the
  // round-trip check (spec 12 step 3 / spec 04 D.4) needs the same reader to read them back.
  {
    test: /the\s+Goods\s+are\s+deemed\s+(accepted|rejected)/i,
    apply: (m, ref, out) => { out.silenceRule = field(m[1]!.toLowerCase() === "accepted" ? "accept" : "reject", `§${ref}`, m[0]); },
  },
  {
    test: /liquidated\s+damages\s+under\s+clause\s+6\s+shall\s+not\s+exceed\s+(\d+(?:\.\d+)?)\s*%/i,
    apply: (m, ref, out) => { out.ldCapBps = field(percentStringToBps(m[1]!), `§${ref}`, m[0]); },
  },
  {
    test: /the\s+Buyer\s+may\s+(cancel\s+this\s+Agreement\s+for\s+a\s+full\s+refund|receive\s+an\s+automatic\s+full\s+refund)/i,
    apply: (m, ref, out) => { out.noShipRule = field(/cancel/i.test(m[1]!) ? "buyer_may_cancel" : "auto_refund", `§${ref}`, m[0]); },
  },
  {
    test: /Seller\s+shall\s+reship\s+within\s+(\d+)\s+days/i,
    apply: (m, ref, out) => { out.lostInTransitRule = field("reship_or_refund", `§${ref}`, m[0]); out.reshipDays = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /Buyer\s+shall\s+receive\s+a\s+full\s+refund\s+immediately/i,
    apply: (m, ref, out) => { out.lostInTransitRule = field("refund", `§${ref}`, m[0]); },
  },
  {
    test: /not\s+delivered\s+within\s+(\d+)\s+days\s+of\s+the\s+date\s+in\s+clause\s+4\.2/i,
    apply: (m, ref, out) => { out.deliveryLongStopDays = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /return\s+them\s+within\s+(\d+)\s+days/i,
    apply: (m, ref, out) => { out.returnDays = field(Number(m[1]), `§${ref}`, m[0]); },
  },
  {
    test: /(Buyer|Seller)\s+shall\s+pay\s+the\s+return\s+shipping\s+cost/i,
    apply: (m, ref, out) => { out.returnShippingPaidBy = field(m[1]!.toLowerCase() as "buyer" | "seller", `§${ref}`, m[0]); },
  },
  {
    test: /cancellation\s+fee\s+of\s+(\d+(?:\.\d+)?)\s*%\s+of\s+the\s+value/i,
    apply: (m, ref, out) => { out.buyerCancelFeeBps = field(percentStringToBps(m[1]!), `§${ref}`, m[0]); },
  },
  {
    test: /no\s+cancellation\s+fee\s+shall\s+apply/i,
    apply: (m, ref, out) => { out.buyerCancelFeeBps = field(0, `§${ref}`, m[0]); },
  },
];

function readPreamble(text: string, out: ReaderResult): void {
  // Stops at the first comma (a sample with a descriptive clause: "Nirmal Traders, a
  // proprietorship...") or at "(the" (a plain template: "NT Imports Pvt Ltd (the "Buyer")"),
  // whichever comes first — one pattern that reads the party's name either way it's phrased.
  const buyer = text.match(/between\s+([^,(]+?)\s*(?:,|\(the)/i);
  if (buyer) out.buyerName = field(buyer[1]!.trim(), "preamble", buyer[0]);
  const seller = text.match(/\(the\s+"Buyer"\),\s+and\s+([^,(]+?)\s*(?:,|\(the)/i);
  if (seller) out.sellerName = field(seller[1]!.trim(), "preamble", seller[0]);
}

export const readerA: Reader = {
  id: "clause-structured",
  read(text: string): ReaderResult {
    const out: ReaderResult = {};
    readPreamble(text, out);
    for (const clause of splitClauses(text)) {
      for (const { test, apply } of clauseMatchers) {
        const m = clause.body.match(test);
        if (m) apply(m, clause.ref, out);
      }
    }
    return out;
  },
};
