import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "@assay/db";
import { analysisRuns, borrowers, createDb, reppoEvaluations } from "@assay/db";
import { feedbackCreateSchema, kitePaymentIntentSchema, reppoSubmitSchema } from "@assay/contracts";
import { evaluateKitePayment } from "@assay/domain";
import { appendBorrowerAuditEventInTx } from "@assay/db";
import { meta, parseBody, requireAuth, requireRole } from "../lib/http.js";
import { ApiError, notFound } from "../lib/errors.js";
import {
  loadReppoEvaluation,
  serializeEvaluation,
  submitFeedbackToReppo,
} from "../lib/reppo.js";

const db = createDb();

function booleanEnv(name: string): boolean {
  return (process.env[name] ?? "").toLowerCase() === "true";
}

function kiteSession() {
  const remaining = Number(process.env.KITE_MAX_TOTAL_MINOR ?? "0");
  return {
    sessionId: process.env.KITE_SESSION_ID ?? "",
    status: (process.env.KITE_SESSION_EXPIRY && new Date(process.env.KITE_SESSION_EXPIRY).getTime() > Date.now()
      ? "active"
      : "expired") as "active" | "expired",
    asset: process.env.KITE_TESTNET_ASSET ?? "PIEUSD",
    maxPerTransaction: process.env.KITE_MAX_PER_PAYMENT_MINOR ?? "0",
    maxTotal: process.env.KITE_MAX_TOTAL_MINOR ?? "0",
    spentTotal: process.env.KITE_SPENT_TOTAL_MINOR ?? "0",
    reservedTotal: "0",
    expiresAt: process.env.KITE_SESSION_EXPIRY ?? new Date(0).toISOString(),
    remainingDisplayMinor: String(remaining),
  };
}

export function registerIntegrationRoutes(app: FastifyInstance) {
  app.get("/v1/integrations/status", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    return {
      data: {
        nearai: {
          configured: Boolean(process.env.NEARAI_API_KEY && process.env.NEARAI_MODEL),
          model: process.env.NEARAI_MODEL ?? null,
          attestationRequired: (process.env.NEARAI_ATTESTATION_REQUIRED ?? "true") === "true",
        },
        openrouter: {
          configured: Boolean(process.env.OPENROUTER_API_KEY),
          judgementModel: process.env.OPENROUTER_MODEL_JUDGEMENT ?? null,
          generationModel: process.env.OPENROUTER_MODEL_GENERATION ?? null,
        },
        serv: { configured: Boolean(process.env.SERV_REASONING_API_KEY), model: process.env.SERV_MODEL ?? null },
        presidio: { configured: Boolean(process.env.PRESIDIO_URL), mode: process.env.PRESIDIO_MODE ?? "REDUCED_PII_MODE" },
        storage: { configured: Boolean(process.env.NEON_STORAGE_BUCKET && process.env.AWS_ENDPOINT_URL_S3) },
        reppo: {
          enabled: booleanEnv("REPPO_ENABLED"),
          configured: Boolean(process.env.REPPO_API_KEY),
          status: booleanEnv("REPPO_ENABLED")
            ? process.env.REPPO_API_KEY
              ? "live"
              : "missing-key"
            : "disabled",
        },
        kite: {
          enabled: booleanEnv("KITE_ENABLED"),
          session: kiteSession(),
          paymentPath: "provider-blocked",
          providerBlocked: true,
          note: "The last approved testnet x402 request was blocked upstream. No payment is retried automatically.",
        },
      },
      meta: meta(request),
    };
  });

  app.post("/v1/feedback", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const body = parseBody(feedbackCreateSchema, request.body);
    const [run] = await db
      .select()
      .from(analysisRuns)
      .where(and(eq(analysisRuns.id, body.analysisRunId), eq(analysisRuns.organizationId, user.organizationId)))
      .limit(1);
    if (!run) throw notFound("Analysis run");
    const [borrower] = await db
      .select({ id: borrowers.id })
      .from(borrowers)
      .where(eq(borrowers.id, run.borrowerId))
      .limit(1);
    if (!borrower) throw notFound("Borrower");
    const id = randomUUID();
    await db.transaction(async (tx) => {
      const { feedbackRecords } = await import("@assay/db");
      await tx.insert(feedbackRecords).values({
        id,
        organizationId: user.organizationId,
        analysisRunId: body.analysisRunId,
        createdBy: user.userId,
        correctionType: body.correctionType,
        beforeValue: body.beforeValue,
        afterValue: body.afterValue,
        syntheticOnly: true,
      });
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: user.organizationId,
        borrowerId: borrower.id,
        actorType: "USER",
        actorId: user.userId,
        eventType: "FEEDBACK_RECORDED",
        entityType: "feedback_record",
        entityId: id,
        metadata: { correctionType: body.correctionType, syntheticOnly: true },
        payload: { beforeValue: body.beforeValue, afterValue: body.afterValue, note: body.note ?? null },
      });
    });

    let reppo: Record<string, unknown> = { status: "NOT_SUBMITTED" };
    if (body.submitToReppo) {
      try {
        const evaluation = await submitFeedbackToReppo({
          organizationId: user.organizationId,
          actorId: user.userId,
          feedbackRecordId: id,
          maxWaitMinutes: body.maxWaitMinutes,
        });
        reppo = { ...evaluation };
      } catch (error) {
        if (error instanceof ApiError) {
          reppo = { status: "FAILED", errorCode: error.code, errorMessage: error.message };
        } else {
          reppo = {
            status: "FAILED",
            errorCode: "REPPO_SUBMIT_FAILED",
            errorMessage: error instanceof Error ? error.message : "Reppo submission failed.",
          };
        }
      }
    }
    reply.code(201);
    return { data: { id, syntheticOnly: true, reppo }, meta: meta(request) };
  });

  app.get("/v1/integrations/reppo/evaluations", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const rows = await db
      .select()
      .from(reppoEvaluations)
      .where(eq(reppoEvaluations.organizationId, user.organizationId))
      .orderBy(desc(reppoEvaluations.submittedAt))
      .limit(50);
    return { data: rows.map(serializeEvaluation), meta: meta(request) };
  });

  app.post("/v1/integrations/reppo/evaluations", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const body = parseBody(reppoSubmitSchema, request.body);
    const evaluation = await submitFeedbackToReppo({
      organizationId: user.organizationId,
      actorId: user.userId,
      feedbackRecordId: body.feedbackRecordId,
      maxWaitMinutes: body.maxWaitMinutes,
    });
    if (evaluation.status === "FAILED") {
      reply.code(502);
      return {
        error: {
          code: evaluation.errorCode ?? "REPPO_SUBMIT_FAILED",
          message: evaluation.errorMessage ?? "Reppo rejected the evaluation submission.",
          requestId: String(request.id),
          details: { evaluation },
        },
      };
    }
    reply.code(202);
    return { data: evaluation, meta: meta(request) };
  });

  app.get("/v1/integrations/reppo/evaluations/:id", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const { id } = request.params as { id: string };
    const refresh = (request.query as { refresh?: string }).refresh === "1";
    const evaluation = await loadReppoEvaluation(user.organizationId, id, refresh);
    return { data: evaluation, meta: meta(request) };
  });

  app.post("/v1/integrations/kite/benchmark-requests", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const body = parseBody(kitePaymentIntentSchema, request.body);
    const session = kiteSession();
    const decision = evaluateKitePayment(
      {
        sessionId: session.sessionId,
        status: session.status,
        asset: session.asset,
        maxPerTransaction: session.maxPerTransaction,
        maxTotal: session.maxTotal,
        spentTotal: session.spentTotal,
        reservedTotal: session.reservedTotal,
        expiresAt: session.expiresAt,
      },
      { amount: body.amountMinor, asset: body.asset, idempotencyKey: body.idempotencyKey },
    );
    if (!decision.allowed) {
      reply.code(422);
      return {
        error: {
          code: decision.code.toUpperCase(),
          message: decision.message,
          requestId: String(request.id),
        },
      };
    }
    reply.code(503);
    return {
      error: {
        code: "PROVIDER_BLOCKED",
        message: "Local policy allowed the request, but the Kite x402 provider is currently blocking payment. No payment was attempted.",
        requestId: String(request.id),
        details: { remainingTotal: decision.remainingTotal, idempotencyKey: body.idempotencyKey, providerBlocked: true },
      },
    };
  });
}
