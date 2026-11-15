import type { FastifyInstance } from "fastify";
import { and, eq } from "@assay/db";
import { borrowers, createDb } from "@assay/db";
import {
  listBorrowerAuditEvents,
  readBorrowerAuditPayload,
  verifyBorrowerAudit,
} from "@assay/db";
import { notFound } from "../lib/errors.js";
import { READ_ROLES, meta, requireAuth, requireRole } from "../lib/http.js";

const db = createDb();

export function registerAuditRoutes(app: FastifyInstance) {
  app.get("/v1/borrowers/:id/audit-events", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const { id } = request.params as { id: string };
    const [borrower] = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, id), eq(borrowers.organizationId, user.organizationId)))
      .limit(1);
    if (!borrower) throw notFound("Borrower");
    const limit = Number((request.query as { limit?: string }).limit ?? 100);
    const events = await listBorrowerAuditEvents(db, user.organizationId, id, Number.isFinite(limit) ? limit : 100);
    return {
      data: events.map((event) => ({ ...event, payloadAvailable: user.role === "ANALYST" || user.role === "ADMIN" })),
      meta: meta(request),
    };
  });

  app.post("/v1/borrowers/:id/audit/verify", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const { id } = request.params as { id: string };
    const [borrower] = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, id), eq(borrowers.organizationId, user.organizationId)))
      .limit(1);
    if (!borrower) throw notFound("Borrower");
    const result = await verifyBorrowerAudit(db, user.organizationId, id);
    return { data: result, meta: meta(request) };
  });

  app.get("/v1/borrowers/:id/audit-events/:eventId/payload", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id, eventId } = request.params as { id: string; eventId: string };
    const [borrower] = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, id), eq(borrowers.organizationId, user.organizationId)))
      .limit(1);
    if (!borrower) throw notFound("Borrower");
    const payload = await readBorrowerAuditPayload(db, user.organizationId, id, eventId);
    if (payload === null) {
      return {
        data: { available: false, payload: null, reason: "KEY_SHREDDED_OR_PAYLOAD_UNAVAILABLE" },
        meta: meta(request),
      };
    }
    reply.header("cache-control", "no-store, private");
    return { data: { available: true, payload }, meta: meta(request) };
  });
}
