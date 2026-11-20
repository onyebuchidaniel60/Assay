import type { FastifyInstance } from "fastify";
import { and, eq } from "@assay/db";
import { createDb, jobs, paymentIntents } from "@assay/db";
import { externalEvidenceRequestSchema, paymentAuthorizationSchema } from "@assay/contracts";
import {
  planEvidenceNeeds,
  type FinancialDataRequest,
  type ProviderQuote,
} from "@assay/financial-data";
import { FinancialDataError } from "@assay/financial-data";
import {
  meta,
  parseBody,
  requireAuth,
  requireIdempotencyKey,
  requireRole,
} from "../lib/http.js";
import { ApiError, conflict, notFound } from "../lib/errors.js";
import { loadPaymentRuntimeConfig } from "../lib/payment-config.js";
import { getFinancialProvider, getFinancialProviderStatuses } from "../lib/financial-providers.js";
import {
  getExternalEvidenceById,
  listExternalEvidence,
  recordEvidenceFailureAudit,
  recordEvidenceRequestAudit,
  storeExternalEvidence,
} from "../lib/evidence-service.js";
import {
  authorizePaymentIntent,
  createPaymentIntentFromQuote,
  getSessionSummary,
  listPaymentIntents,
  loadRunForPayment,
  PaymentServiceError,
} from "../lib/payment-service.js";

const db = createDb();

const EVIDENCE_EDITABLE_STATUSES = new Set([
  "TERMS_CONFIRMED",
  "FINANCIALS_PENDING",
  "FINANCIALS_CONFIRMED",
  "CALCULATION_PENDING",
  "CALCULATED",
  "CALCULATED_SERV_PENDING",
  "BREACH_REVIEW",
  "PROOF_PENDING",
  "PROOF_VERIFIED",
  "READY_FOR_MANAGER",
]);

function toFinancialRequest(body: {
  kind: FinancialDataRequest["kind"];
  ticker?: string | undefined;
  cik?: string | undefined;
  fiscalYear?: number | undefined;
  reason: string;
  linkedField?: string | undefined;
}): FinancialDataRequest {
  return {
    kind: body.kind,
    ...(body.ticker ? { ticker: body.ticker } : {}),
    ...(body.cik ? { cik: body.cik } : {}),
    ...(body.fiscalYear ? { fiscalYear: body.fiscalYear } : {}),
    reason: body.reason,
    ...(body.linkedField ? { linkedField: body.linkedField } : {}),
  };
}

function evidenceContext(body: {
  kind: string;
  ticker?: string | undefined;
  cik?: string | undefined;
  fiscalYear?: number | undefined;
  reason: string;
  linkedField?: string | undefined;
  publicReferenceConfirmed: boolean;
  providerId: string;
}): Record<string, unknown> {
  return {
    kind: body.kind,
    providerId: body.providerId,
    ...(body.ticker ? { ticker: body.ticker } : {}),
    ...(body.cik ? { cik: body.cik } : {}),
    ...(body.fiscalYear ? { fiscalYear: body.fiscalYear } : {}),
    ...(body.linkedField ? { linkedField: body.linkedField } : {}),
    reason: body.reason,
    publicReferenceConfirmed: body.publicReferenceConfirmed,
  };
}

function mapFinancialError(error: unknown): never {
  if (error instanceof FinancialDataError) {
    throw new ApiError(error.statusCode, error.code, error.message, error.details);
  }
  throw error;
}

function assertEvidenceEditable(status: string): void {
  if (!EVIDENCE_EDITABLE_STATUSES.has(status)) {
    throw conflict(
      "EVIDENCE_STATE_CONFLICT",
      "External evidence can only be requested after terms are confirmed and before final approval.",
      { status },
    );
  }
}

async function runOr404(organizationId: string, runId: string) {
  const run = await loadRunForPayment(db, organizationId, runId);
  if (!run) throw notFound("Analysis run");
  return run;
}

async function intentOr404(organizationId: string, runId: string, intentId: string) {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(
      and(
        eq(paymentIntents.id, intentId),
        eq(paymentIntents.organizationId, organizationId),
        eq(paymentIntents.analysisRunId, runId),
      ),
    )
    .limit(1);
  if (!intent) throw notFound("Payment intent");
  return intent;
}

function providerCompatibility(quote: ProviderQuote) {
  return {
    providerId: quote.providerId,
    displayName: quote.displayName,
    endpoint: quote.endpoint,
    paymentRequired: quote.paymentRequired,
    network: quote.terms?.network ?? null,
    asset: quote.terms?.asset ?? null,
    amountMinor: quote.terms?.amountMinor ?? null,
    payTo: quote.terms?.payTo ?? null,
    arcCompatible: quote.arcCompatible,
    arcCompatibilityNote: quote.arcCompatibilityNote,
  };
}

export function registerExternalEvidenceRoutes(app: FastifyInstance) {
  app.get("/v1/analysis-runs/:id/external-evidence", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const { id } = request.params as { id: string };
    const run = await runOr404(user.organizationId, id);
    const query = request.query as { ticker?: string; cik?: string; fiscalYear?: string };
    const analyst = user.role === "ANALYST" || user.role === "ADMIN";
    const evidence = await listExternalEvidence({
      db,
      organizationId: user.organizationId,
      borrowerId: run.borrowerId,
      analysisRunId: id,
      includePayload: analyst,
    });
    const intents = analyst ? await listPaymentIntents({ db, organizationId: user.organizationId, analysisRunId: id }) : [];
    const latestContext = intents.find((intent) => intent.requestContext.ticker || intent.requestContext.cik)?.requestContext ?? {};
    const latestPayloadCompany = (evidence.find((item) => item.payload)?.payload as { company?: { ticker?: string; cik?: string } } | undefined)?.company;
    const ticker =
      query.ticker?.toUpperCase() ??
      (typeof latestContext.ticker === "string" ? latestContext.ticker : latestPayloadCompany?.ticker) ??
      null;
    const cik =
      query.cik ??
      (typeof latestContext.cik === "string" ? latestContext.cik : latestPayloadCompany?.cik) ??
      null;
    const fiscalYear = query.fiscalYear
      ? Number(query.fiscalYear)
      : typeof latestContext.fiscalYear === "number"
        ? latestContext.fiscalYear
        : null;
    const plan = planEvidenceNeeds({
      publicReferenceLinked: Boolean(ticker || cik),
      ticker,
      cik,
      fiscalYear,
      termsConfirmed: !["DRAFT", "FILE_UPLOADED", "PARSING", "REDACTION_REVIEW", "REDACTION_CONFIRMED", "EXTRACTION_PENDING", "TERMS_REVIEW"].includes(run.status),
      financialInputsPresent: ["FINANCIALS_CONFIRMED", "CALCULATION_PENDING", "CALCULATED", "READY_FOR_MANAGER", "APPROVED"].includes(run.status),
      includePaidCandidates: analyst,
    });
    const config = loadPaymentRuntimeConfig();
    return {
      data: {
        runId: id,
        plan,
        evidence,
        payments: intents,
        paymentSession: analyst ? await getSessionSummary({ db, organizationId: user.organizationId, config }) : null,
        providerStatuses: await getFinancialProviderStatuses(config),
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/external-evidence/free", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const idempotencyKey = requireIdempotencyKey(request);
    const body = parseBody(externalEvidenceRequestSchema, request.body);
    if (body.providerId !== "sec-edgar") {
      throw new ApiError(400, "PROVIDER_NOT_FREE", "Use the paid quote route for this provider.", { providerId: body.providerId });
    }
    const run = await runOr404(user.organizationId, id);
    assertEvidenceEditable(run.status);
    const config = loadPaymentRuntimeConfig();
    const provider = getFinancialProvider("sec-edgar", config);
    const context = evidenceContext(body);
    const financialRequest = toFinancialRequest(body);

    const existingById = await db
      .select({ id: paymentIntents.id })
      .from(paymentIntents)
      .where(and(eq(paymentIntents.organizationId, user.organizationId), eq(paymentIntents.idempotencyKey, idempotencyKey)))
      .limit(1);
    if (existingById[0]) {
      throw conflict("IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a paid request.", {
        paymentIntentId: existingById[0].id,
      });
    }

    await db.transaction(async (tx) => {
      await recordEvidenceRequestAudit({
        tx,
        organizationId: user.organizationId,
        borrowerId: run.borrowerId,
        analysisRunId: id,
        providerId: body.providerId,
        kind: body.kind,
        requestContext: context,
        actorId: user.userId,
      });
    });

    let result;
    try {
      result = await provider.retrieve(financialRequest);
    } catch (error) {
      await recordEvidenceFailureAudit({
        db,
        organizationId: user.organizationId,
        borrowerId: run.borrowerId,
        analysisRunId: id,
        providerId: body.providerId,
        kind: body.kind,
        errorCode: error instanceof FinancialDataError ? error.code : "PROVIDER_FAILURE",
        message: error instanceof Error ? error.message : "The external-data provider failed.",
        actorId: user.userId,
      });
      mapFinancialError(error);
    }

    const evidence = await storeExternalEvidence({
      db,
      organizationId: user.organizationId,
      borrowerId: run.borrowerId,
      analysisRunId: id,
      paymentIntentId: null,
      result,
      requestContext: context,
      createdBy: user.userId,
    });
    reply.code(201);
    return {
      data: {
        evidence,
        validationStatus: evidence.validationStatus,
        source: {
          providerId: evidence.providerId,
          publisher: evidence.publisher,
          sourceUrl: evidence.sourceUrl,
          reportingPeriod: evidence.reportingPeriod,
          retrievedAt: evidence.retrievedAt,
          contentSha256: evidence.contentSha256,
        },
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/external-evidence/quote", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const idempotencyKey = requireIdempotencyKey(request);
    const body = parseBody(externalEvidenceRequestSchema, request.body);
    if (body.providerId === "sec-edgar") {
      throw new ApiError(400, "FREE_PROVIDER", "SEC EDGAR is free. Use the free evidence route; no payment is required.");
    }
    const run = await runOr404(user.organizationId, id);
    assertEvidenceEditable(run.status);
    const config = loadPaymentRuntimeConfig();
    const provider = getFinancialProvider(body.providerId, config);
    const context = evidenceContext(body);
    const financialRequest = toFinancialRequest(body);
    let quote: ProviderQuote;
    try {
      quote = await provider.getQuote(financialRequest);
    } catch (error) {
      mapFinancialError(error);
    }
    if (!quote.paymentRequired || !quote.terms) {
      throw new ApiError(400, "PAYMENT_NOT_REQUIRED", "This request does not require a payment. Use the free evidence route.");
    }
    let intent;
    try {
      intent = await createPaymentIntentFromQuote({
        db,
        config,
        actor: { organizationId: user.organizationId, userId: user.userId, role: user.role },
        run,
        providerQuote: quote,
        serviceId: `${body.providerId}:${body.kind}`,
        idempotencyKey,
        requestContext: context,
      });
    } catch (error) {
      if (error instanceof PaymentServiceError) {
        throw new ApiError(error.statusCode, error.code, error.message, error.details);
      }
      throw error;
    }
    reply.code(201);
    return {
      data: {
        intent: intent.intent,
        replayed: intent.replayed,
        allowed: intent.intent.status !== "POLICY_REJECTED",
        provider: providerCompatibility(quote),
        message:
          intent.intent.status === "POLICY_REJECTED"
            ? "The deterministic spending policy rejected this provider requirement. No payment was executed."
            : "The provider requirement is within policy. The analyst must authorize it explicitly before execution.",
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/external-evidence/authorize", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id } = request.params as { id: string };
    const body = parseBody(paymentAuthorizationSchema, request.body);
    await runOr404(user.organizationId, id);
    await intentOr404(user.organizationId, id, body.paymentIntentId);
    const config = loadPaymentRuntimeConfig();
    let result;
    try {
      result = await authorizePaymentIntent({
        db,
        config,
        actor: { organizationId: user.organizationId, userId: user.userId, role: user.role },
        intentId: body.paymentIntentId,
        expectedQuoteSha256: body.expectedQuoteSha256,
      });
    } catch (error) {
      if (error instanceof PaymentServiceError) {
        throw new ApiError(error.statusCode, error.code, error.message, error.details);
      }
      throw error;
    }
    reply.code(202);
    return {
      data: {
        intent: result.intent,
        replayed: result.replayed,
        authorized: result.intent.status === "AUTHORIZED",
        message:
          result.intent.status === "AUTHORIZED"
            ? "The payment was authorized and queued. It is not settled until the worker records a verified receipt."
            : result.intent.rejectionReason ?? "The payment was not authorized.",
      },
      meta: meta(request),
    };
  });

  app.post("/v1/analysis-runs/:id/external-evidence/payments/:intentId/reconcile", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "ADMIN"]);
    const { id, intentId } = request.params as { id: string; intentId: string };
    const intent = await intentOr404(user.organizationId, id, intentId);
    await db
      .insert(jobs)
      .values({
        organizationId: user.organizationId,
        jobType: "payment.reconcile",
        payload: { paymentIntentId: intent.id },
        idempotencyKey: `payment.reconcile:${intent.id}`,
        maxAttempts: 10,
        nextRunAt: new Date(),
      })
      .onConflictDoUpdate({
        target: jobs.idempotencyKey,
        set: {
          status: "QUEUED",
          attempts: 0,
          nextRunAt: new Date(),
          lastErrorCode: null,
          leaseUntil: null,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date(),
        },
      });
    reply.code(202);
    return {
      data: {
        paymentIntentId: intent.id,
        status: intent.status,
        message: "Reconciliation was queued. It will look up the original authorization and will not create a second payment.",
      },
      meta: meta(request),
    };
  });

  app.get("/v1/analysis-runs/:id/external-evidence/:evidenceId", async (request, reply) => {
    const user = await requireAuth(request, reply);
    requireRole(user, ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
    const { id, evidenceId } = request.params as { id: string; evidenceId: string };
    const run = await runOr404(user.organizationId, id);
    const evidence = await getExternalEvidenceById({
      db,
      organizationId: user.organizationId,
      borrowerId: run.borrowerId,
      evidenceId,
      includePayload: user.role === "ANALYST" || user.role === "ADMIN",
    });
    if (!evidence) throw notFound("External evidence");
    return { data: evidence, meta: meta(request) };
  });
}
