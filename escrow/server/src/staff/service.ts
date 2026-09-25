import { safeEqual, issueToken } from "../auth/session.js";
import { appendAudit } from "../audit/chain.js";
import type { AppContext } from "../context.js";
import type { Queryable } from "../db/types.js";
import { HttpError, unauthorized } from "../errors.js";

export interface StaffSeed {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

// Local demo staff. The two ops_kyc users exist so maker-checker (two distinct identities) can be demonstrated;
// admin has the same role and NO bypass: admins cannot approve their own proposals either.
export const SEED_STAFF: StaffSeed[] = [
  { id: "stf_maker", email: "ops.maker@excro.local", name: "Ops Maker", roles: ["ops_kyc"] },
  { id: "stf_checker", email: "ops.checker@excro.local", name: "Ops Checker", roles: ["ops_kyc"] },
  { id: "stf_admin", email: "ops.admin@excro.local", name: "Ops Admin", roles: ["admin", "ops_kyc"] },
];

export async function seedStaff(q: Queryable, at: Date, staff: StaffSeed[] = SEED_STAFF): Promise<void> {
  for (const s of staff) {
    await q.query("insert into staff_users (id, email, name, roles, created_at) values ($1,$2,$3,$4,$5) on conflict (id) do nothing", [s.id, s.email, s.name, s.roles, at.toISOString()]);
  }
}

/** Mock MFA: a fixed code from env. Real: Entra ID phishing-resistant MFA with PIM (spec 06). */
export const mfaOk = (ctx: AppContext, code: string): boolean => safeEqual(ctx.config.mockMfaCode, code);

export async function staffLogin(ctx: AppContext, input: { email: string; mfaCode: string }): Promise<{ token: string; staffId: string; roles: string[] }> {
  const row = (await ctx.db.query<{ id: string; email: string; roles: string[] }>("select id, email, roles from staff_users where email = $1", [input.email.trim().toLowerCase()]))[0];
  // Same answer for unknown user and wrong code so login cannot enumerate staff.
  if (!row || !mfaOk(ctx, input.mfaCode)) throw unauthorized("invalid staff credentials");
  const now = ctx.clock.now();
  await ctx.db.tx((q) => appendAudit(q, { actor: `staff:${row.id}`, action: "staff.login", detail: { staffId: row.id }, at: now }));
  return { staffId: row.id, roles: row.roles, token: issueToken(ctx.config.sessionSecret, { kind: "staff", staffId: row.id, email: row.email, roles: row.roles }, now, ctx.config.sessionTtlHours) };
}

export const mfaRequired = (): HttpError => new HttpError(403, "mfa_failed", "MFA code is not valid");
