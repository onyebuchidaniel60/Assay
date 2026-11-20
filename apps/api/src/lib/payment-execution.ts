import { and, eq } from "@assay/db";
import {
  appendBorrowerAuditEventInTx,
  createDb,
  jobs,
  paymentIntents,
  paymentSessions,
} from "@assay/db";
import type { FinancialDataProviderId, FinancialDataRequest, FinancialDataResult, ProviderQuote } from "@assay/financial-data";
import { evaluatePaymentPolicy } from "@assay/domain";
import { sha256Json, type PaymentExecutionResult, type X402Quote } from "@assay/payments";
import { createArcProvider } from "./arc-provider.js";
import type { PaymentRuntimeConfig } from "./payment-config.js";
import { getFinancialProvider } from "./financial-providers.js";
import { storeExternalEvidence } from "./evidence-service.js";
import {
  appendPaymentAudit,
  policyFor,
  releaseReservation,
  serializePaymentIntent,
  settleReservation,
  touchIntentForSubmission,
} from "./payment-service.js";

const db = createDb();
type PaymentIntentRow = typeof paymentIntents.$inferSelect;

export class RetryPaymentReconciliation extends Error {
  constructor(message = "Payment reconciliation is still pending.") {
    super(message);
    this.name = "RetryPaymentReconciliation";
  }
}

function json(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function reconstructQuote(intent: PaymentIntentRow): X402Quote {
  const quote = json(intent.quote);
  const accepted = quote.accepted as X402Quote["accepted"];
  if (!accepted || typeof accepted !== "object") {
    throw new Error("The stored payment quote is missing its accepted requirement.");
  }
  const accepts = Array.isArray(quote.accepts) && quote.accepts.length > 0
    ? (quote.accepts as X402Quote["accepts"])
    : [accepted];
  return {
    x402Version: Number(quote.x402Version ?? 2),
    resource: quotedResource(quote, intent.endpoint),
    accepted,
    accepts,
    quoteSha256: intent.quoteSha256,
    fetchedAt: typeof quote.fetchedAt === "string" ? quote.fetchedAt : intent.createdAt.toISOString(),
    expiresAt: typeof quote.expiresAt === "string" ? quote.expiresAt : new Date(0).toISOString(),
  };
}

function quotedResource(quote: Record<string, unknown>, fallbackUrl: string): X402Quote["resource"] {
  const resource = quote.resource;
  if (resource && typeof resource === "object" && typeof (resource as Record<string, unknown>).url === "string") {
    return resource as X402Quote["resource"];
  }
  return { url: fallbackUrl };
}

function requestForEvidence(intent: PaymentIntentRow): FinancialDataRequest {
  const context = intent.requestContext;
  return {
    kind: String(context.kind ?? "COMPANY_FACTS") as FinancialDataRequest["kind"],
    ...(typeof context.ticker === "string" ? { ticker: context.ticker } : {}),
    ...(typeof context.cik === "string" ? { cik: context.cik } : {}),
    ...(typeof context.fiscalYear === "number" ? { fiscalYear: context.fiscalYear } : {}),
    reason: typeof context.reason === "string" ? context.reason : "External financial-data evidence.",
    ...(typeof context.linkedField === "string" ? { linkedField: context.linkedField } : {}),
  };
}

function providerQuoteFor(intent: PaymentIntentRow): ProviderQuote {
  const quote = json(intent.quote);
  const accepted = json(quote.accepted);
  const extra = json(accepted.extra);
  return {
    providerId: intent.providerId as ProviderQuote["providerId"],
    displayName: intent.providerName,
    endpoint: intent.endpoint,
    method: intent.method === "POST" ? "POST" : "GET",
    paymentRequired: true,
    terms: {
      network: intent.network,
      asset: intent.asset,
      amountMinor: intent.amountMinor,
      payTo: intent.payTo,
      scheme: intent.scheme,
      maxTimeoutSeconds: Number(accepted.maxTimeoutSeconds ?? 300),
      resourceUrl: quotedResource(quote, intent.endpoint).url,
      paymentRequiredHeader: "",
      ...(Object.keys(extra).length > 0 ? { extra } : {}),
    },
    arcCompatible: true,
    arcCompatibilityNote: "",
    unavailableReason: null,
  };
}

function transactionHash(value: string | null | undefined): string | null {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value) ? value : null;
}

export async function executePaymentJob(config: PaymentRuntimeConfig, intentId: string): Promise<void> {
  const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, intentId)).limit(1);
  if (!intent) return;
  if (intent.status === "SUBMITTING" || intent.status === "RECONCILIATION_REQUIRED") {
    await enqueueReconciliation(config, intent.id, intent.organizationId);
    return;
  }
  if (intent.status !== "AUTHORIZED") return;

  if (!config.executionEnabled || config.dryRun) {
    await markPaymentFailed({
      intent,
      code: "PAYMENT_EXECUTION_DISABLED",
      message: "Payment execution is disabled or in dry-run mode. No payment was submitted.",
      release: true,
    });
    return;
  }
  if (!intent.authorizedAt || Date.now() - intent.authorizedAt.getTime() > 10 * 60_000) {
    await markPaymentFailed({
      intent,
      code: "AUTHORIZATION_EXPIRED",
      message: "The payment authorization expired before execution. No payment was submitted.",
      release: true,
    });
    return;
  }
  const [session] = await db
    .select()
    .from(paymentSessions)
    .where(eq(paymentSessions.id, intent.paymentSessionId))
    .limit(1);
  if (!session || session.status !== "ACTIVE" || session.expiresAt.getTime() <= Date.now()) {
    await markPaymentFailed({
      intent,
      code: "SESSION_EXPIRED",
      message: "The spending session expired before execution. No payment was submitted.",
      release: true,
    });
    return;
  }

  const authorized = intent.authorizedAmountMinor ?? intent.amountMinor;
  const reservedWithoutThis = (() => {
    const next = BigInt(session.reservedTotalMinor) - BigInt(authorized);
    return (next < 0n ? 0n : next).toString();
  })();
  const recheck = evaluatePaymentPolicy(
    policyFor({
      session: { ...session, reservedTotalMinor: reservedWithoutThis },
      config,
      idempotencyKey: intent.idempotencyKey,
      requestFingerprint: intent.requestFingerprint,
      now: new Date(),
    }),
    {
      providerId: intent.providerId,
      endpoint: intent.endpoint,
      requirement: {
        scheme: intent.scheme,
        network: intent.network,
        asset: intent.asset,
        amountMinor: intent.amountMinor,
        payTo: intent.payTo,
        maxTimeoutSeconds: Number((json(intent.quote).accepted as Record<string, unknown> | undefined)?.maxTimeoutSeconds ?? 300),
      },
    },
  );
  if (!recheck.allowed) {
    await markPaymentFailed({
      intent,
      code: `POLICY_RECHECK_${recheck.code.toUpperCase()}`,
      message: `The spending policy no longer permits this payment at execution time: ${recheck.message}`,
      release: true,
    });
    return;
  }

  const submitting = await db.transaction(async (tx) => touchIntentForSubmission(tx, intent));
  if (!submitting) return;

  let result: PaymentExecutionResult;
  try {
    const provider = createArcProvider(config);
    result = await provider.execute({
      url: intent.endpoint,
      method: intent.method === "POST" ? "POST" : "GET",
      quote: reconstructQuote(submitting),
      timeoutMs: config.requestTimeoutMs,
    });
  } catch (error) {
    await db.transaction(async (tx) => {
      await tx
        .update(paymentIntents)
        .set({
          status: "RECONCILIATION_REQUIRED",
          failureCode: "EXECUTION_THREW_AFTER_SUBMISSION",
          failureMessage:
            error instanceof Error
              ? `The payment execution raised an error before a definitive result: ${error.message}`
              : "The payment execution raised an error before a definitive result.",
          dataStatus: "NOT_REQUESTED",
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, submitting.id));
      await appendPaymentAudit(tx, {
        organizationId: submitting.organizationId,
        borrowerId: submitting.borrowerId,
        eventType: "PAYMENT_RECONCILIATION_REQUIRED",
        intentId: submitting.id,
        actorType: "SYSTEM",
        metadata: { providerId: submitting.providerId, amountMinor: submitting.amountMinor },
        payload: { failureCode: "EXECUTION_THREW_AFTER_SUBMISSION" },
      });
    });
    await enqueueReconciliation(config, submitting.id, submitting.organizationId);
    return;
  }

  await applyExecutionResult(config, submitting, result);
}

async function applyExecutionResult(
  config: PaymentRuntimeConfig,
  intent: PaymentIntentRow,
  result: PaymentExecutionResult,
): Promise<void> {
  if (result.status === "FAILED") {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(paymentIntents).where(eq(paymentIntents.id, intent.id)).for("update").limit(1);
      if (!locked || ["CONFIRMED", "RECONCILED"].includes(locked.status)) return;
      await tx
        .update(paymentIntents)
        .set({
          status: "FAILED",
          failureCode: result.failureCode ?? "PAYMENT_FAILED",
          failureMessage: result.failureMessage ?? "The payment failed. No retry was made.",
          providerTransaction: result.providerTransaction,
          transactionHash: result.transactionHash,
          receipt: result.receipt as Record<string, unknown> | null,
          nonce: result.nonce || null,
          validBefore: result.validBefore ? new Date(Number(result.validBefore) * 1000) : null,
          settledAmountMinor: "0",
          dataStatus: "NOT_REQUESTED",
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, intent.id));
      await releaseReservation(tx, locked.paymentSessionId, locked.authorizedAmountMinor ?? locked.amountMinor);
      await appendPaymentAudit(tx, {
        organizationId: locked.organizationId,
        borrowerId: locked.borrowerId,
        eventType: "PAYMENT_FAILED",
        intentId: locked.id,
        actorType: "SYSTEM",
        metadata: {
          providerId: locked.providerId,
          failureCode: result.failureCode,
          amountMinor: locked.amountMinor,
        },
        payload: { failureMessage: result.failureMessage, httpStatus: result.httpStatus },
      });
    });
    return;
  }

  if (result.status === "RECONCILIATION_REQUIRED") {
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(paymentIntents).where(eq(paymentIntents.id, intent.id)).for("update").limit(1);
      if (!locked || ["CONFIRMED", "RECONCILED", "FAILED"].includes(locked.status)) return;
      await tx
        .update(paymentIntents)
        .set({
          status: "RECONCILIATION_REQUIRED",
          failureCode: result.failureCode ?? "SETTLEMENT_UNKNOWN",
          failureMessage: result.failureMessage ?? "Settlement could not be verified. Reconcile before retrying.",
          providerTransaction: result.providerTransaction,
          transactionHash: result.transactionHash,
          receipt: result.receipt as Record<string, unknown> | null,
          nonce: result.nonce || null,
          validBefore: result.validBefore ? new Date(Number(result.validBefore) * 1000) : null,
          dataStatus: "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, intent.id));
      await appendPaymentAudit(tx, {
        organizationId: locked.organizationId,
        borrowerId: locked.borrowerId,
        eventType: "PAYMENT_RECONCILIATION_REQUIRED",
        intentId: locked.id,
        actorType: "SYSTEM",
        metadata: {
          providerId: locked.providerId,
          failureCode: result.failureCode,
          nonce: result.nonce,
          amountMinor: locked.amountMinor,
        },
        payload: { failureMessage: result.failureMessage, httpStatus: result.httpStatus },
      });
    });
    if (result.data !== null && result.data !== undefined) {
      await storePaidEvidence(config, intent, result, true);
    }
    await enqueueReconciliation(config, intent.id, intent.organizationId);
    return;
  }

  // CONFIRMED
  let confirmed = false;
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(paymentIntents).where(eq(paymentIntents.id, intent.id)).for("update").limit(1);
    if (!locked) return;
    if (["CONFIRMED", "RECONCILED"].includes(locked.status)) {
      confirmed = true;
      return;
    }
    const authorized = locked.authorizedAmountMinor ?? locked.amountMinor;
    const settled = result.amountMinor;
    const mismatch = settled !== authorized;
    await tx
      .update(paymentIntents)
      .set({
        status: mismatch ? "RECONCILIATION_REQUIRED" : "CONFIRMED",
        providerTransaction: result.providerTransaction,
        transactionHash: result.transactionHash,
        receipt: result.receipt as Record<string, unknown> | null,
        settledAmountMinor: settled,
        nonce: result.nonce || null,
        validBefore: result.validBefore ? new Date(Number(result.validBefore) * 1000) : null,
        failureCode: mismatch ? "SETTLED_AMOUNT_MISMATCH" : null,
        failureMessage: mismatch
          ? "The settled amount differs from the authorized amount. Reconcile before relying on this payment."
          : null,
        dataStatus: "PENDING",
        settledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentIntents.id, locked.id));
    await settleReservation(tx, locked.paymentSessionId, authorized, settled);
    await appendPaymentAudit(tx, {
      organizationId: locked.organizationId,
      borrowerId: locked.borrowerId,
      eventType: mismatch ? "PAYMENT_RECONCILIATION_REQUIRED" : "PAYMENT_CONFIRMED",
      intentId: locked.id,
      actorType: "SYSTEM",
      metadata: {
        providerId: locked.providerId,
        amountMinor: settled,
        authorizedAmountMinor: authorized,
        network: locked.network,
        asset: locked.asset,
        transferId: result.transferId,
        transactionHash: result.transactionHash,
      },
      payload: {
        receipt: result.receipt,
        providerTransaction: result.providerTransaction,
        mismatch,
      },
    });
    confirmed = true;
  });
  if (!confirmed) return;
  if (result.data !== null && result.data !== undefined) {
    await storePaidEvidence(config, intent, result, false);
  } else {
    await markDataFailure(intent, "NO_DATA_IN_PAID_RESPONSE", "The payment was confirmed but the provider returned no data payload.");
  }
}

async function storePaidEvidence(
  config: PaymentRuntimeConfig,
  intent: PaymentIntentRow,
  result: PaymentExecutionResult,
  settlementUnverified: boolean,
): Promise<void> {
  try {
    const financialProvider = getFinancialProvider(intent.providerId as FinancialDataProviderId, config);
    const request = requestForEvidence(intent);
    const quote = providerQuoteFor(intent);
    let evidence: FinancialDataResult;
    if (financialProvider.interpretPaidPayload) {
      evidence = await financialProvider.interpretPaidPayload(request, quote, result.data, new Date().toISOString());
    } else {
      const contentSha256 = result.contentSha256 ?? sha256Json(result.data);
      evidence = {
        providerId: intent.providerId as FinancialDataProviderId,
        endpoint: intent.endpoint,
        sourceUrl: intent.endpoint,
        publisher: intent.providerName,
        retrievedAt: new Date().toISOString(),
        reportingPeriod: typeof intent.requestContext.fiscalYear === "number" ? `FY${intent.requestContext.fiscalYear}` : "Unknown period",
        data: {
          provider: intent.providerId as FinancialDataProviderId,
          publisher: intent.providerName,
          company: {
            name: String(intent.requestContext.ticker ?? "Unknown issuer"),
            ticker: typeof intent.requestContext.ticker === "string" ? intent.requestContext.ticker : null,
            cik: typeof intent.requestContext.cik === "string" ? intent.requestContext.cik : "",
            exchange: null,
          },
          reportingPeriod: {
            fiscalYear: typeof intent.requestContext.fiscalYear === "number" ? intent.requestContext.fiscalYear : new Date().getUTCFullYear() - 1,
            periodEnd: null,
            form: null,
          },
          facts: [],
          rawExcerpt: result.data as Record<string, unknown>,
        },
        contentSha256,
        limitations: [
          "The provider returned data after payment, but no provider-specific schema validator is registered.",
          "Treat this payload as untrusted until an analyst reviews it.",
        ],
        validationStatus: "INCOMPLETE" as const,
        validationErrors: ["No provider-specific validator is registered."],
      };
    }
    if (settlementUnverified) {
      evidence.validationStatus = "INCOMPLETE";
      evidence.limitations = [
        ...evidence.limitations,
        "Payment settlement could not be verified when the data was retrieved. Reconcile the transfer before relying on this evidence.",
      ];
      evidence.validationErrors = [
        ...evidence.validationErrors,
        "Payment settlement is unverified.",
      ];
    }
    await storeExternalEvidence({
      db,
      organizationId: intent.organizationId,
      borrowerId: intent.borrowerId,
      analysisRunId: intent.analysisRunId,
      paymentIntentId: intent.id,
      result: evidence,
      requestContext: intent.requestContext,
      createdBy: intent.actorId,
    });
    await db
      .update(paymentIntents)
      .set({ dataStatus: "RETRIEVED", dataFailureCode: null, updatedAt: new Date() })
      .where(eq(paymentIntents.id, intent.id));
  } catch (error) {
    await markDataFailure(
      intent,
      "DATA_RETRIEVAL_FAILED",
      error instanceof Error ? error.message : "The paid data could not be validated or stored.",
    );
  }
}

async function markDataFailure(intent: PaymentIntentRow, code: string, message: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(paymentIntents)
      .set({ dataStatus: "FAILED", dataFailureCode: code, updatedAt: new Date() })
      .where(eq(paymentIntents.id, intent.id));
    await appendBorrowerAuditEventInTx(tx, {
      organizationId: intent.organizationId,
      borrowerId: intent.borrowerId,
      actorType: "SYSTEM",
      eventType: "EXTERNAL_EVIDENCE_FAILED",
      entityType: "payment_intent",
      entityId: intent.id,
      metadata: { providerId: intent.providerId, code },
      payload: { message: message.slice(0, 500) },
    });
  });
}

async function markPaymentFailed(input: {
  intent: PaymentIntentRow;
  code: string;
  message: string;
  release: boolean;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(paymentIntents).where(eq(paymentIntents.id, input.intent.id)).for("update").limit(1);
    if (!locked || ["CONFIRMED", "RECONCILED", "FAILED"].includes(locked.status)) return;
    await tx
      .update(paymentIntents)
      .set({
        status: "FAILED",
        failureCode: input.code,
        failureMessage: input.message,
        dataStatus: "NOT_REQUESTED",
        settledAmountMinor: "0",
        updatedAt: new Date(),
      })
      .where(eq(paymentIntents.id, locked.id));
    if (input.release) {
      if (!locked.settledAt) {
        await releaseReservation(tx, locked.paymentSessionId, locked.authorizedAmountMinor ?? locked.amountMinor);
      }
    }
    await appendPaymentAudit(tx, {
      organizationId: locked.organizationId,
      borrowerId: locked.borrowerId,
      eventType: "PAYMENT_FAILED",
      intentId: locked.id,
      actorType: "SYSTEM",
      metadata: { providerId: locked.providerId, failureCode: input.code, amountMinor: locked.amountMinor },
      payload: { failureMessage: input.message },
    });
  });
}

async function enqueueReconciliation(config: PaymentRuntimeConfig, intentId: string, organizationId: string): Promise<void> {
  const nextRunAt = new Date(Date.now() + config.reconcile.intervalSeconds * 1000);
  await db
    .insert(jobs)
    .values({
      organizationId,
      jobType: "payment.reconcile",
      payload: { paymentIntentId: intentId },
      idempotencyKey: `payment.reconcile:${intentId}`,
      maxAttempts: config.reconcile.maxAttempts,
      nextRunAt,
    })
    .onConflictDoUpdate({
      target: jobs.idempotencyKey,
      set: {
        status: "QUEUED",
        attempts: 0,
        nextRunAt,
        lastErrorCode: null,
        leaseUntil: null,
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      },
    });
}

export async function reconcilePaymentJob(
  config: PaymentRuntimeConfig,
  intentId: string,
  attempts: number,
  maxAttempts: number,
): Promise<"DONE" | "RETRY"> {
  const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, intentId)).limit(1);
  if (!intent) return "DONE";
  if (["CONFIRMED", "RECONCILED", "FAILED"].includes(intent.status)) return "DONE";
  if (!intent.nonce) {
    await markPaymentFailed({
      intent,
      code: "SETTLEMENT_UNKNOWN_NO_NONCE",
      message: "No provider authorization nonce was recorded. No retry payment was attempted.",
      release: true,
    });
    return "DONE";
  }
  const provider = createArcProvider(config);
  const from = intent.payerAddress ?? provider.payerAddress;
  let transfers;
  try {
    transfers = await provider.searchTransfers({
      ...(from ? { from } : {}),
      nonce: intent.nonce,
      network: intent.network,
      pageSize: 10,
    });
  } catch (error) {
    if (attempts >= maxAttempts) {
      await markPaymentFailed({
        intent,
        code: "SETTLEMENT_LOOKUP_FAILED",
        message: "The settlement lookup failed and the reconciliation attempts were exhausted. No retry payment was attempted.",
        release: true,
      });
      return "DONE";
    }
    throw new RetryPaymentReconciliation(error instanceof Error ? error.message : undefined);
  }
  const transfer = transfers[0];
  if (!transfer) {
    if (attempts >= maxAttempts) {
      await markPaymentFailed({
        intent,
        code: "SETTLEMENT_NOT_FOUND",
        message: "No settled transfer was found after the reconciliation window. No retry payment was attempted.",
        release: true,
      });
      return "DONE";
    }
    return "RETRY";
  }
  if (transfer.status === "failed") {
    await markPaymentFailed({
      intent,
      code: "SETTLEMENT_FAILED",
      message: "The provider reports that the transfer failed. No retry payment was attempted.",
      release: true,
    });
    return "DONE";
  }
  if (transfer.status === "received") {
    if (attempts >= maxAttempts) {
      await markPaymentFailed({
        intent,
        code: "SETTLEMENT_STILL_PENDING",
        message: "The transfer is still pending after the reconciliation window. No retry payment was attempted.",
        release: true,
      });
      return "DONE";
    }
    return "RETRY";
  }

  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(paymentIntents).where(eq(paymentIntents.id, intent.id)).for("update").limit(1);
    if (!locked || ["CONFIRMED", "RECONCILED", "FAILED"].includes(locked.status)) return;
    const authorized = locked.authorizedAmountMinor ?? locked.amountMinor;
    const settled = typeof transfer.amount === "string" ? transfer.amount : authorized;
    const mismatch = settled !== authorized;
    await tx
      .update(paymentIntents)
      .set({
        status: "RECONCILED",
        transferId: transfer.id,
        transactionHash: transactionHash(transfer.txHash) ?? locked.transactionHash,
        settledAmountMinor: settled,
        failureCode: mismatch ? "SETTLED_AMOUNT_MISMATCH" : null,
        failureMessage: mismatch
          ? "The reconciled transfer amount differs from the authorized amount."
          : null,
        reconciledAt: new Date(),
        settledAt: locked.settledAt ?? new Date(),
        dataStatus: locked.dataStatus === "PENDING" ? "PENDING" : locked.dataStatus,
        updatedAt: new Date(),
      })
      .where(eq(paymentIntents.id, locked.id));
    if (!locked.settledAt) {
      await settleReservation(tx, locked.paymentSessionId, authorized, settled);
    }
    await appendPaymentAudit(tx, {
      organizationId: locked.organizationId,
      borrowerId: locked.borrowerId,
      eventType: "PAYMENT_RECONCILED",
      intentId: locked.id,
      actorType: "SYSTEM",
      metadata: {
        providerId: locked.providerId,
        transferId: transfer.id,
        status: transfer.status,
        settledAmountMinor: settled,
        authorizedAmountMinor: authorized,
        transactionHash: transactionHash(transfer.txHash),
        mismatch,
      },
      payload: { transfer },
    });
  });
  return "DONE";
}

export { serializePaymentIntent };
