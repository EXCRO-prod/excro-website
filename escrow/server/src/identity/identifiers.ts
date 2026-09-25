// Format checks shared by the API and the mock KYC provider. Format only: real verification is the provider's job.

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_NO_RE = /^\d{9,18}$/;
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const CIN_RE = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
export const LLPIN_RE = /^[A-Z]{3}-?[0-9]{4}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The PAN a GSTIN embeds (characters 3-12), which must equal the entity's own PAN. */
export const panFromGstin = (gstin: string): string => gstin.slice(2, 12);

/**
 * "+91 98765 43210" / "098765-43210" / "9876543210" -> "9876543210", or null.
 * Only strips a country-code / trunk prefix when the total length says one is present, so a
 * plain 10-digit number that happens to start with "91" (e.g. 9111111111) is never mistaken for one.
 */
export function normaliseMobile(input: string): string | null {
  let d = input.replace(/[\s()-]/g, "");
  if (d.startsWith("+91") && d.length === 13) d = d.slice(3);
  else if (d.startsWith("91") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return MOBILE_RE.test(d) ? d : null;
}

export function normaliseEmail(input: string): string | null {
  const e = input.trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : null;
}

/** Individual PANs have 'P' as the fourth character. */
export const isIndividualPan = (pan: string): boolean => PAN_RE.test(pan) && pan[3] === "P";

/** The PAN holder-type letter (4th character) an entity type's own PAN must carry. Proprietorships
 * have no entity PAN of their own — they use the proprietor's individual ('P') PAN. */
export function entityPanLetter(type: "company" | "llp" | "partnership" | "trust"): string {
  return { company: "C", llp: "F", partnership: "F", trust: "T" }[type];
}
export const isEntityPan = (pan: string, type: "company" | "llp" | "partnership" | "trust"): boolean =>
  PAN_RE.test(pan) && pan[3] === entityPanLetter(type);

export const maskMobile = (m: string): string => `+91 ${"*".repeat(6)}${m.slice(-4)}`;
export const maskPan = (pan: string): string => `*****${pan.slice(5, 9)}${pan.slice(9)}`;
export const maskAadhaar = (last4: string): string => `XXXX XXXX ${last4}`;
export const maskAccount = (last4: string): string => `••••${last4}`;
export const maskEmail = (e: string): string => e.replace(/^(.).*(@.*)$/, "$1***$2");
export const maskGstin = (gstin: string): string => `${gstin.slice(0, 2)}*********${gstin.slice(-3)}`;
