import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bearer, makeTestApp, signUpAndVerify, type TestHarness } from "./testApp.js";

let h: TestHarness;
beforeEach(async () => { h = await makeTestApp(); });
afterEach(async () => { await h.close(); });

describe("signup and login", () => {
  it("needs both mobile and email OTP before a session token is issued", async () => {
    await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile: "9876543210", email: "a@b.com" } });
    const mobileOnly = await h.json<{ mobileVerified: boolean; emailVerified: boolean; token?: string }>({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile: "9876543210", channel: "mobile", code: "111111" } });
    expect(mobileOnly.body.mobileVerified).toBe(true);
    expect(mobileOnly.body.token).toBeUndefined();
    const both = await h.json<{ token?: string }>({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile: "9876543210", channel: "email", code: "111111" } });
    expect(both.body.token).toBeTruthy();
  });

  it("rejects a wrong OTP and counts the attempt", async () => {
    await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile: "9876543210", email: "a@b.com" } });
    const bad = await h.json({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile: "9876543210", channel: "mobile", code: "000000" } });
    expect(bad.status).toBe(400);
    const good = await h.json<{ mobileVerified: boolean }>({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile: "9876543210", channel: "mobile", code: "111111" } });
    expect(good.body.mobileVerified).toBe(true);
  });

  it("locks after too many wrong attempts", async () => {
    await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile: "9876543210", email: "a@b.com" } });
    for (let i = 0; i < 5; i++) await h.json({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile: "9876543210", channel: "mobile", code: "999999" } });
    const locked = await h.json({ method: "POST", url: "/v1/accounts/signup:verify", payload: { mobile: "9876543210", channel: "mobile", code: "111111" } });
    expect(locked.status).toBe(429);
  });

  it("rejects malformed mobile and email", async () => {
    const bad1 = await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile: "123", email: "a@b.com" } });
    expect(bad1.status).toBe(400);
    const bad2 = await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile: "9876543210", email: "not-an-email" } });
    expect(bad2.status).toBe(400);
  });

  it("full sign-up then login by mobile OTP", async () => {
    const { accountId, token } = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    expect(accountId).toMatch(/^acc_/);
    const me = await h.json<{ mobile: string; mobileVerified: boolean }>({ method: "GET", url: "/v1/accounts/me", headers: bearer(token) });
    expect(me.body).toMatchObject({ mobile: "9876543210", mobileVerified: true });

    await h.json({ method: "POST", url: "/v1/auth/login:request-otp", payload: { mobile: "9876543210" } });
    const login = await h.json<{ token: string; accountId: string }>({ method: "POST", url: "/v1/auth/login:verify", payload: { mobile: "9876543210", code: "111111" } });
    expect(login.body.accountId).toBe(accountId);
  });

  it("login-request-otp never reveals whether an account exists", async () => {
    const known = await h.json({ method: "POST", url: "/v1/auth/login:request-otp", payload: { mobile: "9000000000" } });
    const unknown = await h.json({ method: "POST", url: "/v1/auth/login:request-otp", payload: { mobile: "9111111111" } });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    // and no OTP was actually issued for the unknown number
    const loginAttempt = await h.json({ method: "POST", url: "/v1/auth/login:verify", payload: { mobile: "9111111111", code: "111111" } });
    expect(loginAttempt.status).toBe(400);
  });

  it("routes reject a missing or malformed bearer token", async () => {
    const noAuth = await h.json({ method: "GET", url: "/v1/accounts/me" });
    expect(noAuth.status).toBe(401);
    const badToken = await h.json({ method: "GET", url: "/v1/accounts/me", headers: bearer("garbage") });
    expect(badToken.status).toBe(401);
  });

  it("a tenant API key can authenticate but is not a party session", async () => {
    const h2 = await makeTestApp({ MOCK_TENANT_API_KEY: "tenant-secret" });
    try {
      const r = await h2.json({ method: "GET", url: "/v1/accounts/me", headers: { "x-excro-api-key": "tenant-secret" } });
      expect(r.status).toBe(403); // requireParty refuses a tenant_api actor
    } finally {
      await h2.close();
    }
  });
});

describe("readiness endpoint", () => {
  it("is 404 to someone who is not a deal participant", async () => {
    const buyer = await signUpAndVerify(h, "9876543210", "buyer@example.com");
    const stranger = await signUpAndVerify(h, "9000000001", "stranger@example.com");
    const create = await h.json<{ dealId: string }>({
      method: "POST", url: "/v1/deals", headers: bearer(buyer.token),
      payload: { parties: [
        { ref: "b", role: "payer", label: "Buyer", mobile: "9876543210", email: "buyer@example.com", depositShareBps: 10_000 },
        { ref: "s", role: "payee", label: "Seller", mobile: "9111111111", email: "seller@example.com" },
      ] },
    });
    const denied = await h.json({ method: "GET", url: `/v1/deals/${create.body.dealId}/readiness`, headers: bearer(stranger.token) });
    expect(denied.status).toBe(404);
  });
});
