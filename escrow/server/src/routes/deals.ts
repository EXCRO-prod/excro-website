import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { actorOrThrow } from "../auth/plugin.js";
import { requireParty } from "../auth/actor.js";
import { sendError } from "../httpUtil.js";
import { ROLES } from "../domain/schedule.js";
import {
  createDeal, getDeal, getDealAudit, getReadiness, joinDeal, listDeals, replaceParties, restartDeal, selectParty, startDeal,
} from "../deals/service.js";

const partyInput = z.object({
  ref: z.string().min(1),
  role: z.enum(ROLES),
  label: z.string().min(1),
  mobile: z.string(),
  email: z.string(),
  depositShareBps: z.number().int().min(0).max(10_000).optional(),
  feeRule: z.object({ bps: z.number().int().min(0).max(10_000).optional(), fixedMinor: z.string().optional() }).optional(),
});
const commissionInput = z.object({
  amount: z.unknown(),
  gst: z.unknown(),
  payers: z.array(z.object({ ref: z.string(), shareBps: z.number().int() })),
  collect: z.unknown(),
  onFailure: z.unknown(),
  nonRefundableFixedMinor: z.string().optional(),
});
const createBody = z.object({ parties: z.array(partyInput).min(2).max(10), commission: commissionInput.optional() });
const joinBody = z.object({ token: z.string().min(1) });
const startBody = z.object({ flow: z.enum(["A", "B"]) });
const selectPartyBody = z.object({ partyId: z.string().min(1) });

export function registerDealRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.post("/v1/deals", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await createDeal(ctx, actor.accountId, createBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/deals", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await listDeals(ctx, actor.accountId);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/deals/:id", async (req, reply) => {
    try {
      const actor = actorOrThrow(req);
      return await getDeal(ctx, actor, (req.params as { id: string }).id);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.put("/v1/deals/:id/parties", async (req, reply) => {
    try {
      const actor = actorOrThrow(req);
      await replaceParties(ctx, actor, (req.params as { id: string }).id, createBody.parse(req.body));
      return { ok: true };
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/deals/:id/parties:join", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await joinDeal(ctx, actor.accountId, (req.params as { id: string }).id, joinBody.parse(req.body).token);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/deals/:id/participants/:participantId/party", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      const { id, participantId } = req.params as { id: string; participantId: string };
      await selectParty(ctx, actor.accountId, id, participantId, selectPartyBody.parse(req.body).partyId);
      return { ok: true };
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/deals/:id/readiness", async (req, reply) => {
    try {
      const actor = actorOrThrow(req);
      return await getReadiness(ctx, actor, (req.params as { id: string }).id);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/deals/:id/start", async (req, reply) => {
    try {
      const actor = actorOrThrow(req);
      return await startDeal(ctx, actor, (req.params as { id: string }).id, startBody.parse(req.body).flow);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/deals/:id/restart", async (req, reply) => {
    try {
      const actor = actorOrThrow(req);
      return await restartDeal(ctx, actor, (req.params as { id: string }).id);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/deals/:id/audit", async (req, reply) => {
    try {
      const actor = actorOrThrow(req);
      return await getDealAudit(ctx, actor, (req.params as { id: string }).id);
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
