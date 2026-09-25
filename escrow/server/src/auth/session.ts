// Signed bearer tokens (HMAC-SHA256). Local stand-in for Entra External ID (customers) / Entra ID (staff).
import { createHmac, timingSafeEqual } from "node:crypto";
import { unauthorized } from "../errors.js";
import type { Actor } from "./actor.js";

type TokenBody =
  | { k: "party"; sub: string; exp: number }
  | { k: "staff"; sub: string; email: string; roles: string[]; exp: number };

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest();

export function issueToken(secret: string, actor: Extract<Actor, { kind: "party" | "staff" }>, now: Date, ttlHours: number): string {
  const exp = Math.floor(now.getTime() / 1000) + ttlHours * 3600;
  const body: TokenBody = actor.kind === "party" ? { k: "party", sub: actor.accountId, exp } : { k: "staff", sub: actor.staffId, email: actor.email, roles: actor.roles, exp };
  const payload = b64(JSON.stringify(body));
  return `v1.${payload}.${b64(sign(secret, payload))}`;
}

export function verifyToken(secret: string, token: string, now: Date): Actor {
  const [v, payload, sig] = token.split(".");
  if (v !== "v1" || !payload || !sig) throw unauthorized("malformed token");
  const expected = sign(secret, payload);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw unauthorized("bad token signature");
  const body = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenBody;
  if (body.exp * 1000 <= now.getTime()) throw unauthorized("session expired");
  return body.k === "party" ? { kind: "party", accountId: body.sub } : { kind: "staff", staffId: body.sub, email: body.email, roles: body.roles };
}

/** Constant-time string compare for OTP and MFA codes. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
