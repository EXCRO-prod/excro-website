import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makeTestApp, type TestHarness } from "./testApp.js";

let h: TestHarness;
afterEach(async () => { await h.close(); });

describe("dev outbox outside production", () => {
  beforeEach(async () => { h = await makeTestApp(); });

  it("shows mock messages (OTP codes)", async () => {
    await h.json({ method: "POST", url: "/v1/accounts/signup", payload: { mobile: "9876543210", email: "a@b.com" } });
    const r = await h.json<{ channel: string; body: string }[]>({ method: "GET", url: "/v1/dev/outbox" });
    expect(r.status).toBe(200);
    expect(r.body.some((m) => m.channel === "sms" && m.body.includes("111111"))).toBe(true);
  });
});

describe("dev outbox in production", () => {
  beforeEach(async () => { h = await makeTestApp({ NODE_ENV: "production", SESSION_SECRET: "prod-secret", MOCK_OTP_CODE: "" }); });

  it("does not exist", async () => {
    const r = await h.json({ method: "GET", url: "/v1/dev/outbox" });
    expect(r.status).toBe(404);
  });
});
