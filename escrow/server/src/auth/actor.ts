// Who is acting. Consent actions (tick, sign, accept, dispute, join) accept ONLY a party actor:
// a tenant API key or an Ops user can never act on a party's behalf (CLAUDE.md, spec 08).
import { forbidden } from "../errors.js";

export type Actor =
  | { kind: "party"; accountId: string }
  | { kind: "staff"; staffId: string; email: string; roles: string[] }
  | { kind: "tenant_api"; tenantId: string };

export function requireParty(actor: Actor): Extract<Actor, { kind: "party" }> {
  if (actor.kind !== "party") throw forbidden("party_session_required", "this action needs the party's own signed-in session");
  return actor;
}

export function requireStaff(actor: Actor, role?: string): Extract<Actor, { kind: "staff" }> {
  if (actor.kind !== "staff") throw forbidden("staff_required", "Excro staff only");
  if (role && !actor.roles.includes(role)) throw forbidden("missing_role", `staff role ${role} required`);
  return actor;
}

export const auditActor = (a: Actor): string =>
  a.kind === "party" ? `account:${a.accountId}` : a.kind === "staff" ? `staff:${a.staffId}` : `tenant:${a.tenantId}`;
