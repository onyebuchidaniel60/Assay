import { randomUUID } from "node:crypto";
import "@fastify/multipart";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, asc, desc, eq, sql } from "@assay/db";
import {
  appendBorrowerAuditEventInTx,
  analysisRuns,
  borrowers,
  createDb,
  documents,
  facilities,
} from "@assay/db";
import { borrowerCreateSchema, borrowerPatchSchema, facilityCreateSchema } from "@assay/contracts";
import {
  detectDocumentKind,
  parseDocument,
  sanitizeFilename,
  DocumentRejectedError,
} from "@assay/document";
import { encryptBytes, documentContentHmac, parseKek, decryptBytes } from "@assay/crypto";
import { PrivateObjectStorage } from "@assay/storage";
import type { AssayDb } from "@assay/db";
import { ApiError, conflict, notFound, unprocessable } from "../lib/errors.js";
import {
  READ_ROLES,
  WRITE_ROLES,
  findIdempotency,
  meta,
  noStore,
  optionalIdempotencyKey,
  parseBody,
  requestHash,
  requireAuth,
  requireRole,
  saveIdempotency,
} from "../lib/http.js";
import { createBorrowerKey, initialiseBorrowerAudit, requireBorrowerDek } from "../lib/keys.js";

const storage = new PrivateObjectStorage();
const db = createDb();

type Row = typeof borrowers.$inferSelect;
type FacilityRow = typeof facilities.$inferSelect;

function serializeBorrower(row: Row, facilityCount?: number) {
  return {
    id: row.id,
    displayAlias: row.displayAlias,
    referenceToken: row.referenceToken,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(facilityCount === undefined ? {} : { facilityCount }),
  };
}

function serializeFacility(row: FacilityRow) {
  return {
    id: row.id,
    borrowerId: row.borrowerId,
    facilityReferenceToken: row.facilityReferenceToken,
    label: row.label,
    currency: row.currency,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadBorrower(organizationId: string, borrowerId: string) {
  const [row] = await db
    .select()
    .from(borrowers)
    .where(and(eq(borrowers.id, borrowerId), eq(borrowers.organizationId, organizationId)))
    .limit(1);
  if (!row) throw notFound("Borrower");
  return row;
}

async function loadFacility(organizationId: string, facilityId: string) {
  const [row] = await db
    .select()
    .from(facilities)
    .where(and(eq(facilities.id, facilityId), eq(facilities.organizationId, organizationId)))
    .limit(1);
  if (!row) throw notFound("Facility");
  return row;
}

function serializeDocument(
  row: typeof documents.$inferSelect,
  role: string,
) {
  const base = {
    id: row.id,
    facilityId: row.facilityId,
    status: row.status,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    pageCount: row.pageCount,
    failureCode: row.failureCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  if (role === "ANALYST" || role === "ADMIN") {
    return {
      ...base,
      borrowerId: row.borrowerId,
      originalFilename: row.originalFilename,
      sha256Ciphertext: row.sha256Ciphertext,
      contentHmac: row.contentHmac,
    };
  }
  return base;
}

export function registerBorrowerRoutes(app: FastifyInstance) {
  app.get("/v1/borrowers", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const rows = await db
      .select({
        borrower: borrowers,
        facilityCount: sql<number>`(select count(*) from ${facilities} where ${facilities.borrowerId} = ${borrowers.id})`,
      })
      .from(borrowers)
      .where(eq(borrowers.organizationId, user.organizationId))
      .orderBy(asc(borrowers.displayAlias));
    return {
      data: rows.map((row) => serializeBorrower(row.borrower, Number(row.facilityCount))),
      meta: meta(request),
    };
  });

  app.post("/v1/borrowers", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, WRITE_ROLES);
    const body = parseBody(borrowerCreateSchema, request.body);
    const idempotencyKey = optionalIdempotencyKey(request);
    const route = "POST /v1/borrowers";
    const hash = requestHash(route, body);
    if (idempotencyKey) {
      const existing = await findIdempotency(db, {
        organizationId: user.organizationId,
        actorId: user.userId,
        key: idempotencyKey,
        route,
        hash,
      });
      if (existing) {
        const [row] = await db
          .select()
          .from(borrowers)
          .where(and(eq(borrowers.id, existing.resourceId), eq(borrowers.organizationId, user.organizationId)))
          .limit(1);
        if (row) {
          reply.code(200);
          return { data: serializeBorrower(row), meta: { ...meta(request), replayed: true } };
        }
      }
    }

    const normalized = body.referenceToken.toUpperCase();
    const borrowerId = randomUUID();
    try {
      await db.transaction(async (tx) => {
        await tx.insert(borrowers).values({
          id: borrowerId,
          organizationId: user.organizationId,
          displayAlias: body.displayAlias,
          referenceToken: body.referenceToken,
          normalizedReferenceToken: normalized,
          createdBy: user.userId,
        });
        await createBorrowerKey(tx, user.organizationId, borrowerId);
        await initialiseBorrowerAudit(tx, user.organizationId, borrowerId);
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId,
          actorType: "USER",
          actorId: user.userId,
          eventType: "BORROWER_CREATED",
          entityType: "borrower",
          entityId: borrowerId,
          metadata: { referenceToken: body.referenceToken },
          payload: { displayAlias: body.displayAlias, referenceToken: body.referenceToken, status: "ACTIVE" },
        });
        if (idempotencyKey) {
          await saveIdempotency(tx, {
            organizationId: user.organizationId,
            actorId: user.userId,
            key: idempotencyKey,
            method: "POST",
            route,
            hash,
            responseStatus: 201,
            resourceType: "borrower",
            resourceId: borrowerId,
          });
        }
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "23505") throw conflict("DUPLICATE_REFERENCE", "That borrower reference token already exists.");
      throw error;
    }

    const row = await loadBorrower(user.organizationId, borrowerId);
    reply.code(201);
    return { data: serializeBorrower(row), meta: meta(request) };
  });

  app.get("/v1/borrowers/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const { id } = request.params as { id: string };
    const row = await loadBorrower(user.organizationId, id);
    const facilityRows = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.organizationId, user.organizationId), eq(facilities.borrowerId, id)))
      .orderBy(asc(facilities.label));
    return {
      data: { ...serializeBorrower(row), facilities: facilityRows.map(serializeFacility) },
      meta: meta(request),
    };
  });

  app.patch("/v1/borrowers/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, WRITE_ROLES);
    const { id } = request.params as { id: string };
    const body = parseBody(borrowerPatchSchema, request.body);
    const existing = await loadBorrower(user.organizationId, id);
    if (existing.version !== body.expectedVersion) {
      throw conflict("VERSION_CONFLICT", "The borrower changed since you loaded it.");
    }
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(borrowers)
        .set({
          ...(body.displayAlias !== undefined ? { displayAlias: body.displayAlias } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          version: existing.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(borrowers.id, id), eq(borrowers.organizationId, user.organizationId), eq(borrowers.version, existing.version)))
        .returning();
      if (!row) throw conflict("VERSION_CONFLICT", "The borrower changed while you were editing it.");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "BORROWER_UPDATED",
        entityType: "borrower",
        entityId: id,
        metadata: { previousVersion: existing.version, version: row.version },
        payload: {
          before: { displayAlias: existing.displayAlias, status: existing.status },
          after: { displayAlias: row.displayAlias, status: row.status },
        },
      });
      return row;
    });
    return { data: serializeBorrower(updated), meta: meta(request) };
  });

  app.post("/v1/borrowers/:id/facilities", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, WRITE_ROLES);
    const { id } = request.params as { id: string };
    const borrower = await loadBorrower(user.organizationId, id);
    if (borrower.status !== "ACTIVE") throw conflict("BORROWER_ARCHIVED", "Cannot add a facility to an archived borrower.");
    const body = parseBody(facilityCreateSchema, request.body);
    const facilityId = randomUUID();
    try {
      await db.transaction(async (tx) => {
        await tx.insert(facilities).values({
          id: facilityId,
          organizationId: user.organizationId,
          borrowerId: id,
          facilityReferenceToken: body.facilityReferenceToken,
          normalizedFacilityReferenceToken: body.facilityReferenceToken.toUpperCase(),
          label: body.label,
          currency: body.currency,
          createdBy: user.userId,
        });
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId: id,
          actorType: "USER",
          actorId: user.userId,
          eventType: "FACILITY_CREATED",
          entityType: "facility",
          entityId: facilityId,
          metadata: { facilityReferenceToken: body.facilityReferenceToken },
          payload: { label: body.label, facilityReferenceToken: body.facilityReferenceToken, currency: body.currency },
        });
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "23505") throw conflict("DUPLICATE_FACILITY_REFERENCE", "That facility reference already exists.");
      throw error;
    }
    const row = await loadFacility(user.organizationId, facilityId);
    reply.code(201);
    return { data: serializeFacility(row), meta: meta(request) };
  });

  app.get("/v1/facilities", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const borrowerFilter = (request.query as { borrowerId?: string }).borrowerId;
    const rows = await db
      .select({ facility: facilities, borrower: borrowers })
      .from(facilities)
      .innerJoin(borrowers, eq(borrowers.id, facilities.borrowerId))
      .where(
        and(
          eq(facilities.organizationId, user.organizationId),
          borrowerFilter ? eq(facilities.borrowerId, borrowerFilter) : sql`true`,
        ),
      )
      .orderBy(desc(facilities.createdAt));
    return {
      data: rows.map((row) => ({
        ...serializeFacility(row.facility),
        borrowerAlias: row.borrower.displayAlias,
        borrowerReference: row.borrower.referenceToken,
      })),
      meta: meta(request),
    };
  });

  app.get("/v1/facilities/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const { id } = request.params as { id: string };
    const facility = await loadFacility(user.organizationId, id);
    const borrower = await loadBorrower(user.organizationId, facility.borrowerId);
    const documentRows = await db
      .select()
      .from(documents)
      .where(and(eq(documents.organizationId, user.organizationId), eq(documents.facilityId, id)))
      .orderBy(desc(documents.createdAt));
    const runRows = await db
      .select()
      .from(analysisRuns)
      .where(and(eq(analysisRuns.organizationId, user.organizationId), eq(analysisRuns.facilityId, id)))
      .orderBy(desc(analysisRuns.createdAt));
    return {
      data: {
        ...serializeFacility(facility),
        borrower: serializeBorrower(borrower),
        documents: documentRows.map((row) => serializeDocument(row, user.role)),
        analysisRuns: runRows.map((row) => ({
          id: row.id,
          runNumber: row.runNumber,
          status: row.status,
          resultCode: row.resultCode,
          documentId: row.documentId,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
      },
      meta: meta(request),
    };
  });

  app.post("/v1/facilities/:id/documents", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, WRITE_ROLES);
    const { id } = request.params as { id: string };
    const facility = await loadFacility(user.organizationId, id);
    if (facility.status !== "ACTIVE") throw conflict("FACILITY_CLOSED", "Cannot upload to a closed facility.");
    const part = await request.file();
    if (!part) throw unprocessable("FILE_REQUIRED", "Attach one PDF or UTF-8 text agreement.");
    let bytes: Buffer;
    try {
      bytes = await part.toBuffer();
    } catch {
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The upload exceeds the 10 MiB limit.");
    }
    const filename = sanitizeFilename(part.filename ?? "agreement");
    let doc;
    try {
      const kind = detectDocumentKind(bytes, part.mimetype, filename);
      const parsed = await parseDocument(bytes, kind, filename);
      doc = { kind, pageCount: parsed.pageCount };
    } catch (error) {
      if (error instanceof DocumentRejectedError) {
        throw unprocessable(error.code, error.message);
      }
      throw error;
    }

    const kekBase64 = process.env.DATA_KEK_BASE64;
    if (!kekBase64) throw new Error("DATA_KEK_BASE64 is required.");
    const kek = parseKek(kekBase64);
    const contentHmac = documentContentHmac(bytes, kek);
    const dek = await requireBorrowerDek(db, user.organizationId, facility.borrowerId);
    const sealed = encryptBytes(bytes, dek);
    const objectBytes = new TextEncoder().encode(JSON.stringify(sealed));
    const sha256Ciphertext = (await import("node:crypto")).createHash("sha256").update(objectBytes).digest("hex");
    const [duplicate] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.organizationId, user.organizationId),
          eq(documents.facilityId, id),
          eq(documents.sha256Ciphertext, sha256Ciphertext),
        ),
      )
      .limit(1);
    if (duplicate) {
      throw conflict("DUPLICATE_DOCUMENT", "This agreement is already attached to the facility.", {
        documentId: duplicate.id,
      });
    }

    const documentId = randomUUID();
    const storageKey = `org/${user.organizationId}/borrowers/${facility.borrowerId}/documents/${documentId}`;
    await storage.put(storageKey, objectBytes, "application/octet-stream");
    try {
      await db.transaction(async (tx) => {
        await tx.insert(documents).values({
          id: documentId,
          organizationId: user.organizationId,
          borrowerId: facility.borrowerId,
          facilityId: id,
          uploadedBy: user.userId,
          originalFilename: filename,
          mimeType: doc.kind,
          sizeBytes: bytes.byteLength,
          pageCount: doc.pageCount,
          storageKey,
          sha256Ciphertext,
          contentHmac,
          status: "UPLOADED",
        });
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId: facility.borrowerId,
          actorType: "USER",
          actorId: user.userId,
          eventType: "DOCUMENT_UPLOADED",
          entityType: "document",
          entityId: documentId,
          metadata: { facilityId: id, pageCount: doc.pageCount, mimeType: doc.kind, sizeBytes: bytes.byteLength },
          payload: { filename, sha256Ciphertext, contentHmac },
        });
      });
    } catch (error) {
      await storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
    const [row] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
    if (!row) throw notFound("Document");
    reply.code(201);
    return { data: serializeDocument(row, user.role), meta: meta(request) };
  });

  app.get("/v1/documents/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, READ_ROLES);
    const { id } = request.params as { id: string };
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, user.organizationId)))
      .limit(1);
    if (!row) throw notFound("Document");
    noStore(reply);
    return { data: serializeDocument(row, user.role), meta: meta(request) };
  });

  app.get("/v1/documents/:id/preview", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const [row] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.organizationId, user.organizationId)))
      .limit(1);
    if (!row) throw notFound("Document");
    if (row.status === "SHREDDED") throw conflict("DOCUMENT_SHREDDED", "The document key material has been shredded.");
    const dek = await requireBorrowerDek(db, user.organizationId, row.borrowerId);
    const objectBytes = await storage.get(row.storageKey);
    const sealed = JSON.parse(new TextDecoder().decode(objectBytes)) as {
      version: 1;
      nonce: string;
      tag: string;
      ciphertext: string;
    };
    const plaintext = decryptBytes(sealed, dek);
    const parsed = await parseDocument(plaintext, row.mimeType === "application/pdf" ? "application/pdf" : "text/plain");
    noStore(reply);
    return {
      data: {
        id: row.id,
        facilityId: row.facilityId,
        mimeType: row.mimeType,
        pageCount: parsed.pageCount,
        pages: parsed.pages.map((page) => ({ number: page.number, text: page.text })),
      },
      meta: meta(request),
    };
  });
}
