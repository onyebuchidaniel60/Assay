import { and, desc, eq, sql } from "@assay/db";
import {
  analysisRuns,
  appendBorrowerAuditEventInTx,
  createDb,
  jobs,
  paymentAuthorizations,
  paymentIntents,
  paymentSessions,
  type AssayDb,
} from "@assay/db";
import {
  PAYMENT_POLICY_VERSION,
  evaluatePaymentPolicy,
  paymentRequestFingerprint,
  type PaymentPolicyDecision,
  type PaymentRequirement,
  type SpendingPolicy,
} from "@assay/domain";
import type { ProviderQuote } from "@assay/financial-data";
import type { PaymentRuntimeConfig } from "./payment-config.js";

const db = createDb();

export class PaymentServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 409,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

type Tx = Parameters<Parameters<AssayDb["transaction"]>[0]>[0];
type PaymentIntentRow = typeof paymentIntents.$inferSelect;
type PaymentSessionRow = typeof paymentSessions.$inferSelect;

export type PaymentActor = { organizationId: string; userId: string; role: string };

export type PaymentIntentView = {
  id: string;
  analysisRunId: string;
  providerId: string;
  providerName: string;
  serviceId: string;
  endpoint: string;
  method: string;
  status: string;
  network: string;
  asset: string;
  payTo: string;
  amountMinor: string;
  authorizedAmountMinor: string | null;
  settledAmountMinor: string | null;
  quoteSha256: string;
  quoteExpiresAt: string | null;
  policyDecision: Record<string, unknown>;
  rejectionCode: string | null;
  rejectionReason: string | null;
  payerAddress: string | null;
  providerTransaction: string | null;
  transactionHash: string | null;
  transferId: string | null;
  nonce: string | null;
  validBefore: string | null;
  receipt: Record<string, unknown> | null;
  failureCode: string | null;
  failureMessage: string | null;
  dataStatus: string;
  dataFailureCode: string | null;
  requestContext: Record<string, unknown>;
  authorizedAt: string | null;
  submittedAt: string | null;
  settledAt: string | null;
  reconciledAt: string | null;
  createdAt: string;
};

function asJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function sameResource(left: string, right: string): boolean {
  try {
    const a = new URL(left);
    const b = new URL(right);
    return a.protocol === b.protocol && a.host === b.host && a.pathname === b.pathname;
  } catch {
    return false;
  }
}

export function serializePaymentIntent(row: PaymentIntentRow): PaymentIntentView {
  const quote = asJson(row.quote);
  return {
    id: row.id,
    analysisRunId: row.analysisRunId,
    providerId: row.providerId,
    providerName: row.providerName,
    serviceId: row.serviceId,
    endpoint: row.endpoint,
    method: row.method,
    status: row.status,
    network: row.network,
    asset: row.asset,
    payTo: row.payTo,
    amountMinor: row.amountMinor,
    authorizedAmountMinor: row.authorizedAmountMinor,
    settledAmountMinor: row.settledAmountMinor,
    quoteSha256: row.quoteSha256,
    quoteExpiresAt: typeof quote.expiresAt === "string" ? quote.expiresAt : null,
    policyDecision: row.policyDecision,
    rejectionCode: row.rejectionCode,
    rejectionReason: row.rejectionReason,
    payerAddress: row.payerAddress,
    providerTransaction: row.providerTransaction,
    transactionHash: row.transactionHash,
    transferId: row.transferId,
    nonce: row.nonce,
    validBefore: row.validBefore ? row.validBefore.toISOString() : null,
    receipt: row.receipt,
    failureCode: row.failureCode,
    failureMessage: row.failureMessage,
    dataStatus: row.dataStatus,
    dataFailureCode: row.dataFailureCode,
    requestContext: row.requestContext,
    authorizedAt: row.authorizedAt ? row.authorizedAt.toISOString() : null,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    settledAt: row.settledAt ? row.settledAt.toISOString() : null,
    reconciledAt: row.reconciledAt ? row.reconciledAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function sessionStatus(row: PaymentSessionRow): SpendingPolicy["status"] {
  if (row.status === "ACTIVE") return "active";
  if (row.status === "EXPIRED") return "expired";
  if (row.status === "REVOKED") return "revoked";
  return "exhausted";
}

function policyFor(input: {
  session: PaymentSessionRow;
  config: PaymentRuntimeConfig;
  idempotencyKey: string;
  requestFingerprint: string;
  priorIntent?: SpendingPolicy["priorIntent"];
  now: Date;
}): SpendingPolicy {
  return {
    sessionId: input.session.id,
    status: sessionStatus(input.session),
    allowedProviders: input.config.session.allowedProviders,
    allowedEndpoints: input.config.session.allowedEndpoints,
    allowedNetworks: input.config.session.allowedNetworks,
    allowedAssets: input.config.session.allowedAssets,
    allowedRecipients: input.config.session.allowedRecipients,
    maxPerTransactionMinor: input.session.maxPerPaymentMinor,
    maxTotalMinor: input.session.maxTotalMinor,
    spentTotalMinor: input.session.spentTotalMinor,
    reservedTotalMinor: input.session.reservedTotalMinor,
    expiresAt: input.session.expiresAt.toISOString(),
    idempotencyKey: input.idempotencyKey,
    requestFingerprint: input.requestFingerprint,
    ...(input.priorIntent ? { priorIntent: input.priorIntent } : {}),
    now: input.now,
  };
}

async function ensureSession(
  tx: Tx,
  config: PaymentRuntimeConfig,
  organizationId: string,
  actorId: string,
): Promise<PaymentSessionRow> {
  const ready = Boolean(config.session.expiresAt) && !config.configError;
  const sessionKey = ready ? config.session.id : `${config.session.id}:unconfigured`;
  const [existing] = await tx
    .select()
    .from(paymentSessions)
    .where(and(eq(paymentSessions.organizationId, organizationId), eq(paymentSessions.sessionKey, sessionKey)))
    .for("update")
    .limit(1);
  if (existing) return existing;
  const [created] = await tx
    .insert(paymentSessions)
    .values({
      organizationId,
      sessionKey,
      network: config.network,
      asset: config.asset,
      maxPerPaymentMinor: config.session.maxPerTxMinor,
      maxTotalMinor: config.session.maxTotalMinor,
      status: ready ? "ACTIVE" : "EXPIRED",
      expiresAt: ready ? new Date(config.session.expiresAt!) : new Date(0),
      createdBy: actorId,
    })
    .returning();
  if (!created) throw new Error("Payment session insert did not return a row.");
  return created;
}

async function appendPaymentAudit(
  tx: Tx,
  input: {
    organizationId: string;
    borrowerId: string;
    eventType: string;
    intentId: string;
    actorType: "USER" | "SYSTEM";
    actorId?: string;
    metadata: Record<string, unknown>;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await appendBorrowerAuditEventInTx(tx, {
    organizationId: input.organizationId,
    borrowerId: input.borrowerId,
    actorType: input.actorType,
    ...(input.actorId ? { actorId: input.actorId } : {}),
    eventType: input.eventType,
    entityType: "payment_intent",
    entityId: input.intentId,
    metadata: input.metadata,
    payload: input.payload,
  });
}

export async function createPaymentIntentFromQuote(input: {
  db: AssayDb;
  config: PaymentRuntimeConfig;
  actor: PaymentActor;
  run: { id: string; organizationId: string; borrowerId: string };
  providerQuote: ProviderQuote;
  serviceId: string;
  idempotencyKey: string;
  requestContext: Record<string, unknown>;
}): Promise<{ intent: PaymentIntentView; replayed: boolean }> {
  if (!input.providerQuote.paymentRequired || !input.providerQuote.terms) {
    throw new PaymentServiceError("PAYMENT_NOT_REQUIRED", "This provider request is free and does not create a payment intent.", 400);
  }
  const terms = input.providerQuote.terms;
  if (!sameResource(terms.resourceUrl, input.providerQuote.endpoint)) {
    throw new PaymentServiceError(
      "PAYMENT_RESOURCE_MISMATCH",
      "The provider's paid resource does not match the approved endpoint.",
      422,
    );
  }
  const requirement: PaymentRequirement = {
    scheme: terms.scheme,
    network: terms.network,
    asset: terms.asset,
    amountMinor: terms.amountMinor,
    payTo: terms.payTo,
    maxTimeoutSeconds: terms.maxTimeoutSeconds,
    ...(terms.extra ? { extra: terms.extra } : {}),
  };
  const fingerprint = paymentRequestFingerprint({
    providerId: input.providerQuote.providerId,
    endpoint: input.providerQuote.endpoint,
    requirement,
  });
  const now = new Date();
  const quoteExpiresAt = new Date(
    now.getTime() + Math.min(terms.maxTimeoutSeconds, 300) * 1000,
  ).toISOString();
  const quotePayload = {
    x402Version: 2,
    resource: { url: terms.resourceUrl },
    accepted: {
      scheme: requirement.scheme,
      network: requirement.network,
      asset: requirement.asset,
      amount: requirement.amountMinor,
      payTo: requirement.payTo,
      maxTimeoutSeconds: requirement.maxTimeoutSeconds,
      ...(requirement.extra ? { extra: requirement.extra } : {}),
    },
    accepts: [
      {
        scheme: requirement.scheme,
        network: requirement.network,
        asset: requirement.asset,
        amount: requirement.amountMinor,
        payTo: requirement.payTo,
        maxTimeoutSeconds: requirement.maxTimeoutSeconds,
        ...(requirement.extra ? { extra: requirement.extra } : {}),
      },
    ],
    fetchedAt: now.toISOString(),
    expiresAt: quoteExpiresAt,
    quoteSha256: fingerprint,
    providerQuote: {
      arcCompatible: input.providerQuote.arcCompatible,
      arcCompatibilityNote: input.providerQuote.arcCompatibilityNote,
    },
  };

  try {
    return await input.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(paymentIntents)
        .where(
          and(
            eq(paymentIntents.organizationId, input.actor.organizationId),
            eq(paymentIntents.idempotencyKey, input.idempotencyKey),
          ),
        )
        .for("update")
        .limit(1);
      if (existing) {
        if (existing.actorId !== input.actor.userId) {
          throw new PaymentServiceError(
            "IDEMPOTENCY_CONFLICT",
            "This idempotency key belongs to a different analyst. Use a new key.",
            409,
          );
        }
        if (existing.requestFingerprint !== fingerprint) {
          throw new PaymentServiceError(
            "IDEMPOTENCY_CONFLICT",
            "This idempotency key was already used with different payment requirements.",
            409,
          );
        }
        return { intent: serializePaymentIntent(existing), replayed: true };
      }

      const session = await ensureSession(tx, input.config, input.actor.organizationId, input.actor.userId);
      const decision = evaluatePaymentPolicy(
        policyFor({
          session,
          config: input.config,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: fingerprint,
          now,
        }),
        {
          providerId: input.providerQuote.providerId,
          endpoint: input.providerQuote.endpoint,
          requirement,
        },
      );
      const configured = Boolean(input.config.session.expiresAt) && !input.config.configError;
      const effectiveDecision: PaymentPolicyDecision = configured
        ? decision
        : {
            allowed: false,
            code: "payment_not_configured",
            message:
              input.config.configError ??
              "Arc payments are not configured. Set the session expiry, allowlists, caps and enable the integration.",
            policyVersion: PAYMENT_POLICY_VERSION,
          };
      const status = effectiveDecision.allowed ? "PROPOSED" : "POLICY_REJECTED";
      const [row] = await tx
        .insert(paymentIntents)
        .values({
          organizationId: input.actor.organizationId,
          borrowerId: input.run.borrowerId,
          analysisRunId: input.run.id,
          paymentSessionId: session.id,
          actorId: input.actor.userId,
          providerId: input.providerQuote.providerId,
          providerName: input.providerQuote.displayName,
          serviceId: input.serviceId,
          requestContext: input.requestContext,
          endpoint: input.providerQuote.endpoint,
          method: input.providerQuote.method,
          idempotencyKey: input.idempotencyKey,
          requestFingerprint: fingerprint,
          quoteSha256: fingerprint,
          network: requirement.network,
          asset: requirement.asset,
          payTo: requirement.payTo,
          amountMinor: requirement.amountMinor,
          status,
          policyDecision: effectiveDecision as unknown as Record<string, unknown>,
          ...(effectiveDecision.allowed
            ? {}
            : {
                rejectionCode: effectiveDecision.code,
                rejectionReason: effectiveDecision.message,
              }),
          quote: quotePayload,
        })
        .returning();
      if (!row) throw new Error("Payment intent insert did not return a row.");
      await appendPaymentAudit(tx, {
        organizationId: input.actor.organizationId,
        borrowerId: input.run.borrowerId,
        eventType: effectiveDecision.allowed ? "PAYMENT_PROPOSED" : "PAYMENT_POLICY_REJECTED",
        intentId: row.id,
        actorType: "USER",
        actorId: input.actor.userId,
        metadata: {
          providerId: row.providerId,
          network: row.network,
          amountMinor: row.amountMinor,
          quoteSha256: row.quoteSha256,
          policyVersion: PAYMENT_POLICY_VERSION,
        },
        payload: {
          endpoint: row.endpoint,
          policyDecision: effectiveDecision,
          requestContext: input.requestContext,
        },
      });
      return { intent: serializePaymentIntent(row), replayed: false };
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "23505") {
      throw new PaymentServiceError(
        "IDEMPOTENCY_CONFLICT",
        "This idempotency key was used concurrently. Retry with the same key to read the existing intent.",
        409,
      );
    }
    throw error;
  }
}

export async function authorizePaymentIntent(input: {
  db: AssayDb;
  config: PaymentRuntimeConfig;
  actor: PaymentActor;
  intentId: string;
  expectedQuoteSha256: string;
}): Promise<{ intent: PaymentIntentView; replayed: boolean }> {
  if (!input.config.executionEnabled || input.config.dryRun) {
    throw new PaymentServiceError(
      "PAYMENT_EXECUTION_DISABLED",
      "Payment execution is disabled or in dry-run mode. No authorization or reservation was created.",
      503,
    );
  }
  return input.db.transaction(async (tx) => {
    const [intent] = await tx
      .select()
      .from(paymentIntents)
      .where(
        and(
          eq(paymentIntents.id, input.intentId),
          eq(paymentIntents.organizationId, input.actor.organizationId),
        ),
      )
      .for("update")
      .limit(1);
    if (!intent) throw new PaymentServiceError("NOT_FOUND", "Payment intent was not found.", 404);
    if (intent.quoteSha256 !== input.expectedQuoteSha256) {
      throw new PaymentServiceError("QUOTE_CHANGED", "The payment quote changed. Review the new terms before authorizing.", 409);
    }
    if (["AUTHORIZED", "SUBMITTING", "SUBMITTED", "CONFIRMED", "RECONCILIATION_REQUIRED", "RECONCILED"].includes(intent.status)) {
      return { intent: serializePaymentIntent(intent), replayed: true };
    }
    if (intent.status !== "PROPOSED") {
      throw new PaymentServiceError(
        "PAYMENT_NOT_AUTHORIZABLE",
        `A ${intent.status.toLowerCase()} payment cannot be authorized.`,
        409,
        { status: intent.status, rejectionCode: intent.rejectionCode },
      );
    }
    const quote = asJson(intent.quote);
    const quoteExpiresAt = typeof quote.expiresAt === "string" ? new Date(quote.expiresAt) : null;
    if (!quoteExpiresAt || quoteExpiresAt.getTime() <= Date.now()) {
      await tx
        .update(paymentIntents)
        .set({
          status: "POLICY_REJECTED",
          rejectionCode: "quote_expired",
          rejectionReason: "The provider quote expired before authorization.",
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, intent.id));
      throw new PaymentServiceError("QUOTE_EXPIRED", "The provider quote expired. Request a fresh quote.", 409);
    }

    const [session] = await tx
      .select()
      .from(paymentSessions)
      .where(
        and(
          eq(paymentSessions.id, intent.paymentSessionId),
          eq(paymentSessions.organizationId, input.actor.organizationId),
        ),
      )
      .for("update")
      .limit(1);
    if (!session) throw new PaymentServiceError("PAYMENT_SESSION_MISSING", "The payment session is missing.", 500);

    const decision = evaluatePaymentPolicy(
      policyFor({
        session,
        config: input.config,
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
          maxTimeoutSeconds: Number((quote.accepted as Record<string, unknown> | undefined)?.maxTimeoutSeconds ?? 300),
        },
      },
    );
    if (!decision.allowed) {
      await tx
        .update(paymentIntents)
        .set({
          status: "POLICY_REJECTED",
          rejectionCode: decision.code,
          rejectionReason: decision.message,
          policyDecision: decision as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(paymentIntents.id, intent.id));
      await tx.insert(paymentAuthorizations).values({
        organizationId: input.actor.organizationId,
        paymentIntentId: intent.id,
        actorId: input.actor.userId,
        decision: "REJECTED",
        policyVersion: PAYMENT_POLICY_VERSION,
        policySnapshot: decision as unknown as Record<string, unknown>,
      });
      await appendPaymentAudit(tx, {
        organizationId: input.actor.organizationId,
        borrowerId: intent.borrowerId,
        eventType: "PAYMENT_AUTHORIZATION_REJECTED",
        intentId: intent.id,
        actorType: "USER",
        actorId: input.actor.userId,
        metadata: { code: decision.code, policyVersion: PAYMENT_POLICY_VERSION },
        payload: { message: decision.message },
      });
      return { intent: serializePaymentIntent({ ...intent, status: "POLICY_REJECTED", rejectionCode: decision.code, rejectionReason: decision.message, policyDecision: decision as unknown as Record<string, unknown>, updatedAt: new Date() }), replayed: false };
    }

    const nextReserved = (BigInt(session.reservedTotalMinor) + BigInt(intent.amountMinor)).toString();
    await tx
      .update(paymentSessions)
      .set({
        reservedTotalMinor: nextReserved,
        version: session.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentSessions.id, session.id), eq(paymentSessions.version, session.version)));
    const [updated] = await tx
      .update(paymentIntents)
      .set({
        status: "AUTHORIZED",
        authorizedAmountMinor: intent.amountMinor,
        authorizedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(paymentIntents.id, intent.id), eq(paymentIntents.status, "PROPOSED")))
      .returning();
    if (!updated) throw new PaymentServiceError("AUTHORIZATION_RACE", "The payment changed before authorization completed.", 409);
    await tx.insert(paymentAuthorizations).values({
      organizationId: input.actor.organizationId,
      paymentIntentId: intent.id,
      actorId: input.actor.userId,
      decision: "APPROVED",
      policyVersion: PAYMENT_POLICY_VERSION,
      policySnapshot: {
        ...decision,
        amountMinor: intent.amountMinor,
        network: intent.network,
        asset: intent.asset,
        payTo: intent.payTo,
        sessionId: session.id,
      },
      authorizedAmountMinor: intent.amountMinor,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    await tx
      .insert(jobs)
      .values({
        organizationId: input.actor.organizationId,
        jobType: "payment.execute",
        payload: { paymentIntentId: intent.id },
        idempotencyKey: `payment.execute:${intent.id}`,
        maxAttempts: 3,
      })
      .onConflictDoNothing({ target: jobs.idempotencyKey });
    await appendPaymentAudit(tx, {
      organizationId: input.actor.organizationId,
      borrowerId: intent.borrowerId,
      eventType: "PAYMENT_AUTHORIZED",
      intentId: intent.id,
      actorType: "USER",
      actorId: input.actor.userId,
      metadata: {
        providerId: intent.providerId,
        network: intent.network,
        amountMinor: intent.amountMinor,
        quoteSha256: intent.quoteSha256,
        policyVersion: PAYMENT_POLICY_VERSION,
      },
      payload: {
        payTo: intent.payTo,
        asset: intent.asset,
        endpoint: intent.endpoint,
        remainingTotalMinor: decision.remainingTotalMinor,
      },
    });
    return { intent: serializePaymentIntent(updated), replayed: false };
  });
}

export async function listPaymentIntents(input: {
  db: AssayDb;
  organizationId: string;
  analysisRunId: string;
}): Promise<PaymentIntentView[]> {
  const rows = await input.db
    .select()
    .from(paymentIntents)
    .where(
      and(
        eq(paymentIntents.organizationId, input.organizationId),
        eq(paymentIntents.analysisRunId, input.analysisRunId),
      ),
    )
    .orderBy(desc(paymentIntents.createdAt))
    .limit(50);
  return rows.map(serializePaymentIntent);
}

export async function getSessionSummary(input: {
  db: AssayDb;
  organizationId: string;
  config: PaymentRuntimeConfig;
}) {
  const sessionKey = input.config.session.expiresAt && !input.config.configError
    ? input.config.session.id
    : `${input.config.session.id}:unconfigured`;
  const [row] = await input.db
    .select()
    .from(paymentSessions)
    .where(and(eq(paymentSessions.organizationId, input.organizationId), eq(paymentSessions.sessionKey, sessionKey)))
    .limit(1);
  const maxTotal = row?.maxTotalMinor ?? input.config.session.maxTotalMinor;
  const spent = row?.spentTotalMinor ?? "0";
  const reserved = row?.reservedTotalMinor ?? "0";
  let remaining = "0";
  try {
    remaining = (BigInt(maxTotal) - BigInt(spent) - BigInt(reserved)).toString();
  } catch {
    remaining = "0";
  }
  return {
    sessionKey,
    configured: Boolean(input.config.session.expiresAt) && !input.config.configError,
    status: row?.status ?? (input.config.session.expiresAt ? "ACTIVE" : "EXPIRED"),
    network: row?.network ?? input.config.network,
    asset: row?.asset ?? input.config.asset,
    maxPerPaymentMinor: row?.maxPerPaymentMinor ?? input.config.session.maxPerTxMinor,
    maxTotalMinor: maxTotal,
    spentTotalMinor: spent,
    reservedTotalMinor: reserved,
    remainingTotalMinor: remaining,
    expiresAt: row?.expiresAt.toISOString() ?? input.config.session.expiresAt,
    allowedProviders: input.config.session.allowedProviders,
    allowedEndpoints: input.config.session.allowedEndpoints,
    allowedRecipients: input.config.session.allowedRecipients,
    allowedNetworks: input.config.session.allowedNetworks,
    allowedAssets: input.config.session.allowedAssets,
    executionEnabled: input.config.executionEnabled && !input.config.dryRun,
  };
}

export async function releaseReservation(tx: Tx, sessionId: string, amountMinor: string): Promise<void> {
  const [session] = await tx.select().from(paymentSessions).where(eq(paymentSessions.id, sessionId)).for("update").limit(1);
  if (!session) return;
  const next = BigInt(session.reservedTotalMinor) - BigInt(amountMinor);
  await tx
    .update(paymentSessions)
    .set({
      reservedTotalMinor: (next < 0n ? 0n : next).toString(),
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(paymentSessions.id, session.id), eq(paymentSessions.version, session.version)));
}

export async function settleReservation(
  tx: Tx,
  sessionId: string,
  reservedAmountMinor: string,
  settledAmountMinor: string,
): Promise<void> {
  const [session] = await tx.select().from(paymentSessions).where(eq(paymentSessions.id, sessionId)).for("update").limit(1);
  if (!session) return;
  const reserved = BigInt(session.reservedTotalMinor) - BigInt(reservedAmountMinor);
  await tx
    .update(paymentSessions)
    .set({
      reservedTotalMinor: (reserved < 0n ? 0n : reserved).toString(),
      spentTotalMinor: (BigInt(session.spentTotalMinor) + BigInt(settledAmountMinor)).toString(),
      version: session.version + 1,
      updatedAt: new Date(),
    })
    .where(and(eq(paymentSessions.id, session.id), eq(paymentSessions.version, session.version)));
}

export async function touchIntentForSubmission(tx: Tx, intent: PaymentIntentRow): Promise<PaymentIntentRow | null> {
  const [updated] = await tx
    .update(paymentIntents)
    .set({ status: "SUBMITTING", submittedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(paymentIntents.id, intent.id), eq(paymentIntents.status, "AUTHORIZED")))
    .returning();
  return updated ?? null;
}

export async function loadRunForPayment(db: AssayDb, organizationId: string, runId: string) {
  const [run] = await db
    .select({ id: analysisRuns.id, organizationId: analysisRuns.organizationId, borrowerId: analysisRuns.borrowerId, status: analysisRuns.status })
    .from(analysisRuns)
    .where(and(eq(analysisRuns.id, runId), eq(analysisRuns.organizationId, organizationId)))
    .limit(1);
  return run ?? null;
}

export { db, policyFor, appendPaymentAudit, ensureSession };
