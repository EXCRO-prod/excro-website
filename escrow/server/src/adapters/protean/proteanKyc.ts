import type { KycProvider } from "../kycProvider.js";

/**
 * TODO(protean): live KYC provider (PAN, Aadhaar offline / DigiLocker, penny-drop, screening,
 * GSTIN, MCA). Deliberately unimplemented: we do not guess Protean's API. Fill in from their
 * sandbox docs, keep credentials in env / Key Vault, and confirm in the contract that Excro's
 * Aadhaar route is covered (spec 13). The full Aadhaar number must never appear in a request,
 * response mapping, log or DB row. Confirm whether Protean itself offers GSTIN/MCA lookups or
 * whether those need a second authorised provider behind this same interface.
 */
export class ProteanKycProvider implements KycProvider {
  private todo(): never {
    throw new Error("ProteanKycProvider is not implemented yet: waiting for Protean sandbox access");
  }
  verifyPan(): never { return this.todo(); }
  aadhaarOffline(): never { return this.todo(); }
  pennyDrop(): never { return this.todo(); }
  screen(): never { return this.todo(); }
  verifyGstin(): never { return this.todo(); }
  verifyMca(): never { return this.todo(); }
}
