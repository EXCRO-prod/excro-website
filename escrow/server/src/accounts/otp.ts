import { randomInt } from "node:crypto";
import { safeEqual } from "../auth/session.js";
import type { Queryable } from "../db/types.js";
import type { AppContext } from "../context.js";
import { newId } from "../ids.js";
import { sha256Hex } from "../util/canonical.js";

export type Channel = "mobile" | "email";
export type Purpose = "signup" | "login";

const hash = (id: string, code: string) => sha256Hex(`${id}:${code}`);

/** Replaces any earlier live challenge for the same target/purpose, then sends a fresh code. */
export async function issueOtp(ctx: AppContext, q: Queryable, target: string, channel: Channel, purpose: Purpose): Promise<void> {
  const now = ctx.clock.now();
  await q.query("update otp_challenges set consumed_at = $1 where target = $2 and channel = $3 and purpose = $4 and consumed_at is null", [now.toISOString(), target, channel, purpose]);
  const code = ctx.config.mockOtpCode ?? String(randomInt(100_000, 1_000_000));
  const id = newId("otp");
  const expires = new Date(now.getTime() + ctx.config.otpTtlSeconds * 1000);
  await q.query("insert into otp_challenges (id, target, channel, purpose, code_hash, expires_at, created_at) values ($1,$2,$3,$4,$5,$6,$7)", [id, target, channel, purpose, hash(id, code), expires.toISOString(), now.toISOString()]);
  await ctx.notifier.send(q, { channel: channel === "mobile" ? "sms" : "email", to: target, subject: "Your Excro verification code", body: `Your Excro code is ${code}. It expires in ${Math.round(ctx.config.otpTtlSeconds / 60)} minutes.` }, now);
}

export type OtpCheck = "ok" | "invalid" | "expired" | "locked";

/** Counts every wrong guess (persisted by the caller committing), and locks the challenge after too many. */
export async function checkOtp(ctx: AppContext, q: Queryable, target: string, channel: Channel, purpose: Purpose, code: string): Promise<OtpCheck> {
  const rows = await q.query<{ id: string; code_hash: string; attempts: number; expires_at: Date }>(
    "select id, code_hash, attempts, expires_at from otp_challenges where target = $1 and channel = $2 and purpose = $3 and consumed_at is null order by created_at desc limit 1",
    [target, channel, purpose],
  );
  const c = rows[0];
  if (!c) return "invalid";
  const now = ctx.clock.now();
  if (c.expires_at.getTime() <= now.getTime()) return "expired";
  if (c.attempts >= ctx.config.otpMaxAttempts) return "locked";
  if (!safeEqual(c.code_hash, hash(c.id, code))) {
    await q.query("update otp_challenges set attempts = attempts + 1 where id = $1", [c.id]);
    return "invalid";
  }
  await q.query("update otp_challenges set consumed_at = $1 where id = $2", [now.toISOString(), c.id]);
  return "ok";
}
