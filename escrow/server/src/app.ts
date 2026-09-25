import Fastify, { type FastifyInstance } from "fastify";
import { registerAuth } from "./auth/plugin.js";
import type { AppContext } from "./context.js";
import { registerAccountRoutes } from "./routes/accounts.js";
import { registerDealRoutes } from "./routes/deals.js";
import { registerKycRoutes } from "./routes/kyc.js";
import { registerMakerCheckerRoutes } from "./routes/maker_checker.js";
import { registerStaffRoutes } from "./routes/staff.js";
import { registerDevRoutes } from "./routes/dev.js";
import { MakerChecker } from "./staff/makerChecker.js";
import { registerKycHandlers } from "./kyc/review.js";
import { verifyChain } from "./audit/chain.js";
import { sendError } from "./httpUtil.js";

export function buildApp(ctx: AppContext): { app: FastifyInstance; makerChecker: MakerChecker } {
  const app = Fastify({ logger: false });
  registerAuth(app, ctx);

  const makerChecker = new MakerChecker();
  registerKycHandlers(makerChecker);

  registerAccountRoutes(app, ctx);
  registerKycRoutes(app, ctx, makerChecker);
  registerDealRoutes(app, ctx);
  registerStaffRoutes(app, ctx);
  registerMakerCheckerRoutes(app, ctx, makerChecker);
  registerDevRoutes(app, ctx);

  app.get("/v1/audit:verify", async (_req, reply) => {
    try {
      return await verifyChain(ctx.db);
    } catch (e) {
      return sendError(reply, e);
    }
  });
  app.get("/healthz", async () => ({ ok: true }));

  return { app, makerChecker };
}
