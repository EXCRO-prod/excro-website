// Everything works with no env vars set (mock mode). Every variable is documented in .env.example.
export interface Config {
  databaseUrl?: string;
  dataDir: string;
  port: number;
  isProduction: boolean;
  kycGate: "before_signing" | "before_drafting";
  /** 0 = KYC never expires. Real value is an Excro compliance decision, so it starts at zero. */
  kycValidityDays: number;
  /** Minimum name similarity (percent) to auto-pass a name comparison; below it goes to ops review. */
  nameMatchPassPct: number;
  mockMfaCode: string;
  /** If set, every OTP is this code (deterministic demos and e2e). Never set in production. */
  mockOtpCode?: string;
  otpTtlSeconds: number;
  otpMaxAttempts: number;
  sessionSecret: string;
  sessionTtlHours: number;
  /** Enables the tenant API-key actor (used to prove it can never act for a party). */
  tenantApiKey?: string;
}

const int = (v: string | undefined, d: number): number => {
  const n = v === undefined || v === "" ? d : Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`invalid integer env value: ${v}`);
  return n;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const gate = env.KYC_GATE ?? "before_signing";
  if (gate !== "before_signing" && gate !== "before_drafting") throw new Error(`KYC_GATE must be before_signing or before_drafting, got ${gate}`);
  const isProduction = env.NODE_ENV === "production";
  if (isProduction && (!env.SESSION_SECRET || env.MOCK_OTP_CODE)) throw new Error("production needs SESSION_SECRET and must not set MOCK_OTP_CODE");
  return {
    databaseUrl: env.DATABASE_URL || undefined,
    dataDir: env.PGLITE_DIR ?? ".data/pglite",
    port: int(env.PORT, 8787),
    isProduction,
    kycGate: gate,
    kycValidityDays: int(env.KYC_VALIDITY_DAYS, 0),
    nameMatchPassPct: int(env.NAME_MATCH_PASS_PCT, 80),
    mockMfaCode: env.MOCK_MFA_CODE ?? "000000",
    mockOtpCode: env.MOCK_OTP_CODE || undefined,
    otpTtlSeconds: int(env.OTP_TTL_SECONDS, 300),
    otpMaxAttempts: int(env.OTP_MAX_ATTEMPTS, 5),
    sessionSecret: env.SESSION_SECRET ?? "dev-only-session-secret-change-me",
    sessionTtlHours: int(env.SESSION_TTL_HOURS, 12),
    tenantApiKey: env.MOCK_TENANT_API_KEY || undefined,
  };
}
