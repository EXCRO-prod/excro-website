import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { requestLoginOtp, signup, verifyLogin, verifySignup, getAccount } from "../accounts/service.js";
import { actorOrThrow } from "../auth/plugin.js";
import { requireParty } from "../auth/actor.js";
import { sendError } from "../httpUtil.js";
import { z } from "zod";

const signupBody = z.object({ mobile: z.string(), email: z.string() });
const verifyBody = z.object({ mobile: z.string(), channel: z.enum(["mobile", "email"]), code: z.string() });
const loginRequestBody = z.object({ mobile: z.string() });
const loginVerifyBody = z.object({ mobile: z.string(), code: z.string() });

export function registerAccountRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/v1/accounts/signup", async (req, reply) => {
    try {
      return await signup(ctx, signupBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/accounts/signup:verify", async (req, reply) => {
    try {
      return await verifySignup(ctx, verifyBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/auth/login:request-otp", async (req, reply) => {
    try {
      await requestLoginOtp(ctx, loginRequestBody.parse(req.body));
      return { ok: true };
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/auth/login:verify", async (req, reply) => {
    try {
      return await verifyLogin(ctx, loginVerifyBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/accounts/me", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      const a = await getAccount(ctx, actor.accountId);
      if (!a) return reply.code(404).send({ error: "not_found" });
      return { id: a.id, mobile: a.mobile, email: a.email, mobileVerified: !!a.mobile_verified_at, emailVerified: !!a.email_verified_at };
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
