import { issueToken } from "../auth/session.js";
import { auditActor } from "../auth/actor.js";
import { appendAudit } from "../audit/chain.js";
import type { AppContext } from "../context.js";
import { fail, ok, txThenThrow } from "../db/util.js";
import { badRequest, conflict, HttpError } from "../errors.js";
import { newId } from "../ids.js";
import { normaliseEmail, normaliseMobile } from "../identity/identifiers.js";
import { checkOtp, issueOtp, type Channel, type OtpCheck } from "./otp.js";

interface AccountRow {
  id: string;
  mobile: string;
  email: string;
  mobile_verified_at: Date | null;
  email_verified_at: Date | null;
}

const otpError = (r: Exclude<OtpCheck, "ok">): HttpError =>
  r === "locked" ? new HttpError(429, "otp_locked", "too many wrong codes; request a new one") : badRequest(r === "expired" ? "otp_expired" : "otp_invalid", "that code is not valid");

/** Sign-up: mobile and email must each be OTP-verified before the account can be used (spec 13). */
export async function signup(ctx: AppContext, input: { mobile: string; email: string }): Promise<{ accountId: string }> {
  const mobile = normaliseMobile(input.mobile);
  const email = normaliseEmail(input.email);
  if (!mobile) throw badRequest("invalid_mobile", "enter a 10-digit Indian mobile number");
  if (!email) throw badRequest("invalid_email", "enter a valid email address");
  return txThenThrow(ctx.db, async (q) => {
    const existing = await q.query<AccountRow>("select * from accounts where mobile = $1 or email = $2", [mobile, email]);
    const now = ctx.clock.now();
    let id: string;
    if (existing.length > 1 || (existing[0] && (existing[0].mobile !== mobile || existing[0].email !== email))) return fail(conflict("account_exists", "that mobile or email already belongs to an account"));
    if (existing[0]) {
      if (existing[0].mobile_verified_at && existing[0].email_verified_at) return fail(conflict("account_exists", "an account with these details already exists; sign in instead"));
      id = existing[0].id;
    } else {
      id = newId("acc");
      await q.query("insert into accounts (id, mobile, email, created_at) values ($1,$2,$3,$4)", [id, mobile, email, now.toISOString()]);
      await appendAudit(q, { actor: "system", action: "account.created", after: { id }, detail: { accountId: id }, at: now });
    }
    await issueOtp(ctx, q, mobile, "mobile", "signup");
    await issueOtp(ctx, q, email, "email", "signup");
    return ok({ accountId: id });
  });
}

export async function verifySignup(ctx: AppContext, input: { mobile: string; channel: Channel; code: string }): Promise<{ mobileVerified: boolean; emailVerified: boolean; token?: string }> {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw badRequest("invalid_mobile", "enter a 10-digit Indian mobile number");
  return txThenThrow(ctx.db, async (q) => {
    const acc = (await q.query<AccountRow>("select * from accounts where mobile = $1", [mobile]))[0];
    if (!acc) return fail(badRequest("otp_invalid", "that code is not valid"));
    const target = input.channel === "mobile" ? acc.mobile : acc.email;
    const res = await checkOtp(ctx, q, target, input.channel, "signup", input.code);
    if (res !== "ok") return fail(otpError(res));
    const now = ctx.clock.now();
    const col = input.channel === "mobile" ? "mobile_verified_at" : "email_verified_at";
    await q.query(`update accounts set ${col} = $1 where id = $2 and ${col} is null`, [now.toISOString(), acc.id]);
    await appendAudit(q, { actor: `account:${acc.id}`, action: `account.${input.channel}_verified`, detail: { accountId: acc.id }, at: now });
    const fresh = (await q.query<AccountRow>("select * from accounts where id = $1", [acc.id]))[0]!;
    const both = !!fresh.mobile_verified_at && !!fresh.email_verified_at;
    return ok({
      mobileVerified: !!fresh.mobile_verified_at,
      emailVerified: !!fresh.email_verified_at,
      ...(both ? { token: issueToken(ctx.config.sessionSecret, { kind: "party", accountId: acc.id }, now, ctx.config.sessionTtlHours) } : {}),
    });
  });
}

/** Always succeeds from the caller's view, so it cannot be used to discover which mobiles have accounts. */
export async function requestLoginOtp(ctx: AppContext, input: { mobile: string }): Promise<void> {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw badRequest("invalid_mobile", "enter a 10-digit Indian mobile number");
  await ctx.db.tx(async (q) => {
    const acc = (await q.query<AccountRow>("select * from accounts where mobile = $1", [mobile]))[0];
    if (acc?.mobile_verified_at && acc.email_verified_at) await issueOtp(ctx, q, mobile, "mobile", "login");
  });
}

export async function verifyLogin(ctx: AppContext, input: { mobile: string; code: string }): Promise<{ token: string; accountId: string }> {
  const mobile = normaliseMobile(input.mobile);
  if (!mobile) throw badRequest("invalid_mobile", "enter a 10-digit Indian mobile number");
  return txThenThrow(ctx.db, async (q) => {
    const acc = (await q.query<AccountRow>("select * from accounts where mobile = $1", [mobile]))[0];
    if (!acc?.mobile_verified_at || !acc.email_verified_at) return fail(badRequest("otp_invalid", "that code is not valid"));
    const res = await checkOtp(ctx, q, mobile, "mobile", "login", input.code);
    if (res !== "ok") return fail(otpError(res));
    const now = ctx.clock.now();
    await appendAudit(q, { actor: auditActor({ kind: "party", accountId: acc.id }), action: "auth.login", detail: { accountId: acc.id }, at: now });
    return ok({ accountId: acc.id, token: issueToken(ctx.config.sessionSecret, { kind: "party", accountId: acc.id }, now, ctx.config.sessionTtlHours) });
  });
}

export interface AccountView {
  id: string;
  mobile: string;
  email: string;
  mobileVerified: boolean;
  emailVerified: boolean;
}

export async function getAccount(ctx: AppContext, accountId: string): Promise<AccountRow | undefined> {
  return (await ctx.db.query<AccountRow>("select * from accounts where id = $1", [accountId]))[0];
}
