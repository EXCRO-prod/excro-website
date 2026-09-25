import type { FastifyReply } from "fastify";
import { HttpError } from "./errors.js";

/** One place that turns a thrown error into a response, so every route's catch block looks the same. */
export function sendError(reply: FastifyReply, e: unknown): FastifyReply {
  if (e instanceof HttpError) return reply.code(e.status).send({ error: e.code, message: e.message, ...(e.detail !== undefined ? { detail: e.detail } : {}) });
  // eslint-disable-next-line no-console
  console.error(e);
  return reply.code(500).send({ error: "internal_error", message: "something went wrong" });
}
