// Fastify decorator: resolves the bearer token (if any) into an Actor, or a tenant API key.
// Routes call requireParty/requireStaff (auth/actor.ts) to enforce who may do what.
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { AppContext } from "../context.js";
import { unauthorized } from "../errors.js";
import type { Actor } from "./actor.js";
import { verifyToken } from "./session.js";

declare module "fastify" {
  interface FastifyRequest {
    actor?: Actor;
  }
}

export function registerAuth(app: FastifyInstance, ctx: AppContext): void {
  app.decorateRequest("actor", undefined);
  app.addHook("onRequest", async (req: FastifyRequest) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      req.actor = verifyToken(ctx.config.sessionSecret, auth.slice(7), ctx.clock.now());
      return;
    }
    const apiKey = req.headers["x-excro-api-key"];
    if (typeof apiKey === "string" && ctx.config.tenantApiKey && apiKey === ctx.config.tenantApiKey) {
      req.actor = { kind: "tenant_api", tenantId: "direct" };
    }
  });
}

export function actorOrThrow(req: FastifyRequest): Actor {
  if (!req.actor) throw unauthorized();
  return req.actor;
}
