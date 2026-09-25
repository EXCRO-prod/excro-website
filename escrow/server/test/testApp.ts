// Test harness: a real Fastify app over an in-memory PGlite database, with the mock adapters and a
// controllable clock. Every milestone-0a integration test drives the actual HTTP surface, not the
// service functions directly, so it proves the routes, auth and DB wiring together.
import type { FastifyInstance, InjectOptions } from "fastify";
import { buildApp } from "../src/app.js";
import { FixedClock } from "../src/adapters/clock.js";
import { MockKycProvider } from "../src/adapters/mock/mockKyc.js";
import { MockNotifier } from "../src/adapters/mock/mockNotifier.js";
import { loadConfig } from "../src/config.js";
import type { AppContext } from "../src/context.js";
import { openDb } from "../src/db/index.js";
import { seedStaff } from "../src/staff/service.js";
import type { MakerChecker } from "../src/staff/makerChecker.js";

export interface TestHarness {
  app: FastifyInstance;
  ctx: AppContext;
  clock: FixedClock;
  makerChecker: MakerChecker;
  json<T = unknown>(opts: InjectOptions): Promise<{ status: number; body: T }>;
  close(): Promise<void>;
}

export async function makeTestApp(env: Record<string, string> = {}): Promise<TestHarness> {
  const config = loadConfig({ ...process.env, PGLITE_DIR: ":memory:", MOCK_OTP_CODE: "111111", MOCK_MFA_CODE: "000000", ...env });
  const db = await openDb(config);
  const clock = new FixedClock(new Date("2026-09-22T10:00:00+05:30"));
  await db.tx((q) => seedStaff(q, clock.now()));
  const ctx: AppContext = { db, clock, notifier: new MockNotifier(() => {}), kyc: new MockKycProvider(), config };
  const { app, makerChecker } = buildApp(ctx);
  await app.ready();
  return {
    app,
    ctx,
    clock,
    makerChecker,
    async json<T>(opts: InjectOptions) {
      const res = await app.inject(opts);
      return { status: res.statusCode, body: (res.payload ? JSON.parse(res.payload) : undefined) as T };
    },
    close: () => db.close(),
  };
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Full sign-up (mobile + email OTP), returns a ready session token. */
export async function signUpAndVerify(h: TestHarness, mobile: string, email: string): Promise<{ accountId: string; token: string }> {
  await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile, email } });
  await h.json({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile, channel: "mobile", code: "111111" } });
  const e = await h.json<{ token?: string }>({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile, channel: "email", code: "111111" } });
  const token = e.body.token;
  if (!token) throw new Error("signup did not complete");
  const me = await h.json<{ id: string }>({ method: "GET", url: "/v1/accounts/me", headers: bearer(token) });
  return { accountId: me.body.id, token };
}

/** Drives a party through PAN -> Aadhaar -> bank -> submit, expecting a clean `verified` result. Each
 * step's status is checked so a broken step fails loudly here instead of cascading into a confusing
 * error from a later, unrelated call. */
export async function verifyIndividual(h: TestHarness, token: string, pan: string, fullName: string, accountNumber: string, ifsc = "HDFC0001234"): Promise<void> {
  const step = async (label: string, opts: InjectOptions) => {
    const r = await h.json<Record<string, unknown>>({ ...opts, headers: bearer(token) });
    if (r.status >= 400) throw new Error(`verifyIndividual: ${label} failed: ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  };
  await step("start", { method: "POST", url: "/v1/kyc/individual", payload: { pan, fullName } });
  await step("aadhaar", { method: "POST", url: "/v1/kyc/individual/aadhaar", payload: { consentRef: `consent-${pan}` } });
  await step("bank", { method: "POST", url: "/v1/kyc/individual/bank-account", payload: { accountNumber, ifsc } });
  const r = await step("submit", { method: "POST", url: "/v1/kyc/individual:submit" }) as { status: string };
  if (r.status !== "verified") throw new Error(`expected verified, got ${JSON.stringify(r)}`);
}
