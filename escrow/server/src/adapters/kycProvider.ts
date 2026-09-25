// KycProvider adapter (spec 13). One interface for PAN, Aadhaar (offline), penny-drop and screening.
// Real implementation: Protean or another authorised KYC service provider. Never returns or accepts a full Aadhaar number.

export interface PanResult {
  valid: boolean;
  nameOnPan?: string;
  providerRef: string;
}

export interface AadhaarOfflineResult {
  name: string;
  dob: string; // YYYY-MM-DD
  last4: string;
  photoRef: string;
  providerRef: string;
}

export interface PennyDropResult {
  success: boolean;
  holderName?: string;
  providerRef: string;
}

export interface ScreeningResult {
  hit: boolean;
  matches: { list: string; score: number }[];
  providerRef: string;
}

export interface GstinResult {
  valid: boolean;
  active?: boolean;
  legalName?: string;
  providerRef: string;
}

export interface McaResult {
  found: boolean;
  status?: "active" | "inactive";
  /** Directors (company) or designated partners (LLP), as MCA shows them. */
  officers?: string[];
  providerRef: string;
}

export interface KycProvider {
  verifyPan(req: { pan: string; name: string }): Promise<PanResult>;
  /** `consentRef` is the DigiLocker / offline e-KYC consent handle, never an Aadhaar number. */
  aadhaarOffline(req: { consentRef: string; expectedName: string }): Promise<AadhaarOfflineResult>;
  pennyDrop(req: { accountNumber: string; ifsc: string; expectedName: string }): Promise<PennyDropResult>;
  screen(req: { name: string; dob?: string; pan?: string }): Promise<ScreeningResult>;
  verifyGstin(req: { gstin: string; expectedLegalName: string }): Promise<GstinResult>;
  verifyMca(req: { regNo: string; type: "CIN" | "LLPIN"; expectedOfficerName: string }): Promise<McaResult>;
}
