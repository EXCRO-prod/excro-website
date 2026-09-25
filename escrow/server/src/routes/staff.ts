import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { sendError } from "../httpUtil.js";
import { staffLogin } from "../staff/service.js";

const loginBody = z.object({ email: z.string(), mfaCode: z.string() });

export function registerStaffRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/v1/staff/login", async (req, reply) => {
    try {
      return await staffLogin(ctx, loginBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
