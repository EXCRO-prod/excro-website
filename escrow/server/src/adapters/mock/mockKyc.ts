import { createHash } from "node:crypto";
import type { AadhaarOfflineResult, GstinResult, KycProvider, McaResult, PanResult, PennyDropResult, ScreeningResult } from "../kycProvider.js";
import { CIN_RE, GSTIN_RE, LLPIN_RE, PAN_RE } from "../../identity/identifiers.js";

// Mock rules (format checks + seeded signals so every review path can be exercised locally).
// GSTIN/CIN/LLPIN are rigidly formatted (fixed-length digit/letter positions, and a GSTIN's
// letters must equal the entity's own PAN), so there's no room to embed free-text trigger words
// the way PAN/name checks can — signals here live either in the one genuinely free-text field
// (expectedLegalName / expectedOfficerName) or as a reserved trailing-digit suffix, the same
// convention penny-drop already uses (9999 -> fail, 0000 -> mismatch):
//   PAN            valid if the format is right (4th letter is Excro's own business rule, checked
//                  by the caller before this is invoked); PANs starting ZZZZZ are "not found".
//   Aadhaar        name echoes the PAN name, unless it contains MISMATCH -> returns a different name (pending_review path).
//   Penny-drop     account ending 9999 -> fails; ending 0000 -> returns a different holder name; otherwise echoes the expected name.
//   Screening      name containing SANCTION or WATCHLIST -> a hit (high-risk review path).
//   GSTIN          format-valid; expectedLegalName containing INACTIVE -> not active; containing MISMATCH -> a different legal name.
//   MCA            format-valid CIN/LLPIN; regNo ending 000000 (CIN) / 0000 (LLPIN) -> status inactive;
//                  ending 999999 (CIN) / 9999 (LLPIN) -> found but no officers listed (so the
//                  signatory authority check falls back to the uploaded document).
// Nothing here calls a network. Real: Protean or another authorised KYC provider behind KycProvider.
const ref = (kind: string, seed: string) => `mock-${kind}-${createHash("sha256").update(seed).digest("hex").slice(0, 12)}`;

export class MockKycProvider implements KycProvider {
  async verifyPan({ pan, name }: { pan: string; name: string }): Promise<PanResult> {
    const providerRef = ref("pan", pan);
    if (!PAN_RE.test(pan) || pan.startsWith("ZZZZZ")) return { valid: false, providerRef };
    return { valid: true, nameOnPan: name.toUpperCase(), providerRef };
  }

  async aadhaarOffline({ consentRef, expectedName }: { consentRef: string; expectedName: string }): Promise<AadhaarOfflineResult> {
    const digits = createHash("sha256").update(consentRef + expectedName).digest("hex").replace(/[a-f]/g, "").padEnd(4, "7");
    return {
      name: /MISMATCH/i.test(expectedName) ? "SOMEONE ELSE ENTIRELY" : expectedName.toUpperCase(),
      dob: "1990-01-01",
      last4: digits.slice(0, 4),
      photoRef: ref("photo", consentRef),
      providerRef: ref("aadhaar", consentRef),
    };
  }

  async pennyDrop({ accountNumber, expectedName }: { accountNumber: string; ifsc: string; expectedName: string }): Promise<PennyDropResult> {
    const providerRef = ref("pd", accountNumber);
    if (accountNumber.endsWith("9999")) return { success: false, providerRef };
    if (accountNumber.endsWith("0000")) return { success: true, holderName: "UNKNOWN ACCOUNT HOLDER", providerRef };
    return { success: true, holderName: expectedName.toUpperCase(), providerRef };
  }

  async screen({ name }: { name: string }): Promise<ScreeningResult> {
    const hit = /SANCTION|WATCHLIST/i.test(name);
    return { hit, matches: hit ? [{ list: "MOCK-SANCTIONS", score: 0.97 }] : [], providerRef: ref("screen", name) };
  }

  async verifyGstin({ gstin, expectedLegalName }: { gstin: string; expectedLegalName: string }): Promise<GstinResult> {
    const providerRef = ref("gstin", gstin);
    if (!GSTIN_RE.test(gstin)) return { valid: false, providerRef };
    const active = !/INACTIVE/i.test(expectedLegalName);
    const legalName = /MISMATCH/i.test(expectedLegalName) ? "A DIFFERENTLY NAMED ENTITY" : expectedLegalName.toUpperCase();
    return { valid: true, active, legalName, providerRef };
  }

  async verifyMca({ regNo, type, expectedOfficerName }: { regNo: string; type: "CIN" | "LLPIN"; expectedOfficerName: string }): Promise<McaResult> {
    const providerRef = ref("mca", regNo);
    const formatOk = type === "CIN" ? CIN_RE.test(regNo) : LLPIN_RE.test(regNo);
    if (!formatOk) return { found: false, providerRef };
    const inactiveSuffix = type === "CIN" ? "000000" : "0000";
    const noDirSuffix = type === "CIN" ? "999999" : "9999";
    const status = regNo.endsWith(inactiveSuffix) ? "inactive" : "active";
    const officers = regNo.endsWith(noDirSuffix) ? [] : [expectedOfficerName.toUpperCase()];
    return { found: true, status, officers, providerRef };
  }
}
