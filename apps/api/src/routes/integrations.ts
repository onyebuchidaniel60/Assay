import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "@assay/db";
import { analysisRuns, borrowers, createDb, reppoEvaluations } from "@assay/db";
import { feedbackCreateSchema, reppoSubmitSchema } from "@assay/contracts";
import { appendBorrowerAuditEventInTx } from "@assay/db";
import { meta, parseBody, requireAuth, requireRole } from "../lib/http.js";
import { ApiError, notFound } from "../lib/errors.js";
import {
  loadReppoEvaluation,
  serializeEvaluation,
  submitFeedbackToReppo,
} from "../lib/reppo.js";
import { createArcProvider } from "../lib/arc-provider.js";
import { getFinancialProviderStatuses } from "../lib/financial-providers.js";
import { loadPaymentRuntimeConfig, paymentRuntimeReady } from "../lib/payment-config.js";
import { getSessionSummary } from "../lib/payment-service.js";

const db = createDb();

function booleanEnv(name: string): boolean {
  return (process.env[name] ?? "").toLowerCase() === "true";
}

type ArcStatusCache = {
  at: number;
  value: Record<string, unknown>;
};

let arcStatusCache = new Map<string, ArcStatusCache>();

async function arcStatus(organizationId: string): Promise<Record<string, unknown>> {
  const cached = arcStatusCache.get(organizationId);
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  const config = loadPaymentRuntimeConfig();
  let provider: ReturnType<typeof createArcProvider> | null = null;
  let providerError: string | null = null;
  try {
    provider = createArcProvider(config);
  } catch (error) {
    providerError = error instanceof Error ? error.message : "The Arc provider could not be initialized.";
  }

  const [facilitator, balances, session, financialProviders] = await Promise.all([
    provider
      ? provider.getFacilitatorStatus().catch((error) => ({
          reachable: false,
          supportedNetwork: false,
          supportedAsset: false,
          supportedKinds: [],
          error: error instanceof Error ? error.message : "Facilitator status is unavailable.",
        }))
      : Promise.resolve({ reachable: false, supportedNetwork: false, supportedAsset: false, supportedKinds: [], error: providerError }),
    provider && (config.payerAddress || config.privateKey)
      ? provider.getBalances().catch(() => null)
      : Promise.resolve(null),
    getSessionSummary({ db, organizationId, config }).catch(() => null),
    getFinancialProviderStatuses(config),
  ]);

  const value = {
    rail: config.settlementModel === "X402_EXACT_ONCHAIN" ? "arc-x402-exact" : "arc-circle-gateway",
    settlementModel: config.settlementModel,
    chain: config.chain,
    enabled: config.enabled,
    ready: paymentRuntimeReady(config),
    executionEnabled: config.executionEnabled && !config.dryRun,
    dryRun: config.dryRun,
    network: config.network,
    asset: config.asset,
    assetSymbol: "USDC",
    assetDecimals: 6,
    chainId: config.chainId,
    gatewayWallet: provider?.gatewayWallet ?? null,
    gatewayDomain: provider?.gatewayDomain ?? null,
    facilitatorUrl: provider?.facilitatorUrl ?? null,
    payerAddress: provider?.payerAddress ?? config.payerAddress ?? null,
    signingKeyConfigured: provider?.signingKeyConfigured ?? Boolean(config.privateKey),
    providerError,
    configError: config.configError,
    facilitator,
    balances,
    session,
    financialDataProviders: financialProviders,
    compatibility: {
      financialDatasets:
        "Documented x402 rail is Base mainnet USDC (eip155:8453). It is not Arc-compatible; Assay will not bridge or relabel a Base payment as Arc.",
      lonestarOracle:
        "Real x402 financial-data provider with an Arc mainnet USDC option (eip155:5042). The current Assay configuration uses standard x402 exact on Arc Mainnet when the operator explicitly allows eip155:5042 and the merchant recipient.",
      secEdgar: "Free public SEC XBRL data. It needs no payment and is used for real independent evidence when an analyst links a public CIK/ticker.",
    },
  };
  arcStatusCache.set(organizationId, { at: Date.now(), value });
  return value;
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
        payments: await arcStatus(user.organizationId),
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
}
