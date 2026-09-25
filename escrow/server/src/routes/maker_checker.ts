import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { actorOrThrow } from "../auth/plugin.js";
import { requireStaff } from "../auth/actor.js";
import { sendError } from "../httpUtil.js";
import type { MakerChecker } from "../staff/makerChecker.js";

const decideBody = z.object({ mfaCode: z.string() });

export function registerMakerCheckerRoutes(app: FastifyInstance, ctx: AppContext, mc: MakerChecker): void {
  app.get("/v1/ops/maker-checker", async (req, reply) => {
    try {
      requireStaff(actorOrThrow(req));
      return await mc.listPending(ctx);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/ops/maker-checker/:id/approve", async (req, reply) => {
    try {
      const staff = requireStaff(actorOrThrow(req));
      await mc.approve(ctx, staff, (req.params as { id: string }).id, decideBody.parse(req.body).mfaCode);
      return { ok: true };
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/ops/maker-checker/:id/reject", async (req, reply) => {
    try {
      const staff = requireStaff(actorOrThrow(req));
      await mc.reject(ctx, staff, (req.params as { id: string }).id, decideBody.parse(req.body).mfaCode);
      return { ok: true };
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
