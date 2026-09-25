// Dev/demo only: lets the web app's outbox drawer show mock OTP codes and invite codes that the
// MockNotifier wrote to `mock_outbox`. Never registered in production, where real channels deliver them.
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context.js";
import { sendError } from "../httpUtil.js";

export function registerDevRoutes(app: FastifyInstance, ctx: AppContext): void {
  if (ctx.config.isProduction) return;
  app.get("/v1/dev/outbox", async (_req, reply) => {
    try {
      const rows = await ctx.db.query<{ id: string | number; channel: string; to_addr: string; subject: string; body: string; created_at: Date }>(
        "select id, channel, to_addr, subject, body, created_at from mock_outbox order by id desc limit 50",
      );
      return rows.map((r) => ({ id: String(r.id), channel: r.channel, to: r.to_addr, subject: r.subject, body: r.body, at: r.created_at.toISOString() }));
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
