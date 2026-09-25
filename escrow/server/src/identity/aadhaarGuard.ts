// CLAUDE.md #8: never store a full Aadhaar number. The KYC route never asks for one (offline
// verification returns masked last 4 + provider reference), so any 12-digit Aadhaar-shaped value
// in a request, audit detail or log line is a bug or an attack, and is refused.

// Verhoeff checksum: real Aadhaar numbers carry it, which keeps 12-digit bank accounts from false-alarming most of the time.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1], [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1], [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(num: string): boolean {
  let c = 0;
  const digits = num.split("").reverse().map(Number);
  digits.forEach((d, i) => {
    c = D[c]![P[i % 8]![d]!]!;
  });
  return c === 0;
}

const AADHAAR_SHAPE = /(?<!\d)([2-9]\d{3})[ -]?(\d{4})[ -]?(\d{4})(?!\d)/g;

export function looksLikeAadhaar(text: string): boolean {
  for (const m of text.matchAll(AADHAAR_SHAPE)) {
    if (verhoeffValid(`${m[1]}${m[2]}${m[3]}`)) return true;
  }
  return false;
}

/** Deep scan of any JSON-ish value. `allowKeys` are fields known to hold other long digit strings (bank account numbers). */
export function containsAadhaar(value: unknown, allowKeys: readonly string[] = ["accountNumber", "account_number", "utr"]): boolean {
  if (typeof value === "string") return looksLikeAadhaar(value);
  if (typeof value === "number" || typeof value === "bigint") return looksLikeAadhaar(String(value));
  if (Array.isArray(value)) return value.some((v) => containsAadhaar(v, allowKeys));
  if (value && typeof value === "object") {
    return Object.entries(value).some(([k, v]) => !allowKeys.includes(k) && containsAadhaar(v, allowKeys));
  }
  return false;
}

export class AadhaarLeakError extends Error {
  constructor() {
    super("a full Aadhaar number must never be stored or sent to Excro");
  }
}
