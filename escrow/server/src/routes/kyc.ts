import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context.js";
import { actorOrThrow } from "../auth/plugin.js";
import { requireParty, requireStaff } from "../auth/actor.js";
import { sendError } from "../httpUtil.js";
import { addBankAccount, aadhaarOffline, myKyc, startIndividual, submitIndividual } from "../kyc/individual.js";
import {
  addEntityBankAccount, declareBeneficialOwners, entityKycView, myEntities, startEntity, submitEntity, uploadDocument,
} from "../kyc/entity.js";
import { DOC_KINDS } from "../kyc/entityRules.js";
import { decideReview, listQueue } from "../kyc/review.js";
import type { MakerChecker } from "../staff/makerChecker.js";

const startBody = z.object({ pan: z.string(), fullName: z.string() });
const aadhaarBody = z.object({ consentRef: z.string().min(1) });
const bankBody = z.object({ accountNumber: z.string(), ifsc: z.string() });
const decideBody = z.object({ decision: z.enum(["approve", "reject"]), reasonCode: z.string(), note: z.string().optional(), mfaCode: z.string() });

const startEntityBody = z.object({
  type: z.enum(["company", "llp", "partnership", "proprietorship", "trust"]),
  legalName: z.string(),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  gstExempt: z.boolean().optional(),
  regNo: z.string().optional(),
});
const beneficialOwnersBody = z.object({
  owners: z.array(z.object({ fullName: z.string(), pan: z.string(), sharePct: z.number() })),
  noneAbove10Percent: z.boolean().optional(),
});
const documentBody = z.object({ kind: z.enum(DOC_KINDS), reference: z.string() });
const entityBankBody = z.object({ accountNumber: z.string(), ifsc: z.string() });

export function registerKycRoutes(app: FastifyInstance, ctx: AppContext, mc: MakerChecker): void {
  app.post("/v1/kyc/individual", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await startIndividual(ctx, actor.accountId, startBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/individual/aadhaar", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await aadhaarOffline(ctx, actor.accountId, aadhaarBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/individual/bank-account", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await addBankAccount(ctx, actor.accountId, bankBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/individual:submit", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await submitIndividual(ctx, actor.accountId);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/kyc/me", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await myKyc(ctx, actor.accountId);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/ops/kyc-queue", async (req, reply) => {
    try {
      requireStaff(actorOrThrow(req), "ops_kyc");
      return await listQueue(ctx);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/ops/kyc/:reviewId/decide", async (req, reply) => {
    try {
      const staff = requireStaff(actorOrThrow(req));
      const { reviewId } = req.params as { reviewId: string };
      return await decideReview(ctx, mc, staff, reviewId, decideBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  // ---- entity KYC (spec 13) ----
  app.post("/v1/kyc/entity", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await startEntity(ctx, actor.accountId, startEntityBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/kyc/entities", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await myEntities(ctx, actor.accountId);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.get("/v1/kyc/entity/:partyId", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await entityKycView(ctx, actor.accountId, (req.params as { partyId: string }).partyId);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/entity/:partyId/beneficial-owners", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await declareBeneficialOwners(ctx, actor.accountId, (req.params as { partyId: string }).partyId, beneficialOwnersBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/:partyId/documents", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      const body = documentBody.parse(req.body);
      return await uploadDocument(ctx, actor.accountId, (req.params as { partyId: string }).partyId, body);
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/entity/:partyId/bank-account", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await addEntityBankAccount(ctx, actor.accountId, (req.params as { partyId: string }).partyId, entityBankBody.parse(req.body));
    } catch (e) {
      return sendError(reply, e);
    }
  });

  app.post("/v1/kyc/entity/:partyId/submit", async (req, reply) => {
    try {
      const actor = requireParty(actorOrThrow(req));
      return await submitEntity(ctx, actor.accountId, (req.params as { partyId: string }).partyId);
    } catch (e) {
      return sendError(reply, e);
    }
  });
}
