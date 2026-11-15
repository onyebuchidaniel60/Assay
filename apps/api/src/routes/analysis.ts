import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  analysisRuns,
  and,
  approvals,
  asc,
  borrowers,
  covenantTerms,
  createDb,
  desc,
  documents,
  eq,
  extractionRuns,
  facilities,
  financialInputs,
  proofArtifacts,
  redactionRevisions,
  scenarioResults,
  sql,
} from "@assay/db";
import {
  approvalDecisionSchema,
  covenantTermsSchema,
  financialInputsRequestSchema,
  proofRequestSchema,
  redactionReviewSchema,
  termsReviewSchema,
} from "@assay/contracts";
import { calculateLeverage, canonicalize, sha256, verifyCalculation } from "@assay/domain";
import { AttestationError, ProviderError, fromEnv } from "@assay/ai";
import { decryptBytes, encryptBytes, sealJson, unsealJson, type SealedColumns } from "@assay/crypto";
import { PrivateObjectStorage } from "@assay/storage";
import { parseDocument } from "@assay/document";
import { ApiError, conflict, notFound, unprocessable } from "../lib/errors.js";
import {
  findIdempotency,
  meta,
  parseBody,
  requestHash,
  requireAuth,
  requireIdempotencyKey,
  requireRole,
  saveIdempotency,
} from "../lib/http.js";
import { requireBorrowerDek } from "../lib/keys.js";
import {
  adjustedEbitdaMinor,
  applyAddbackCaps,
  decimalStringToMinor,
  financialSnapshotHash,
  minorToDecimalString,
  type FinancialSnapshot,
  type PermittedAddback,
} from "../lib/finance.js";
import { applyRedactionAdjustments, type PageText } from "../lib/redaction.js";

const db = createDb();
const storage = new PrivateObjectStorage();
const execFileAsync = promisify(execFile);

const TERMS_PROMPT_VERSION = "covenant-extraction-v1";
const SERV_PROMPT_VERSION = "serv-orchestration-v1";

type RunRow = typeof analysisRuns.$inferSelect;
type TermsRow = typeof covenantTerms.$inferSelect;
type FinancialRow = typeof financialInputs.$inferSelect;
type ProofRow = typeof proofArtifacts.$inferSelect;

function sealedFrom(row: { ciphertext: string; nonce: string; tag: string }): SealedColumns {
  return { ciphertext: row.ciphertext, nonce: row.nonce, tag: row.tag };
}

async function loadRun(organizationId: string, runId: string) {
  const [run] = await db
    .select()
    .from(analysisRuns)
    .where(and(eq(analysisRuns.id, runId), eq(analysisRuns.organizationId, organizationId)))
    .limit(1);
  if (!run) throw notFound("Analysis run");
  const [borrower] = await db
    .select()
    .from(borrowers)
    .where(and(eq(borrowers.id, run.borrowerId), eq(borrowers.organizationId, organizationId)))
    .limit(1);
  const [facility] = await db
    .select()
    .from(facilities)
    .where(and(eq(facilities.id, run.facilityId), eq(facilities.organizationId, organizationId)))
    .limit(1);
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, run.documentId), eq(documents.organizationId, organizationId)))
    .limit(1);
  if (!borrower || !facility || !document) throw notFound("Analysis context");
  return { run, borrower, facility, document };
}

async function termsFor(runId: string): Promise<TermsRow | null> {
  const [row] = await db.select().from(covenantTerms).where(eq(covenantTerms.analysisRunId, runId)).limit(1);
  return row ?? null;
}

async function financialFor(runId: string): Promise<FinancialRow | null> {
  const [row] = await db.select().from(financialInputs).where(eq(financialInputs.analysisRunId, runId)).limit(1);
  return row ?? null;
}

async function proofFor(runId: string): Promise<ProofRow | null> {
  const [row] = await db.select().from(proofArtifacts).where(eq(proofArtifacts.analysisRunId, runId)).limit(1);
  return row ?? null;
}

function redactionKey(organizationId: string, borrowerId: string, runId: string, revision: number): string {
  return `org/${organizationId}/borrowers/${borrowerId}/redactions/${runId}/${revision}.json`;
}

async function loadRedactionPages(
  organizationId: string,
  borrowerId: string,
  runId: string,
  revision: number,
): Promise<{ pages: PageText[]; modelText: string }> {
  const dek = await requireBorrowerDek(db, organizationId, borrowerId);
  const [row] = await db
    .select()
    .from(redactionRevisions)
    .where(and(eq(redactionRevisions.analysisRunId, runId), eq(redactionRevisions.revision, revision)))
    .limit(1);
  if (!row) throw notFound("Redaction revision");
  const bytes = await storage.get(row.redactedTextStorageKey);
  const sealed = JSON.parse(new TextDecoder().decode(bytes)) as SealedColumns & { version: 1 };
  return unsealJson<{ pages: PageText[]; modelText: string }>(sealed, dek);
}

export type { PageText };

function scenarioRiskBand(headroomPct: string): "LOW" | "MEDIUM" | "HIGH" {
  const value = Number(headroomPct);
  if (!Number.isFinite(value)) return "HIGH";
  if (value >= 20) return "LOW";
  if (value >= 0) return "MEDIUM";
  return "HIGH";
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

const servExtractionSchema = z
  .object({
    branch: z.enum(["SUPPORTED_CLEAR", "ANALYST_REVIEW_REQUIRED", "UNSUPPORTED_COVENANT"]),
    rationale: z.string().min(1).max(1000),
  })
  .strict();

const servCalculationSchema = z
  .object({
    agreement: z.enum(["CONFIRMED", "DISAGREES", "UNCERTAIN"]),
    rationale: z.string().min(1).max(1000),
  })
  .strict();

async function transitionRun(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  run: RunRow,
  next: RunRow["status"],
  extra: Partial<typeof analysisRuns.$inferInsert> = {},
): Promise<RunRow> {
  const [updated] = await tx
    .update(analysisRuns)
    .set({ status: next, version: run.version + 1, updatedAt: new Date(), ...extra })
    .where(
      and(
        eq(analysisRuns.id, run.id),
        eq(analysisRuns.organizationId, run.organizationId),
        eq(analysisRuns.status, run.status),
        eq(analysisRuns.version, run.version),
      ),
    )
    .returning();
  if (!updated) throw conflict("ANALYSIS_STATE_CONFLICT", "This analysis changed while the action was running.", {
    currentStatus: run.status,
  });
  return updated;
}

function serializeTerms(row: TermsRow) {
  return {
    id: row.id,
    revision: row.analysisRunId,
    covenantType: row.covenantType,
    comparator: row.comparator,
    thresholdBps: row.thresholdBps,
    currency: row.currency,
    totalDebtDefinition: row.totalDebtDefinition,
    ebitdaDefinition: row.ebitdaDefinition,
    permittedAddbacks: row.permittedAddbacks,
    testingDate: row.testingDate,
    cureRightsSummary: row.cureRightsSummary,
    evidence: row.evidence,
    confidence: row.confidence === null ? null : Number(row.confidence),
    uncertaintyNotes: row.uncertaintyNotes,
    reviewStatus: row.reviewStatus,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

function serializeProof(row: ProofRow) {
  return {
    id: row.id,
    circuitVersion: row.circuitVersion,
    verificationKeyHash: row.verificationKeyHash,
    publicSignals: row.publicSignals,
    witnessCommitment: row.witnessCommitment,
    status: row.status,
    verified: row.verified,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    errorCode: row.errorCode,
  };
}

async function analystScenarioResults(runId: string) {
  const rows = await db
    .select()
    .from(scenarioResults)
    .where(eq(scenarioResults.analysisRunId, runId))
    .orderBy(asc(scenarioResults.scenario));
  const [run] = await db
    .select({ borrowerId: analysisRuns.borrowerId, organizationId: analysisRuns.organizationId })
    .from(analysisRuns)
    .where(eq(analysisRuns.id, runId))
    .limit(1);
  if (!run || rows.length === 0) return [];
  const dek = await requireBorrowerDek(db, run.organizationId, run.borrowerId);
  return rows.map((row) => ({
    scenario: row.scenario,
    result: row.result,
    riskBand: row.riskBand,
    detail: unsealJson<Record<string, unknown>>(sealedFrom(row), dek),
  }));
}

export function registerAnalysisRoutes(app: FastifyInstance) {
  app.post("/v1/analysis-runs", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const idempotencyKey = requireIdempotencyKey(request);
    const body = parseBody(z.object({ facilityId: z.string().uuid(), documentId: z.string().uuid() }).strict(), request.body);
    const route = "POST /v1/analysis-runs";
    const hash = requestHash(route, body);
    const existing = await findIdempotency(db, {
      organizationId: user.organizationId,
      actorId: user.userId,
      key: idempotencyKey,
      route,
      hash,
    });
    if (existing) {
      const context = await loadRun(user.organizationId, existing.resourceId);
      reply.code(200);
      return { data: { ...serializeRunAnalyst(context.run), replayed: true }, meta: meta(request) };
    }

    const runId = randomUUID();
    try {
      await db.transaction(async (tx) => {
        const [facility] = await tx
          .select()
          .from(facilities)
          .where(and(eq(facilities.id, body.facilityId), eq(facilities.organizationId, user.organizationId)))
          .for("update");
        if (!facility) throw notFound("Facility");
        if (facility.status !== "ACTIVE") throw conflict("FACILITY_CLOSED", "This facility is closed.");
        const [document] = await tx
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.id, body.documentId),
              eq(documents.organizationId, user.organizationId),
              eq(documents.facilityId, facility.id),
            ),
          )
          .limit(1);
        if (!document) throw notFound("Document");
        if (document.status === "SHREDDED") throw conflict("DOCUMENT_SHREDDED", "This document cannot be used.");
        const [existingRun] = await tx
          .select({ id: analysisRuns.id })
          .from(analysisRuns)
          .where(eq(analysisRuns.documentId, document.id))
          .limit(1);
        if (existingRun) {
          throw conflict("DOCUMENT_ALREADY_USED", "This agreement already belongs to an analysis run.", {
            analysisRunId: existingRun.id,
          });
        }
        const [maxRow] = await tx
          .select({ maxRun: sql<number>`coalesce(max(${analysisRuns.runNumber}), 0)` })
          .from(analysisRuns)
          .where(eq(analysisRuns.facilityId, facility.id));
        const runNumber = Number(maxRow?.maxRun ?? 0) + 1;
        const [created] = await tx
          .insert(analysisRuns)
          .values({
            id: runId,
            organizationId: user.organizationId,
            borrowerId: facility.borrowerId,
            facilityId: facility.id,
            documentId: document.id,
            runNumber,
            status: "FILE_UPLOADED",
            createdBy: user.userId,
            startedAt: new Date(),
          })
          .returning();
        if (!created) throw new Error("Analysis run insert did not return a row.");
        await tx.update(documents).set({ status: "PROCESSING", updatedAt: new Date() }).where(eq(documents.id, document.id));
        await saveIdempotency(tx, {
          organizationId: user.organizationId,
          actorId: user.userId,
          key: idempotencyKey,
          method: "POST",
          route,
          hash,
          responseStatus: 201,
          resourceType: "analysis_run",
          resourceId: runId,
        });
        const { appendBorrowerAuditEventInTx } = await import("@assay/db");
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId: facility.borrowerId,
          actorType: "USER",
          actorId: user.userId,
          eventType: "ANALYSIS_RUN_CREATED",
          entityType: "analysis_run",
          entityId: runId,
          metadata: { facilityId: facility.id, documentId: document.id, runNumber },
          payload: { status: "FILE_UPLOADED", runNumber },
        });
      });
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "23505") throw conflict("DUPLICATE_ANALYSIS", "An analysis already exists for this document.");
      throw error;
    }

    const context = await loadRun(user.organizationId, runId);
    const { enqueueJob } = await import("@assay/db");
    await enqueueJob(db, {
      organizationId: user.organizationId,
      jobType: "analysis.parse",
      payload: { analysisRunId: runId, documentId: context.document.id, organizationId: user.organizationId },
      idempotencyKey: `analysis-parse:${runId}`,
    });
    reply.code(201);
    return { data: serializeRunAnalyst(context.run), meta: meta(request) };
  });

  app.get("/v1/analysis-runs", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const query = request.query as { status?: string; facilityId?: string; limit?: string };
    const limit = Math.max(1, Math.min(100, Number(query.limit ?? 50) || 50));
    const rows = await db
      .select({ run: analysisRuns, borrower: borrowers, facility: facilities })
      .from(analysisRuns)
      .innerJoin(borrowers, eq(borrowers.id, analysisRuns.borrowerId))
      .innerJoin(facilities, eq(facilities.id, analysisRuns.facilityId))
      .where(
        and(
          eq(analysisRuns.organizationId, user.organizationId),
          query.status ? eq(analysisRuns.status, query.status as RunRow["status"]) : sql`true`,
          query.facilityId ? eq(analysisRuns.facilityId, query.facilityId) : sql`true`,
        ),
      )
      .orderBy(desc(analysisRuns.createdAt))
      .limit(limit);
    const data = [];
    for (const row of rows) {
      const terms = await termsFor(row.run.id);
      data.push({
        id: row.run.id,
        runNumber: row.run.runNumber,
        status: row.run.status,
        resultCode: row.run.resultCode,
        failureCode: row.run.failureCode,
        version: row.run.version,
        termsVersion: row.run.termsVersion,
        thresholdBps: terms?.thresholdBps ?? null,
        borrowerId: row.borrower.id,
        borrowerReference: row.borrower.referenceToken,
        borrowerAlias: user.role === "AUDITOR" ? null : row.borrower.displayAlias,
        facilityId: row.facility.id,
        facilityReference: row.facility.facilityReferenceToken,
        facilityLabel: row.facility.label,
        createdAt: row.run.createdAt.toISOString(),
        updatedAt: row.run.updatedAt.toISOString(),
      });
    }
    return { data, meta: meta(request) };
  });

  app.get("/v1/analysis-runs/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const { id } = request.params as { id: string };
    const context = await loadRun(user.organizationId, id);
    if (user.role === "ANALYST" || user.role === "ADMIN") {
      const terms = await termsFor(id);
      const proof = await proofFor(id);
      const revisionRows = await db
        .select()
        .from(redactionRevisions)
        .where(eq(redactionRevisions.analysisRunId, id))
        .orderBy(desc(redactionRevisions.revision));
      return {
        data: {
          ...serializeRunAnalyst(context.run),
          borrower: { id: context.borrower.id, displayAlias: context.borrower.displayAlias, referenceToken: context.borrower.referenceToken },
          facility: { id: context.facility.id, label: context.facility.label, facilityReferenceToken: context.facility.facilityReferenceToken, currency: context.facility.currency },
          document: { id: context.document.id, status: context.document.status, pageCount: context.document.pageCount, mimeType: context.document.mimeType },
          terms: terms ? serializeTerms(terms) : null,
          proof: proof ? serializeProof(proof) : null,
          redaction: revisionRows.map((row) => ({
            revision: row.revision,
            entityCount: row.entities.length,
            reviewedAt: row.reviewedAt?.toISOString() ?? null,
          })),
        },
        meta: meta(request),
      };
    }
    if (user.role === "MANAGER") {
      return { data: await managerRunView(context.run, context.borrower, context.facility), meta: meta(request) };
    }
    return { data: await auditorRunView(context.run), meta: meta(request) };
  });

  app.get("/v1/analysis-runs/:id/redaction", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const context = await loadRun(user.organizationId, id);
    const requested = Number((request.query as { revision?: string }).revision ?? "0");
    const [revision] = await db
      .select()
      .from(redactionRevisions)
      .where(and(eq(redactionRevisions.analysisRunId, id), requested ? eq(redactionRevisions.revision, requested) : sql`true`))
      .orderBy(desc(redactionRevisions.revision))
      .limit(1);
    if (!revision) throw notFound("Redaction revision");
    const pages = await loadRedactionPages(user.organizationId, context.borrower.id, id, revision.revision);
    return {
      data: {
        revision: revision.revision,
        pages: pages.pages,
        entityCount: (revision.entities as unknown[]).length,
        entities: revision.entities,
        reviewedAt: revision.reviewedAt?.toISOString() ?? null,
        status: context.run.status,
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/redaction-review", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const body = parseBody(redactionReviewSchema, request.body);
    const context = await loadRun(user.organizationId, id);
    if (context.run.status !== "REDACTION_REVIEW") {
      throw conflict("ANALYSIS_STATE_CONFLICT", "Redaction review is not available in the current state.", {
        currentStatus: context.run.status,
      });
    }
    const [revision] = await db
      .select()
      .from(redactionRevisions)
      .where(and(eq(redactionRevisions.analysisRunId, id), eq(redactionRevisions.revision, body.revision)))
      .limit(1);
    if (!revision) throw notFound("Redaction revision");
    if (body.decision === "REJECT") {
      await db.transaction(async (tx) => {
        const locked = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
        if (!locked[0]) throw notFound("Analysis run");
        const current = locked[0];
        await transitionRun(tx, current, "FAILED", {
          failureCode: "REDACTION_REJECTED",
          completedAt: new Date(),
        });
        const { appendBorrowerAuditEventInTx } = await import("@assay/db");
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId: context.borrower.id,
          actorType: "USER",
          actorId: user.userId,
          eventType: "REDACTION_REJECTED",
          entityType: "analysis_run",
          entityId: id,
          metadata: { revision: body.revision },
          payload: { reason: body.rationale ?? null },
        });
      });
      return { data: { status: "FAILED", failureCode: "REDACTION_REJECTED" }, meta: meta(request) };
    }

    const hasAdjustments = Boolean(body.falsePositiveSpans?.length || body.additionalSpans?.length);
    if (hasAdjustments) {
      const pages = await loadRedactionPages(user.organizationId, context.borrower.id, id, body.revision);
      const storedEntities = revision.entities as Array<{
        entityType: string;
        start: number;
        end: number;
        score: number;
        page: number;
      }>;
      const additional = (body.additionalSpans ?? []).map((span) => ({
        entityType: span.entityType,
        start: span.start,
        end: span.end,
        score: 1,
        page: span.page,
      }));
      const corrected = applyRedactionAdjustments(pages.pages, storedEntities, id, {
        ...(body.falsePositiveSpans
          ? { falsePositiveSpans: body.falsePositiveSpans.map((span) => ({ page: span.page, start: span.start, end: span.end })) }
          : {}),
        additionalSpans: additional,
      });
      const nextRevision = body.revision + 1;
      const dek = await requireBorrowerDek(db, user.organizationId, context.borrower.id);
      const sealedPages = sealJson({ pages: corrected.pages, modelText: corrected.modelText }, dek);
      const storageKey = redactionKey(user.organizationId, context.borrower.id, id, nextRevision);
      await storage.put(storageKey, new TextEncoder().encode(JSON.stringify(sealedPages)), "application/octet-stream");
      const sealedTokens = sealJson(corrected.tokenMap, dek);
      await db.transaction(async (tx) => {
        await tx.insert(redactionRevisions).values({
          organizationId: user.organizationId,
          analysisRunId: id,
          revision: nextRevision,
          redactedTextStorageKey: storageKey,
          encryptedTokenMap: sealedTokens.ciphertext,
          tokenMapNonce: sealedTokens.nonce,
          tokenMapTag: sealedTokens.tag,
          entities: corrected.entities,
        });
        const { appendBorrowerAuditEventInTx } = await import("@assay/db");
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId: context.borrower.id,
          actorType: "USER",
          actorId: user.userId,
          eventType: "REDACTION_REVISED",
          entityType: "analysis_run",
          entityId: id,
          metadata: { previousRevision: body.revision, revision: nextRevision, entityCount: corrected.entities.length },
          payload: { falsePositiveSpans: body.falsePositiveSpans ?? [], additionalSpans: body.additionalSpans ?? [] },
        });
      });
      return {
        data: { revision: nextRevision, entityCount: corrected.entities.length, reviewed: false },
        meta: meta(request),
      };
    }

    await db.transaction(async (tx) => {
      const locked = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked[0]) throw notFound("Analysis run");
      const current = locked[0];
      if (current.status !== "REDACTION_REVIEW") {
        throw conflict("ANALYSIS_STATE_CONFLICT", "Redaction review is no longer available.");
      }
      await tx
        .update(redactionRevisions)
        .set({ reviewedBy: user.userId, reviewedAt: new Date() })
        .where(eq(redactionRevisions.id, revision.id));
      await transitionRun(tx, current, "REDACTION_CONFIRMED");
      await tx.update(documents).set({ status: "READY", updatedAt: new Date() }).where(eq(documents.id, context.document.id));
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "REDACTION_CONFIRMED",
        entityType: "analysis_run",
        entityId: id,
        metadata: { revision: body.revision },
        payload: { revision: body.revision },
      });
    });
    return { data: { revision: body.revision, reviewed: true, status: "REDACTION_CONFIRMED" }, meta: meta(request) };
  });

  app.post("/v1/analysis-runs/:id/extraction", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const context = await loadRun(user.organizationId, id);
    if (context.run.status !== "REDACTION_CONFIRMED") {
      throw conflict("ANALYSIS_STATE_CONFLICT", "Confirm redaction before extraction.", {
        currentStatus: context.run.status,
      });
    }
    const [revision] = await db
      .select({ revision: redactionRevisions.revision })
      .from(redactionRevisions)
      .where(eq(redactionRevisions.analysisRunId, id))
      .orderBy(desc(redactionRevisions.revision))
      .limit(1);
    if (!revision) throw conflict("REDACTION_MISSING", "No confirmed redaction revision exists.");

    await db.transaction(async (tx) => {
      const locked = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked[0]) throw notFound("Analysis run");
      if (locked[0].status !== "REDACTION_CONFIRMED") {
        throw conflict("ANALYSIS_STATE_CONFLICT", "Extraction already started.");
      }
      await transitionRun(tx, locked[0], "EXTRACTION_PENDING");
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "EXTRACTION_STARTED",
        entityType: "analysis_run",
        entityId: id,
        metadata: { revision: revision.revision, provider: "near-ai" },
        payload: { revision: revision.revision },
      });
    });
    const { enqueueJob } = await import("@assay/db");
    await enqueueJob(db, {
      organizationId: user.organizationId,
      jobType: "analysis.extract",
      payload: { analysisRunId: id, organizationId: user.organizationId, actorId: user.userId },
      idempotencyKey: `analysis-extract:${id}`,
      maxAttempts: 1,
    });
    reply.code(202);
    return {
      data: { status: "EXTRACTION_PENDING", note: "Confidential extraction runs in the background. Poll the run for status." },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/terms-review", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const body = parseBody(termsReviewSchema, request.body);
    const context = await loadRun(user.organizationId, id);
    if (context.run.status !== "TERMS_REVIEW") {
      throw conflict("ANALYSIS_STATE_CONFLICT", "Terms review is not available.", { currentStatus: context.run.status });
    }
    const terms = await termsFor(id);
    if (!terms) throw conflict("TERMS_MISSING", "No extracted terms exist for this run.");
    if (terms.reviewStatus !== "PENDING") throw conflict("TERMS_ALREADY_REVIEWED", "These terms were already reviewed.");
    if (body.revision !== context.run.version) {
      throw conflict("REVISION_CONFLICT", "The terms revision is stale.");
    }
    if (body.decision === "REJECT") {
      await db.transaction(async (tx) => {
        const locked = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
        if (!locked[0]) throw notFound("Analysis run");
        await tx
          .update(covenantTerms)
          .set({ reviewStatus: "REJECTED", reviewedBy: user.userId, reviewedAt: new Date() })
          .where(eq(covenantTerms.id, terms.id));
        await transitionRun(tx, locked[0], "FAILED", { failureCode: "TERMS_REJECTED", completedAt: new Date() });
        const { appendBorrowerAuditEventInTx } = await import("@assay/db");
        await appendBorrowerAuditEventInTx(tx, {
          organizationId: user.organizationId,
          borrowerId: context.borrower.id,
          actorType: "USER",
          actorId: user.userId,
          eventType: "COVENANT_TERMS_REJECTED",
          entityType: "covenant_terms",
          entityId: terms.id,
          metadata: { revision: body.revision },
          payload: { rationale: body.rationale ?? null },
        });
      });
      return { data: { status: "FAILED", failureCode: "TERMS_REJECTED" }, meta: meta(request) };
    }

    const edits = body.edits ?? {};
    const nextThreshold = edits.thresholdBps ?? terms.thresholdBps;
    if (!Number.isInteger(nextThreshold) || nextThreshold < 1 || nextThreshold > 100_000) {
      throw unprocessable("INVALID_THRESHOLD", "Threshold must be between 1 and 100000 basis points.");
    }
    const updated = await db.transaction(async (tx) => {
      const locked = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked[0]) throw notFound("Analysis run");
      const [row] = await tx
        .update(covenantTerms)
        .set({
          thresholdBps: nextThreshold,
          totalDebtDefinition: edits.totalDebtDefinition ?? terms.totalDebtDefinition,
          ebitdaDefinition: edits.ebitdaDefinition ?? terms.ebitdaDefinition,
          permittedAddbacks: (edits.permittedAddbacks ?? (terms.permittedAddbacks as unknown as PermittedAddback[])) as unknown as Record<
            string,
            unknown
          >[],
          testingDate: edits.testingDate !== undefined ? edits.testingDate : terms.testingDate,
          cureRightsSummary: edits.cureRightsSummary !== undefined ? edits.cureRightsSummary : terms.cureRightsSummary,
          reviewStatus: "CONFIRMED",
          reviewedBy: user.userId,
          reviewedAt: new Date(),
        })
        .where(eq(covenantTerms.id, terms.id))
        .returning();
      if (!row) throw notFound("Covenant terms");
      await transitionRun(tx, locked[0], "TERMS_CONFIRMED");
      const afterTerms = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).limit(1);
      if (afterTerms[0]) await transitionRun(tx, afterTerms[0], "FINANCIALS_PENDING");
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "COVENANT_TERMS_CONFIRMED",
        entityType: "covenant_terms",
        entityId: terms.id,
        metadata: { thresholdBps: nextThreshold, revision: body.revision },
        payload: { thresholdBps: nextThreshold, edits },
      });
      return row;
    });
    return {
      data: { terms: serializeTerms(updated), status: "FINANCIALS_PENDING" },
      meta: meta(request),
    };
  });

  app.put("/v1/analysis-runs/:id/financial-inputs", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const body = parseBody(financialInputsRequestSchema, request.body);
    const context = await loadRun(user.organizationId, id);
    if (context.run.status !== "FINANCIALS_PENDING") {
      throw conflict("ANALYSIS_STATE_CONFLICT", "Financial inputs are not available in the current state.", {
        currentStatus: context.run.status,
      });
    }
    if (context.run.termsVersion !== body.termsVersion) {
      throw conflict("TERMS_VERSION_STALE", "The confirmed terms changed. Reload before entering figures.");
    }
    const terms = await termsFor(id);
    if (!terms || terms.reviewStatus !== "CONFIRMED") {
      throw conflict("TERMS_NOT_CONFIRMED", "Confirm the covenant terms before entering financial inputs.");
    }
    if (terms.currency && terms.currency !== body.currency) {
      throw unprocessable("CURRENCY_MISMATCH", `Covenant currency is ${terms.currency}.`);
    }
    if (context.facility.currency !== body.currency) {
      throw unprocessable("CURRENCY_MISMATCH", `Facility currency is ${context.facility.currency}.`);
    }
    if (BigInt(body.reportedEbitdaMinor) <= 0n) {
      throw unprocessable("ZERO_EBITDA", "Reported EBITDA must be positive.");
    }
    let applied;
    try {
      applied = applyAddbackCaps(
        terms.permittedAddbacks as unknown as PermittedAddback[],
        body.addbacks,
      );
    } catch (error) {
      throw unprocessable("INVALID_ADDBACK", error instanceof Error ? error.message : "Invalid add-back.");
    }
    const adjusted = (BigInt(body.reportedEbitdaMinor) + BigInt(applied.adjustedTotalMinor)).toString();
    if (BigInt(adjusted) <= 0n) {
      throw unprocessable("ZERO_ADJUSTED_EBITDA", "Adjusted EBITDA must be positive before calculation.");
    }
    const snapshot: FinancialSnapshot = {
      currency: body.currency,
      reportedEbitdaMinor: body.reportedEbitdaMinor,
      totalDebtMinor: body.totalDebtMinor,
      addbacks: applied.applied,
      adjustedEbitdaMinor: adjusted,
      capApplied: applied.capApplied,
      attestedAt: new Date().toISOString(),
      testDate: terms.testingDate ?? new Date().toISOString().slice(0, 10),
    };
    const hash = financialSnapshotHash(snapshot);
    const dek = await requireBorrowerDek(db, user.organizationId, context.borrower.id);
    const sealed = sealJson(snapshot, dek);
    await db.transaction(async (tx) => {
      const locked = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked[0]) throw notFound("Analysis run");
      if (locked[0].status !== "FINANCIALS_PENDING") {
        throw conflict("ANALYSIS_STATE_CONFLICT", "Financial inputs were already confirmed.");
      }
      const [existing] = await tx.select({ id: financialInputs.id }).from(financialInputs).where(eq(financialInputs.analysisRunId, id)).limit(1);
      if (existing) throw conflict("FINANCIALS_ALREADY_CONFIRMED", "Financial inputs are already confirmed for this run.");
      await tx.insert(financialInputs).values({
        organizationId: user.organizationId,
        analysisRunId: id,
        currency: body.currency,
        ciphertext: sealed.ciphertext,
        nonce: sealed.nonce,
        tag: sealed.tag,
        financialInputsHash: hash,
        attestedBy: user.userId,
        attestedAt: new Date(snapshot.attestedAt),
      });
      await transitionRun(tx, locked[0], "FINANCIALS_CONFIRMED", { financialInputsHash: hash });
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "FINANCIAL_INPUTS_CONFIRMED",
        entityType: "analysis_run",
        entityId: id,
        metadata: { financialInputsHash: hash, currency: body.currency, capApplied: applied.capApplied },
        payload: snapshot as unknown as Record<string, unknown>,
      });
    });
    return {
      data: {
        financialInputsHash: hash,
        currency: body.currency,
        reportedEbitdaMinor: body.reportedEbitdaMinor,
        totalDebtMinor: body.totalDebtMinor,
        adjustedEbitdaMinor: adjusted,
        addbacks: applied.applied,
        capApplied: applied.capApplied,
        attestedAt: snapshot.attestedAt,
        status: "FINANCIALS_CONFIRMED",
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/calculate", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const context = await loadRun(user.organizationId, id);
    if (!["FINANCIALS_CONFIRMED", "CALCULATED_SERV_PENDING"].includes(context.run.status)) {
      throw conflict("ANALYSIS_STATE_CONFLICT", "Calculation is not available in the current state.", {
        currentStatus: context.run.status,
      });
    }
    const terms = await termsFor(id);
    const financial = await financialFor(id);
    if (!terms || terms.reviewStatus !== "CONFIRMED") throw conflict("TERMS_NOT_CONFIRMED", "Terms are not confirmed.");
    if (!financial) throw conflict("FINANCIALS_MISSING", "Financial inputs are not confirmed.");
    const dek = await requireBorrowerDek(db, user.organizationId, context.borrower.id);
    let snapshot: FinancialSnapshot;
    try {
      snapshot = unsealJson<FinancialSnapshot>(sealedFrom(financial), dek);
    } catch {
      throw new ApiError(500, "SNAPSHOT_UNAVAILABLE", "The confirmed financial snapshot could not be opened.");
    }
    if (snapshot.currency !== financial.currency) {
      throw new ApiError(409, "SNAPSHOT_MISMATCH", "The financial snapshot currency does not match the run.");
    }
    const recomputedHash = financialSnapshotHash(snapshot);
    if (recomputedHash !== financial.financialInputsHash || recomputedHash !== context.run.financialInputsHash) {
      throw conflict("FINANCIAL_SNAPSHOT_CHANGED", "The financial snapshot hash no longer matches the run.");
    }

    const calculationInput = {
      debt: minorToDecimalString(snapshot.totalDebtMinor, snapshot.currency),
      reportedEbitda: minorToDecimalString(snapshot.reportedEbitdaMinor, snapshot.currency),
      addBacks: snapshot.addbacks.map((item) => ({
        label: item.code,
        amount: minorToDecimalString(item.appliedMinor, snapshot.currency),
        eligible: true,
        ...(item.sourceReference ? { sourceRef: item.sourceReference } : {}),
      })),
      thresholdBps: terms.thresholdBps,
      currency: snapshot.currency,
      testDate: snapshot.testDate,
    };
    const result = calculateLeverage(calculationInput);
    const formulaHash = sha256(canonicalize({
      thresholdBps: terms.thresholdBps,
      totalDebtDefinition: terms.totalDebtDefinition,
      ebitdaDefinition: terms.ebitdaDefinition,
      permittedAddbacks: terms.permittedAddbacks,
    }));
    const verification = verifyCalculation(calculationInput, result, {
      snapshotHash: context.run.financialInputsHash ?? "",
      currentSnapshotHash: recomputedHash,
      formulaHash,
      currentFormulaHash: formulaHash,
    });
    if (verification.result !== "VERIFIED") {
      await db.transaction(async (tx) => {
        const [current] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
        if (current) {
          await tx
            .update(analysisRuns)
            .set({ status: "FAILED", failureCode: "VALIDATION_FAILED", version: current.version + 1, completedAt: new Date() })
            .where(eq(analysisRuns.id, id));
          const { appendBorrowerAuditEventInTx } = await import("@assay/db");
          await appendBorrowerAuditEventInTx(tx, {
            organizationId: user.organizationId,
            borrowerId: context.borrower.id,
            actorType: "SYSTEM",
            eventType: "CALCULATION_FAILED",
            entityType: "analysis_run",
            entityId: id,
            metadata: { failureCodes: verification.failureCodes },
            payload: { verification },
          });
        }
      });
      throw new ApiError(500, "VALIDATION_FAILED", "The independent calculation check did not match. No result was recorded.");
    }

    const providers = fromEnv();
    let serv;
    try {
      serv = await providers.serv.reason(
        `You are SERV, Assay's bounded covenant reasoning node. Deterministic arithmetic is authoritative. You receive structured, non-identifying calculation facts only. Do not calculate, approve or invent values.
Confirm whether the deterministic baseline and stress classifications are internally coherent.
Return strict JSON only: {"agreement":"CONFIRMED|DISAGREES|UNCERTAIN","rationale":"<short reason>"}.`,
        JSON.stringify({
          thresholdBps: terms.thresholdBps,
          baseline: result.compliant ? "COMPLIANT" : "BREACH",
          ebitdaDownside: result.scenarios.find((item) => item.kind === "EBITDA_DOWNSIDE_10")?.status,
          debtUpside: result.scenarios.find((item) => item.kind === "DEBT_UPSIDE_10")?.status,
          headroomBand: scenarioRiskBand(result.headroomPct),
        }),
        300,
      );
    } catch (error) {
      await db.transaction(async (tx) => {
        const [current] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
        if (current && current.status === "FINANCIALS_CONFIRMED") {
          await tx
            .update(analysisRuns)
            .set({ status: "CALCULATED_SERV_PENDING", version: current.version + 1, updatedAt: new Date() })
            .where(eq(analysisRuns.id, id));
          const { appendBorrowerAuditEventInTx } = await import("@assay/db");
          await appendBorrowerAuditEventInTx(tx, {
            organizationId: user.organizationId,
            borrowerId: context.borrower.id,
            actorType: "SYSTEM",
            eventType: "SERV_UNAVAILABLE",
            entityType: "analysis_run",
            entityId: id,
            metadata: { failureCode: "SERV_UNAVAILABLE" },
            payload: { reason: error instanceof Error ? error.message.slice(0, 300) : "SERV unavailable" },
          });
        }
      });
      throw new ApiError(503, "SERV_UNAVAILABLE", "Calculation is preserved but SERV validation is pending. Retry calculation.");
    }
    const servParsed = servCalculationSchema.safeParse(parseJsonObject(serv.content));
    if (!servParsed.success) {
      throw new ApiError(502, "SERV_INVALID", "SERV returned an invalid reasoning result.");
    }
    if (servParsed.data.agreement === "DISAGREES") {
      await db.transaction(async (tx) => {
        const [current] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
        if (current) {
          await tx
            .update(analysisRuns)
            .set({ status: "FAILED", failureCode: "SERV_DISAGREEMENT", version: current.version + 1, completedAt: new Date() })
            .where(eq(analysisRuns.id, id));
          const { appendBorrowerAuditEventInTx } = await import("@assay/db");
          await appendBorrowerAuditEventInTx(tx, {
            organizationId: user.organizationId,
            borrowerId: context.borrower.id,
            actorType: "SYSTEM",
            eventType: "SERV_DISAGREEMENT",
            entityType: "analysis_run",
            entityId: id,
            metadata: { servTraceId: serv.traceId },
            payload: { serv: servParsed.data, traceId: serv.traceId },
          });
        }
      });
      throw new ApiError(502, "SERV_DISAGREEMENT", "SERV disagreed with the deterministic classification. The run was stopped.");
    }

    const outcome = result.compliant ? "COMPLIANT" : "BREACH";
    const sealedScenarios = result.scenarios.map((scenario) => ({
      scenario: scenario.kind === "EBITDA_DOWNSIDE_10" ? "EBITDA_DOWN_10" : scenario.kind === "DEBT_UPSIDE_10" ? "DEBT_UP_10" : "BASELINE",
      sealed: sealJson({
        kind: scenario.kind,
        debtMinor: decimalStringToMinor(scenario.debt, snapshot.currency),
        adjustedEbitdaMinor: decimalStringToMinor(scenario.adjustedEbitda, snapshot.currency),
        ratio: scenario.ratio,
        displayRatio: scenario.displayRatio,
        headroom: scenario.headroom,
        headroomPct: scenario.headroomPct,
        compliant: scenario.compliant,
      }, dek),
      result: scenario.compliant ? "COMPLIANT" : "BREACH",
      riskBand: scenarioRiskBand(scenario.headroomPct),
    })) as Array<{ scenario: "BASELINE" | "EBITDA_DOWN_10" | "DEBT_UP_10"; sealed: SealedColumns; result: "COMPLIANT" | "BREACH"; riskBand: "LOW" | "MEDIUM" | "HIGH" }>;

    const finalStatus = result.compliant ? "PROOF_PENDING" : "BREACH_REVIEW";
    const updated = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked) throw notFound("Analysis run");
      if (!["FINANCIALS_CONFIRMED", "CALCULATED_SERV_PENDING"].includes(locked.status)) {
        throw conflict("ANALYSIS_STATE_CONFLICT", "Calculation already completed.");
      }
      await tx.delete(scenarioResults).where(eq(scenarioResults.analysisRunId, id));
      for (const scenario of sealedScenarios) {
        await tx.insert(scenarioResults).values({
          organizationId: user.organizationId,
          analysisRunId: id,
          scenario: scenario.scenario,
          ciphertext: scenario.sealed.ciphertext,
          nonce: scenario.sealed.nonce,
          tag: scenario.sealed.tag,
          result: scenario.result,
          riskBand: scenario.riskBand,
        });
      }
      const row = await transitionRun(tx, locked, finalStatus, {
        resultCode: outcome,
        servTraceId: serv.traceId,
        providerTrace: {
          ...locked.providerTrace,
          calculation: {
            resultCode: outcome,
            scenarioOutcomes: sealedScenarios.map((item) => ({ scenario: item.scenario, result: item.result, riskBand: item.riskBand })),
            verification: verification.result,
            serv: { model: serv.model, traceId: serv.traceId, agreement: servParsed.data.agreement, promptVersion: SERV_PROMPT_VERSION },
          },
        },
        ...(result.compliant ? {} : { completedAt: new Date() }),
      });
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "SYSTEM",
        eventType: "CALCULATION_COMPLETED",
        entityType: "analysis_run",
        entityId: id,
        metadata: {
          resultCode: outcome,
          verification: verification.result,
          scenarioOutcomes: sealedScenarios.map((item) => ({ scenario: item.scenario, result: item.result, riskBand: item.riskBand })),
          servAgreement: servParsed.data.agreement,
        },
        payload: { result, verification, serv: servParsed.data },
      });
      return row;
    });

    return {
      data: {
        status: updated.status,
        resultCode: outcome,
        thresholdBps: terms.thresholdBps,
        baseline: result.scenarios[0],
        scenarios: result.scenarios,
        trace: result.trace,
        verification: verification.result,
        serv: { agreement: servParsed.data.agreement, rationale: servParsed.data.rationale, traceId: serv.traceId },
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/proof", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const idempotencyKey = requireIdempotencyKey(request);
    const context = await loadRun(user.organizationId, id);
    const existingProof = await proofFor(id);
    if (existingProof?.verified) {
      return { data: { ...serializeProof(existingProof), replayed: true }, meta: meta(request) };
    }
    if (context.run.status !== "PROOF_PENDING") {
      throw conflict("ANALYSIS_STATE_CONFLICT", "Proof generation is not available in the current state.", {
        currentStatus: context.run.status,
      });
    }
    const terms = await termsFor(id);
    const financial = await financialFor(id);
    if (!terms || !financial) throw conflict("SNAPSHOT_INCOMPLETE", "Terms and financial inputs must be confirmed first.");
    const dek = await requireBorrowerDek(db, user.organizationId, context.borrower.id);
    const snapshot = unsealJson<FinancialSnapshot>(sealedFrom(financial), dek);
    const witness = {
      debt: snapshot.totalDebtMinor,
      adjustedEbitda: snapshot.adjustedEbitdaMinor,
      thresholdBps: String(terms.thresholdBps),
    };
    const expectedCompliant = BigInt(witness.debt) * 10000n <= BigInt(witness.adjustedEbitda) * BigInt(witness.thresholdBps);
    if (!expectedCompliant) {
      throw conflict("BASELINE_BREACH", "A compliance proof is not generated for a baseline breach.");
    }

    let workerOutput: { proof: unknown; publicSignals: string[]; verified: boolean };
    try {
      workerOutput = await generateProof(witness);
      if (!workerOutput.verified) throw new Error("Proof worker reported an unverified proof.");
      if (!Array.isArray(workerOutput.publicSignals) || workerOutput.publicSignals.length !== 2) {
        throw new Error("Proof public signals are malformed.");
      }
      if (workerOutput.publicSignals[0] !== "1" || workerOutput.publicSignals[1] !== String(terms.thresholdBps)) {
        throw new Error("Proof public signals do not match the confirmed covenant.");
      }
    } catch {
      await db.transaction(async (tx) => {
        const [current] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
        if (current && current.status === "PROOF_PENDING") {
          await transitionRun(tx, current, "PROOF_FAILED", {
            failureCode: "PROOF_FAILED",
            completedAt: new Date(),
          });
          const [existing] = await tx.select({ id: proofArtifacts.id }).from(proofArtifacts).where(eq(proofArtifacts.analysisRunId, id)).limit(1);
          if (!existing) {
            await tx.insert(proofArtifacts).values({
              organizationId: user.organizationId,
              analysisRunId: id,
              circuitVersion: "leverage-v1",
              verificationKeyHash: sha256("unavailable"),
              proofStorageKey: "",
              publicSignals: [],
              witnessCommitment: sha256(canonicalize(witness)),
              status: "FAILED",
              verified: false,
              errorCode: "PROOF_FAILED",
            });
          }
          const { appendBorrowerAuditEventInTx } = await import("@assay/db");
          await appendBorrowerAuditEventInTx(tx, {
            organizationId: user.organizationId,
            borrowerId: context.borrower.id,
            actorType: "SYSTEM",
            eventType: "PROOF_FAILED",
            entityType: "analysis_run",
            entityId: id,
            metadata: { circuitVersion: "leverage-v1" },
            payload: { reason: "Proof generation or verification failed." },
          });
        }
      });
      throw new ApiError(500, "PROOF_FAILED", "The compliance proof could not be generated or verified. Approval is blocked.");
    }

    const proofKey = `org/${user.organizationId}/borrowers/${context.borrower.id}/proofs/${id}.json`;
    await storage.put(
      proofKey,
      new TextEncoder().encode(JSON.stringify({ proof: workerOutput.proof, publicSignals: workerOutput.publicSignals })),
      "application/json",
    );
    const vkPath = fileURLToPath(new URL("../../../../packages/proof/artifacts/verification_key.json", import.meta.url));
    const verificationKeyBytes = await readFile(vkPath);
    const verificationKeyHash = createHash("sha256").update(verificationKeyBytes).digest("hex");
    const witnessCommitment = sha256(canonicalize(witness));
    const proof = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked || locked.status !== "PROOF_PENDING") {
        throw conflict("ANALYSIS_STATE_CONFLICT", "Proof generation is no longer available.");
      }
      const [artifact] = await tx
        .insert(proofArtifacts)
        .values({
          organizationId: user.organizationId,
          analysisRunId: id,
          circuitVersion: "leverage-v1",
          verificationKeyHash,
          proofStorageKey: proofKey,
          publicSignals: workerOutput.publicSignals,
          witnessCommitment,
          status: "VERIFIED",
          verified: true,
          verifiedAt: new Date(),
        })
        .returning();
      if (!artifact) throw new Error("Proof artifact insert did not return a row.");
      await transitionRun(tx, locked, "PROOF_VERIFIED");
      const [verified] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).limit(1);
      if (verified) await transitionRun(tx, verified, "READY_FOR_MANAGER");
      await saveIdempotency(tx, {
        organizationId: user.organizationId,
        actorId: user.userId,
        key: idempotencyKey,
        method: "POST",
        route: "POST /v1/analysis-runs/:id/proof",
        hash: requestHash("POST /v1/analysis-runs/:id/proof", { id }),
        responseStatus: 201,
        resourceType: "proof_artifact",
        resourceId: artifact.id,
      });
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "SYSTEM",
        eventType: "PROOF_VERIFIED",
        entityType: "proof_artifact",
        entityId: artifact.id,
        metadata: {
          circuitVersion: artifact.circuitVersion,
          verificationKeyHash,
          witnessCommitment,
          publicSignals: workerOutput.publicSignals,
        },
        payload: { circuitVersion: artifact.circuitVersion, publicSignals: workerOutput.publicSignals },
      });
      return artifact;
    });
    reply.code(201);
    return { data: serializeProof(proof), meta: meta(request) };
  });

  app.get("/v1/analysis-runs/:id/proof", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR"]);
    const { id } = request.params as { id: string };
    await loadRun(user.organizationId, id);
    const proof = await proofFor(id);
    if (!proof) throw notFound("Proof artifact");
    return { data: serializeProof(proof), meta: meta(request) };
  });

  app.get("/v1/analysis-runs/:id/report", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const { id } = request.params as { id: string };
    const context = await loadRun(user.organizationId, id);
    if (user.role === "MANAGER") {
      return { data: await managerRunView(context.run, context.borrower, context.facility), meta: meta(request) };
    }
    if (user.role === "AUDITOR") {
      const base = await auditorRunView(context.run);
      const terms = await termsFor(id);
      return {
        data: {
          ...base,
          evidenceMetadata: terms
            ? (terms.evidence as Array<Record<string, unknown>>).map((item) => ({
                page: item.page,
                field: item.field,
              }))
            : [],
        },
        meta: meta(request),
      };
    }
    if (user.role === "ADMIN") {
      return {
        data: {
          id: context.run.id,
          status: context.run.status,
          resultCode: context.run.resultCode,
          version: context.run.version,
          proofStatus: (await proofFor(id))?.status ?? null,
          createdAt: context.run.createdAt.toISOString(),
        },
        meta: meta(request),
      };
    }
    const terms = await termsFor(id);
    const financial = await financialFor(id);
    const proof = await proofFor(id);
    const [approval] = await db.select().from(approvals).where(eq(approvals.analysisRunId, id)).limit(1);
    let snapshot: FinancialSnapshot | null = null;
    let scenarios: Awaited<ReturnType<typeof analystScenarioResults>> = [];
    if (financial) {
      const dek = await requireBorrowerDek(db, user.organizationId, context.borrower.id);
      snapshot = unsealJson<FinancialSnapshot>(sealedFrom(financial), dek);
      scenarios = await analystScenarioResults(id);
    }
    return {
      data: {
        run: serializeRunAnalyst(context.run),
        borrower: { id: context.borrower.id, displayAlias: context.borrower.displayAlias, referenceToken: context.borrower.referenceToken },
        facility: { id: context.facility.id, label: context.facility.label, currency: context.facility.currency },
        document: { id: context.document.id, status: context.document.status, pageCount: context.document.pageCount },
        terms: terms ? serializeTerms(terms) : null,
        financialInputs: snapshot,
        scenarios,
        proof: proof ? serializeProof(proof) : null,
        approval: approval
          ? {
              decision: approval.decision,
              riskAcknowledged: approval.riskAcknowledged,
              rationale: approval.rationale,
              analysisVersion: approval.analysisVersion,
              decidedAt: approval.createdAt.toISOString(),
            }
          : null,
      },
      meta: meta(request),
    };
  });

  app.get("/v1/approvals/queue", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["MANAGER"]);
    const rows = await db
      .select({ run: analysisRuns, borrower: borrowers, facility: facilities })
      .from(analysisRuns)
      .innerJoin(borrowers, eq(borrowers.id, analysisRuns.borrowerId))
      .innerJoin(facilities, eq(facilities.id, analysisRuns.facilityId))
      .where(and(eq(analysisRuns.organizationId, user.organizationId), eq(analysisRuns.status, "READY_FOR_MANAGER")))
      .orderBy(asc(analysisRuns.createdAt))
      .limit(50);
    const queue = [];
    for (const row of rows) {
      const view = await managerRunView(row.run, row.borrower, row.facility);
      queue.push({ ...view, stressedBreach: view.scenarioBands.some((band) => band.result === "BREACH") });
    }
    return { data: queue, meta: meta(request) };
  });

  app.post("/v1/analysis-runs/:id/approvals", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["MANAGER"]);
    const { id } = request.params as { id: string };
    const idempotencyKey = requireIdempotencyKey(request);
    const body = parseBody(approvalDecisionSchema, request.body);
    const context = await loadRun(user.organizationId, id);
    if (context.run.createdBy === user.userId) {
      throw conflict("SELF_APPROVAL_FORBIDDEN", "A manager cannot approve an analysis they created.");
    }
    const route = "POST /v1/analysis-runs/:id/approvals";
    const hash = requestHash(route, { id, ...body });
    const existing = await findIdempotency(db, {
      organizationId: user.organizationId,
      actorId: user.userId,
      key: idempotencyKey,
      route,
      hash,
    });
    if (existing) {
      const [row] = await db.select().from(approvals).where(eq(approvals.id, existing.resourceId)).limit(1);
      if (row) {
        return {
          data: { decision: row.decision, analysisVersion: row.analysisVersion, decidedAt: row.createdAt.toISOString(), replayed: true },
          meta: meta(request),
        };
      }
    }
    const terms = await termsFor(id);
    const financial = await financialFor(id);
    const proof = await proofFor(id);
    if (!terms || !financial || !proof) throw conflict("APPROVAL_PRECONDITION", "Terms, financial inputs and proof are required.");
    if (body.analysisVersion !== context.run.version) {
      throw conflict("VERSION_CONFLICT", "The analysis changed since you loaded it.");
    }

    const approval = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked) throw notFound("Analysis run");
      if (locked.status !== "READY_FOR_MANAGER") {
        throw conflict("ANALYSIS_STATE_CONFLICT", "This analysis is not awaiting a manager decision.", {
          currentStatus: locked.status,
        });
      }
      if (locked.version !== body.analysisVersion) {
        throw conflict("VERSION_CONFLICT", "The analysis changed during approval.");
      }
      if (locked.resultCode !== "COMPLIANT") {
        throw conflict("BASELINE_BREACH", "A baseline breach cannot be approved.");
      }
      if (!proof.verified || proof.status !== "VERIFIED" || proof.analysisRunId !== id) {
        throw conflict("PROOF_REQUIRED", "A verified proof for this exact analysis is required.");
      }
      if (body.proofArtifactId !== proof.id) {
        throw conflict("PROOF_MISMATCH", "The supplied proof does not belong to this analysis.");
      }
      if (proof.publicSignals[1] !== String(terms.thresholdBps)) {
        throw conflict("PROOF_MISMATCH", "The proof threshold does not match the confirmed terms.");
      }
      const dek = await requireBorrowerDek(tx as never, user.organizationId, context.borrower.id);
      const snapshot = unsealJson<FinancialSnapshot>(sealedFrom(financial), dek);
      const currentHash = financialSnapshotHash(snapshot);
      if (currentHash !== locked.financialInputsHash) {
        throw conflict("FINANCIAL_SNAPSHOT_CHANGED", "Financial inputs changed after proof generation.");
      }
      const scenarioRows = await tx.select().from(scenarioResults).where(eq(scenarioResults.analysisRunId, id));
      const stressedBreach = scenarioRows.some((row) => row.result === "BREACH" && row.scenario !== "BASELINE");
      if (body.decision === "APPROVE" && stressedBreach && (!body.riskAcknowledged || !body.rationale?.trim())) {
        throw unprocessable("RISK_ACKNOWLEDGEMENT_REQUIRED", "A stressed scenario breaches; acknowledge the risk and provide a rationale.");
      }
      if (body.decision === "REJECT" && !body.rationale?.trim()) {
        throw unprocessable("REASON_REQUIRED", "A rejection rationale is required.");
      }
      const [row] = await tx
        .insert(approvals)
        .values({
          organizationId: user.organizationId,
          analysisRunId: id,
          managerId: user.userId,
          decision: body.decision,
          riskAcknowledged: body.riskAcknowledged,
          rationale: body.rationale ?? null,
          proofArtifactId: proof.id,
          analysisVersion: locked.version,
        })
        .returning();
      if (!row) throw new Error("Approval insert did not return a row.");
      await transitionRun(tx, locked, body.decision === "APPROVE" ? "APPROVED" : "REJECTED", { completedAt: new Date() });
      await saveIdempotency(tx, {
        organizationId: user.organizationId,
        actorId: user.userId,
        key: idempotencyKey,
        method: "POST",
        route,
        hash,
        responseStatus: 201,
        resourceType: "approval",
        resourceId: row.id,
      });
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: body.decision === "APPROVE" ? "ANALYSIS_APPROVED" : "ANALYSIS_REJECTED",
        entityType: "analysis_run",
        entityId: id,
        metadata: {
          analysisVersion: locked.version,
          proofArtifactId: proof.id,
          decision: body.decision,
          stressedBreach,
        },
        payload: { rationale: body.rationale ?? null, riskAcknowledged: body.riskAcknowledged },
      });
      return row;
    });
    reply.code(201);
    return {
      data: { decision: approval.decision, analysisVersion: approval.analysisVersion, decidedAt: approval.createdAt.toISOString() },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/cancel", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const context = await loadRun(user.organizationId, id);
    const cancellable = [
      "DRAFT",
      "FILE_UPLOADED",
      "PARSING",
      "REDACTION_REVIEW",
      "REDACTION_CONFIRMED",
      "EXTRACTION_PENDING",
      "TERMS_REVIEW",
      "TERMS_CONFIRMED",
      "FINANCIALS_PENDING",
      "FINANCIALS_CONFIRMED",
      "CALCULATION_PENDING",
      "CALCULATED",
      "CALCULATED_SERV_PENDING",
      "PROOF_PENDING",
      "PROOF_VERIFIED",
      "READY_FOR_MANAGER",
    ];
    if (!cancellable.includes(context.run.status)) {
      throw conflict("ANALYSIS_STATE_CONFLICT", "This analysis can no longer be cancelled.");
    }
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, id)).for("update");
      if (!locked || !cancellable.includes(locked.status)) {
        throw conflict("ANALYSIS_STATE_CONFLICT", "This analysis can no longer be cancelled.");
      }
      await transitionRun(tx, locked, "CANCELLED", { completedAt: new Date() });
      const { appendBorrowerAuditEventInTx } = await import("@assay/db");
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: context.borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "ANALYSIS_CANCELLED",
        entityType: "analysis_run",
        entityId: id,
        metadata: { previousStatus: locked.status },
        payload: {},
      });
    });
    return { data: { status: "CANCELLED" }, meta: meta(request) };
  });
}

function generateProof(witness: Record<string, string>): Promise<{ proof: unknown; publicSignals: string[]; verified: boolean }> {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(new URL("../../../../packages/proof/scripts/prove-once.mjs", import.meta.url));
    const child = spawn(process.execPath, [script], { stdio: ["pipe", "pipe", "pipe"], env: process.env });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Proof generation timed out."));
    }, 120_000);
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr || "Proof worker failed."));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Proof worker returned invalid JSON."));
      }
    });
    child.stdin.end(JSON.stringify(witness));
  });
}

async function managerRunView(run: RunRow, borrower: typeof borrowers.$inferSelect, facility: typeof facilities.$inferSelect) {
  const terms = await termsFor(run.id);
  const proof = await proofFor(run.id);
  const scenarioRows = await db.select().from(scenarioResults).where(eq(scenarioResults.analysisRunId, run.id));
  const [approval] = await db.select().from(approvals).where(eq(approvals.analysisRunId, run.id)).limit(1);
  const [financial] = await db.select().from(financialInputs).where(eq(financialInputs.analysisRunId, run.id)).limit(1);
  return {
    id: run.id,
    status: run.status,
    resultCode: run.resultCode,
    analysisVersion: run.version,
    borrowerReference: borrower.referenceToken,
    facilityReference: facility.facilityReferenceToken,
    facilityLabel: facility.label,
    thresholdBps: terms?.thresholdBps ?? null,
    termsVersion: run.termsVersion,
    proof: proof
      ? {
          id: proof.id,
          status: proof.status,
          verified: proof.verified,
          verifiedAt: proof.verifiedAt?.toISOString() ?? null,
          publicSignals: proof.publicSignals,
        }
      : null,
    scenarioBands: scenarioRows.map((row) => ({ scenario: row.scenario, result: row.result, riskBand: row.riskBand })),
    analystAttestedAt: financial?.attestedAt.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    approval: approval
      ? {
          decision: approval.decision,
          riskAcknowledged: approval.riskAcknowledged,
          decidedAt: approval.createdAt.toISOString(),
          analysisVersion: approval.analysisVersion,
        }
      : null,
  };
}

async function auditorRunView(run: RunRow) {
  const proof = await proofFor(run.id);
  const [approval] = await db.select().from(approvals).where(eq(approvals.analysisRunId, run.id)).limit(1);
  return {
    id: run.id,
    status: run.status,
    resultCode: run.resultCode,
    analysisVersion: run.version,
    termsVersion: run.termsVersion,
    financialInputsHash: run.financialInputsHash,
    proof: proof
      ? {
          circuitVersion: proof.circuitVersion,
          verificationKeyHash: proof.verificationKeyHash,
          publicSignals: proof.publicSignals,
          witnessCommitment: proof.witnessCommitment,
          status: proof.status,
          verified: proof.verified,
          verifiedAt: proof.verifiedAt?.toISOString() ?? null,
        }
      : null,
    approval: approval
      ? {
          decision: approval.decision,
          managerId: approval.managerId,
          proofArtifactId: approval.proofArtifactId,
          analysisVersion: approval.analysisVersion,
          decidedAt: approval.createdAt.toISOString(),
        }
      : null,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

function serializeRunAnalyst(run: RunRow) {
  return {
    id: run.id,
    runNumber: run.runNumber,
    status: run.status,
    resultCode: run.resultCode,
    failureCode: run.failureCode,
    termsVersion: run.termsVersion,
    financialInputsHash: run.financialInputsHash,
    version: run.version,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

