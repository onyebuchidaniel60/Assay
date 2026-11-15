import type { FastifyInstance } from "fastify";
import { and, eq } from "@assay/db";
import { appendBorrowerAuditEventInTx, borrowerKeys, borrowers, createDb, documents } from "@assay/db";
import { ApiError, conflict, notFound, unprocessable } from "../lib/errors.js";
import { meta, requireAuth, requireRole } from "../lib/http.js";

const db = createDb();

export function registerDemoRoutes(app: FastifyInstance) {
  app.post("/v1/demo/borrowers/:id/shred", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ADMIN"]);
    const appEnv = (process.env.APP_ENV ?? "").toLowerCase();
    const enabled = (process.env.ENABLE_DEMO_SHRED ?? "").toLowerCase() === "true";
    if (appEnv !== "demo" || !enabled) {
      throw new ApiError(403, "DEMO_SHRED_DISABLED", "Demo crypto-shred is disabled outside a controlled demo environment.");
    }
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { confirmation?: unknown };
    if (typeof body.confirmation !== "string") {
      throw unprocessable("CONFIRMATION_REQUIRED", "Type the confirmation phrase to continue.");
    }
    const [borrower] = await db
      .select()
      .from(borrowers)
      .where(and(eq(borrowers.id, id), eq(borrowers.organizationId, user.organizationId)))
      .limit(1);
    if (!borrower) throw notFound("Borrower");
    if (!borrower.referenceToken.toUpperCase().startsWith("BOR-")) {
      throw conflict("SYNTHETIC_ONLY", "Crypto-shred is limited to synthetic fixture borrowers.");
    }
    if (body.confirmation !== `SHRED ${borrower.referenceToken}`) {
      throw unprocessable("CONFIRMATION_MISMATCH", "The confirmation phrase does not match this borrower.");
    }

    const result = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(borrowers).where(eq(borrowers.id, id)).for("update");
      if (!locked) throw notFound("Borrower");
      const [key] = await tx.select().from(borrowerKeys).where(eq(borrowerKeys.borrowerId, id)).for("update");
      if (!key) throw notFound("Borrower key");
      if (key.status === "SHREDDED") {
        return { status: "ALREADY_SHREDDED", shreddedAt: key.shreddedAt?.toISOString() ?? null, chainVerification: "UNCHANGED" };
      }
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "BORROWER_KEY_SHREDDED",
        entityType: "borrower",
        entityId: id,
        metadata: { synthetic: true, demoOnly: true },
        payload: { marker: "Crypto-shred initiated for synthetic fixture", referenceToken: locked.referenceToken },
      });
      await tx
        .update(borrowerKeys)
        .set({ status: "SHREDDED", wrappedDek: "", wrapNonce: "", wrapTag: "", shreddedAt: new Date() })
        .where(eq(borrowerKeys.borrowerId, id));
      await tx
        .update(documents)
        .set({ status: "SHREDDED", updatedAt: new Date() })
        .where(and(eq(documents.borrowerId, id), eq(documents.organizationId, user.organizationId)));
      return { status: "SHREDDED", shreddedAt: new Date().toISOString(), chainVerification: "UNCHANGED" };
    });

    return {
      data: {
        ...result,
        note: "Wrapped key material was deleted. Ciphertext remains but is no longer decryptable through the application key store.",
      },
      meta: meta(request),
    };
  });
}
