// Money is integer minor units (paise/fils) held as bigint. Rates are basis points.
// Floats never touch a rupee: every multiplication goes through mulDivHalfEven.

export type Minor = bigint;

export const BPS = 10_000n;

export class MoneyError extends Error {}

/** round(a * b / c) with banker's rounding (half to even). Non-negative inputs only. */
export function mulDivHalfEven(a: bigint, b: bigint, c: bigint): bigint {
  if (a < 0n || b < 0n) throw new MoneyError("negative operand");
  if (c <= 0n) throw new MoneyError("divisor must be positive");
  const num = a * b;
  const q = num / c;
  const r2 = (num % c) * 2n;
  if (r2 > c) return q + 1n;
  if (r2 < c) return q;
  return q % 2n === 0n ? q : q + 1n;
}

export function mulBps(amount: Minor, bps: number): Minor {
  return mulDivHalfEven(amount, BigInt(bps), BPS);
}

export function sum(xs: readonly bigint[]): bigint {
  return xs.reduce((a, b) => a + b, 0n);
}

export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Split `total` by share weights using floor per share. The leftover (< shares.length
 * minor units) is returned separately so the caller decides who receives it; it is never
 * silently dropped. Shares need not sum to 10000, only be non-negative with a positive sum.
 */
export function floorSplit(total: Minor, shares: readonly number[]): { parts: Minor[]; remainder: Minor } {
  if (total < 0n) throw new MoneyError("negative total");
  const weight = shares.reduce((a, b) => a + b, 0);
  if (weight <= 0 || shares.some((s) => s < 0)) throw new MoneyError("invalid shares");
  const parts = shares.map((s) => (total * BigInt(s)) / BigInt(weight));
  return { parts, remainder: total - sum(parts) };
}

/** Same as floorSplit but the leftover goes to the first share (used on the deposit side, where nothing is "paid out"). */
export function splitToFirst(total: Minor, shares: readonly number[]): Minor[] {
  const { parts, remainder } = floorSplit(total, shares);
  parts[0] = (parts[0] as bigint) + remainder; // floorSplit rejects empty shares, so index 0 exists
  return parts;
}

/** Format for humans and tests: 173466000n -> "₹17,34,660.00" (Indian digit grouping). */
export function formatInr(minor: Minor): string {
  const neg = minor < 0n;
  const abs = neg ? -minor : minor;
  const rupees = (abs / 100n).toString();
  const paise = (abs % 100n).toString().padStart(2, "0");
  const last3 = rupees.slice(-3);
  const rest = rupees.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${neg ? "-" : ""}₹${grouped}.${paise}`;
}
