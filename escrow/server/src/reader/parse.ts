// Shared, pure parsing helpers used by both readers. Kept separate so each reader's own file is
// just "where to look", not "how to parse a rupee amount" duplicated twice.
const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

/** "Rs. 46,000/-" / "Rs 1,84,000" -> 4600000n (paise). Indian comma grouping is just noise to strip. */
export function parseRupeesToMinor(text: string): bigint | undefined {
  const digits = text.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(digits)) return undefined;
  return BigInt(digits) * 100n;
}

/** "30 September 2026" -> "2026-09-30". Returns undefined if the month name isn't recognised. */
export function parseLongDateToIso(day: string, month: string, year: string): string | undefined {
  const mm = MONTHS[month.toLowerCase()];
  if (!mm) return undefined;
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

/** "0.5" (percent) -> 50 (basis points). */
export function percentStringToBps(pct: string): number {
  return Math.round(Number(pct) * 100);
}

/** bps -> a percent string for template text: 500 -> "5", 50 -> "0.5". */
export function bpsToPercentString(bps: number): string {
  return String(bps / 100);
}

const MONTH_NAMES = Object.entries(MONTHS).reduce<Record<string, string>>((acc, [name, mm]) => {
  acc[mm] = name[0]!.toUpperCase() + name.slice(1);
  return acc;
}, {});

/** "2026-09-30" -> "30 September 2026" (inverse of parseLongDateToIso, for the template). */
export function isoToLongDate(iso: string): string {
  const [year, mm, day] = iso.split("-");
  return `${Number(day)} ${MONTH_NAMES[mm!]} ${year}`;
}
