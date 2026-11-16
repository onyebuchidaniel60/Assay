import { randomUUID } from "node:crypto";
import { and, eq } from "@assay/db";
import {
  analysisRuns,
  appendBorrowerAuditEventInTx,
  covenantTerms,
  createDb,
  enqueueJob,
  feedbackRecords,
  reppoEvaluations,
} from "@assay/db";
import {
  ReppoError,
  allowedWaitMinutes,
  assertSafeEvaluation,
  normalizeReppoStatus,
  reppoFromEnv,
  type ReppoEvaluation,
} from "@assay/reppo";
import { ApiError, notFound } from "./errors.js";

const db = createDb();
const POLL_INTERVAL_MS = 60_000;

type FeedbackRow = typeof feedbackRecords.$inferSelect;
type EvaluationRow = typeof reppoEvaluations.$inferSelect;

const SAFE_TEXT_FIELDS = new Set([
  "totalDebtDefinition",
  "ebitdaDefinition",
  "cureRightsSummary",
  "permittedAddbacks",
  "description",
  "conditions",
  "note",
]);
const REDACTED_AMOUNT_FIELDS = new Set([
  "reportedEbitdaMinor",
  "totalDebtMinor",
  "adjustedEbitdaMinor",
  "amountMinor",
  "capMinor",
  "requestedMinor",
  "appliedMinor",
  "cappedMinor",
  "sourceReference",
]);

function safeValue(field: string, value: unknown): unknown {
  if (REDACTED_AMOUNT_FIELDS.has(field)) return "[amount redacted]";
  if (SAFE_TEXT_FIELDS.has(field)) return "[text redacted]";
  if (field === "thresholdBps") {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100_000 ? value : "[redacted]";
  }
  if (field === "comparator" && value === "LTE") return "LTE";
  if (field === "covenantType" && value === "DEBT_TO_ADJUSTED_EBITDA") return "DEBT_TO_ADJUSTED_EBITDA";
  if (field === "currency" && typeof value === "string" && /^[A-Z]{3}$/.test(value)) return value;
  if (
    field === "reviewStatus" &&
    typeof value === "string" &&
    ["PENDING", "CONFIRMED", "REJECTED"].includes(value)
  ) {
    return value;
  }
  if (field === "testingDate" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (field === "code" && typeof value === "string" && /^[A-Z0-9_-]{1,64}$/.test(value)) return value;
  if (typeof value === "boolean") return value;
  return "[redacted]";
}

export function buildSafeCorrectionTrace(input: {
  feedback: FeedbackRow;
  thresholdBps: number | null;
  comparator: string | null;
}): { taskType: "action"; input: string; context: string; criteria: string[] } {
  const before = input.feedback.beforeValue ?? {};
  const after = input.feedback.afterValue ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const changedFields = keys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .slice(0, 40)
    .map((field) => ({
      field: /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(field) ? field : "redacted_field",
      before: safeValue(field, before[field]),
      after: safeValue(field, after[field]),
    }));
  const trace = {
    schema: "assay.synthetic-correction.v1",
    synthetic: true,
    workflow: "maximum_debt_adjusted_ebitda",
    correctionType: input.feedback.correctionType,
    changedFields,
    covenant: {
      thresholdBps: input.thresholdBps,
      comparator: input.comparator === "LTE" ? "LTE" : null,
    },
    redaction: "Field names and safe categorical values only. Amounts, free text, borrower identity, token map and agreement content are excluded.",
  };
  const body = JSON.stringify(trace);
  const context =
    "Assay synthetic covenant review. Maximum Debt/Adjusted EBITDA workflow. This is a de-identified correction trace; no borrower identity, agreement text, token map, raw financial figures or free-text source content is included.";
  const criteria = [
    "Is the correction internally consistent with a single maximum leverage covenant workflow?",
    "Does the correction avoid unsupported claims, policy changes or approval decisions?",
  ];
  assertSafeEvaluation(body, context);
  return { taskType: "action", input: body, context, criteria };
}

export type ReppoEvaluationView = {
  id: string;
  feedbackRecordId: string;
  providerEvalId: string | null;
  status: string;
  providerStatus: string | null;
  score: number | null;
  decision: string | null;
  confidence: string | null;
  route: string | null;
  result: Record<string, unknown> | null;
  creditsCharged: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  maxWaitMinutes: number;
  submittedAt: string | null;
  completedAt: string | null;
  lastPolledAt: string | null;
};

export function serializeEvaluation(row: EvaluationRow): ReppoEvaluationView {
  return {
    id: row.id,
    feedbackRecordId: row.feedbackRecordId,
    providerEvalId: row.providerEvalId,
    status: row.status,
    providerStatus: row.providerStatus,
    score: row.score,
    decision: row.decision,
    confidence: row.confidence,
    route: row.route,
    result: row.result ?? null,
    creditsCharged: row.creditsCharged,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    maxWaitMinutes: row.maxWaitMinutes,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    lastPolledAt: row.lastPolledAt?.toISOString() ?? null,
  };
}

function requireEnabled(): void {
  if ((process.env.REPPO_ENABLED ?? "").toLowerCase() !== "true") {
    throw new ApiError(503, "PROVIDER_DISABLED", "Reppo evaluation is disabled by configuration.");
  }
  if (!process.env.REPPO_API_KEY) {
    throw new ApiError(503, "PROVIDER_NOT_CONFIGURED", "Reppo evaluation is enabled but its API key is missing.");
  }
}

async function loadFeedbackContext(feedbackRecordId: string, organizationId: string) {
  const [feedback] = await db
    .select()
    .from(feedbackRecords)
    .where(and(eq(feedbackRecords.id, feedbackRecordId), eq(feedbackRecords.organizationId, organizationId)))
    .limit(1);
  if (!feedback) throw notFound("Feedback record");
  const [run] = await db
    .select()
    .from(analysisRuns)
    .where(and(eq(analysisRuns.id, feedback.analysisRunId), eq(analysisRuns.organizationId, organizationId)))
    .limit(1);
  if (!run) throw notFound("Analysis run");
  const [terms] = await db
    .select({ thresholdBps: covenantTerms.thresholdBps, comparator: covenantTerms.comparator })
    .from(covenantTerms)
    .where(eq(covenantTerms.analysisRunId, run.id))
    .limit(1);
  return { feedback, run, terms: terms ?? null };
}

async function recordAudit(
  organizationId: string,
  borrowerId: string,
  actorType: "USER" | "SYSTEM",
  actorId: string | undefined,
  eventType: string,
  evaluationDbId: string,
  metadata: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.transaction(async (tx) => {
    await appendBorrowerAuditEventInTx(tx, {
      organizationId,
      borrowerId,
      actorType,
      ...(actorId ? { actorId } : {}),
      eventType,
      entityType: "reppo_evaluation",
      entityId: evaluationDbId,
      metadata,
      payload,
    });
  });
}

export async function submitFeedbackToReppo(input: {
  organizationId: string;
  actorId: string;
  feedbackRecordId: string;
  maxWaitMinutes: number;
}): Promise<ReppoEvaluationView> {
  requireEnabled();
  const maxWaitMinutes = allowedWaitMinutes(input.maxWaitMinutes);
  const { feedback, run, terms } = await loadFeedbackContext(input.feedbackRecordId, input.organizationId);
  const [existing] = await db
    .select()
    .from(reppoEvaluations)
    .where(
      and(
        eq(reppoEvaluations.organizationId, input.organizationId),
        eq(reppoEvaluations.feedbackRecordId, feedback.id),
      ),
    )
    .limit(1);
  if (existing) return serializeEvaluation(existing);

  const trace = buildSafeCorrectionTrace({
    feedback,
    thresholdBps: terms?.thresholdBps ?? null,
    comparator: terms?.comparator ?? null,
  });
  let client;
  try {
    client = reppoFromEnv();
  } catch (error) {
    throw new ApiError(503, "PROVIDER_NOT_CONFIGURED", error instanceof Error ? error.message : "Reppo is not configured.");
  }

  let submitted;
  try {
    submitted = await client.submit(trace);
  } catch (error) {
    const reppoError =
      error instanceof ReppoError
        ? error
        : new ReppoError(error instanceof Error ? error.message : "Reppo submission failed.", "NETWORK_ERROR", "network");
    const evaluationDbId = randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(reppoEvaluations).values({
        id: evaluationDbId,
        organizationId: input.organizationId,
        feedbackRecordId: feedback.id,
        providerEvalId: null,
        status: "FAILED",
        providerStatus: null,
        errorCode: reppoError.code,
        errorMessage: reppoError.providerMessage ?? reppoError.message,
        maxWaitMinutes,
        submittedAt: new Date(),
      });
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: input.organizationId,
        borrowerId: run.borrowerId,
        actorType: "USER",
        actorId: input.actorId,
        eventType: "REPPO_EVALUATION_FAILED",
        entityType: "reppo_evaluation",
        entityId: evaluationDbId,
        metadata: {
          errorCode: reppoError.code,
          side: reppoError.side,
          httpStatus: reppoError.httpStatus,
        },
        payload: { message: reppoError.message.slice(0, 500), providerMessage: reppoError.providerMessage?.slice(0, 500) ?? null },
      });
    });
    const [row] = await db.select().from(reppoEvaluations).where(eq(reppoEvaluations.id, evaluationDbId)).limit(1);
    if (!row) throw new ApiError(502, "REPPO_SUBMIT_FAILED", reppoError.message);
    return serializeEvaluation(row);
  }

  const evaluationDbId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(reppoEvaluations).values({
      id: evaluationDbId,
      organizationId: input.organizationId,
      feedbackRecordId: feedback.id,
      providerEvalId: submitted.providerEvalId,
      status: normalizeReppoStatus(submitted.status),
      providerStatus: submitted.status,
      maxWaitMinutes,
      submittedAt: new Date(),
    });
    await appendBorrowerAuditEventInTx(tx, {
      organizationId: input.organizationId,
      borrowerId: run.borrowerId,
      actorType: "USER",
      actorId: input.actorId,
      eventType: "REPPO_EVALUATION_SUBMITTED",
      entityType: "reppo_evaluation",
      entityId: evaluationDbId,
      metadata: {
        providerEvalId: submitted.providerEvalId,
        providerStatus: submitted.status,
        maxWaitMinutes,
        payloadBytes: Buffer.byteLength(trace.input, "utf8"),
      },
      payload: { providerEvalId: submitted.providerEvalId, providerStatus: submitted.status },
    });
  });
  await enqueueJob(db, {
    organizationId: input.organizationId,
    jobType: "reppo.poll",
    payload: { evaluationId: evaluationDbId },
    idempotencyKey: `reppo-poll:${submitted.providerEvalId}`,
    maxAttempts: 1,
    nextRunAt: new Date(Date.now() + POLL_INTERVAL_MS),
  });
  const [row] = await db.select().from(reppoEvaluations).where(eq(reppoEvaluations.id, evaluationDbId)).limit(1);
  if (!row) throw new ApiError(502, "REPPO_SUBMIT_FAILED", "The evaluation was submitted but its local record is missing.");
  return serializeEvaluation(row);
}

export async function loadReppoEvaluation(
  organizationId: string,
  evaluationId: string,
  refresh = false,
): Promise<ReppoEvaluationView> {
  const [row] = await db
    .select()
    .from(reppoEvaluations)
    .where(and(eq(reppoEvaluations.id, evaluationId), eq(reppoEvaluations.organizationId, organizationId)))
    .limit(1);
  if (!row) throw notFound("Reppo evaluation");
  if (refresh) return refreshReppoEvaluation(organizationId, row);
  return serializeEvaluation(row);
}

export async function refreshReppoEvaluation(
  organizationId: string,
  row: EvaluationRow,
): Promise<ReppoEvaluationView> {
  if (!row.providerEvalId || ["COMPLETED", "FAILED", "TIMEOUT"].includes(row.status)) {
    return serializeEvaluation(row);
  }
  requireEnabled();
  const { feedback, run } = await loadFeedbackContext(row.feedbackRecordId, organizationId);
  void feedback;
  let evaluation: ReppoEvaluation;
  try {
    evaluation = await reppoFromEnv().get(row.providerEvalId);
  } catch (error) {
    const reppoError =
      error instanceof ReppoError
        ? error
        : new ReppoError("Reppo read failed.", "NETWORK_ERROR", "network");
    const terminalReadFailure =
      reppoError.side === "client" && (reppoError.httpStatus === 401 || reppoError.httpStatus === 404);
    const [updated] = await db
      .update(reppoEvaluations)
      .set({
        ...(terminalReadFailure
          ? { status: "FAILED", errorCode: reppoError.code, errorMessage: reppoError.providerMessage ?? reppoError.message }
          : { errorCode: reppoError.code, errorMessage: reppoError.providerMessage ?? reppoError.message }),
        lastPolledAt: new Date(),
      })
      .where(eq(reppoEvaluations.id, row.id))
      .returning();
    if (terminalReadFailure) {
      await recordAudit(organizationId, run.borrowerId, "SYSTEM", undefined, "REPPO_EVALUATION_FAILED", row.id, {
        errorCode: reppoError.code,
        side: reppoError.side,
        httpStatus: reppoError.httpStatus,
      }, { message: reppoError.message });
    }
    return serializeEvaluation(updated ?? row);
  }

  const normalized = normalizeReppoStatus(evaluation.status);
  const result = (evaluation.result ?? null) as Record<string, unknown> | null;
  const verdict = result && typeof result.verdict === "object" && result.verdict !== null
    ? (result.verdict as Record<string, unknown>)
    : null;
  const score = evaluation.score ?? (typeof result?.score === "number" ? result.score : null);
  const decision =
    (typeof result?.decision === "string" ? result.decision : null) ??
    (typeof verdict?.decision === "string" ? verdict.decision : null);
  const confidence =
    (typeof result?.confidence === "string" ? result.confidence : null) ??
    (typeof verdict?.confidence === "string" ? verdict.confidence : null);
  const route =
    evaluation.route ??
    (typeof result?.route === "string" ? result.route : null) ??
    (result && typeof result.action === "object" && result.action !== null && typeof (result.action as Record<string, unknown>).route === "string"
      ? String((result.action as Record<string, unknown>).route)
      : null);

  let status: string = normalized;
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  if (normalized === "FAILED") {
    errorCode = "PROVIDER_FAILED";
    errorMessage =
      result && typeof result.reason === "string"
        ? result.reason
        : typeof evaluation.error === "string"
          ? evaluation.error
          : "Reppo reported FAILED without a reason.";
  } else if (normalized === "PENDING") {
    const submittedAt = row.submittedAt?.getTime() ?? Date.now();
    if (Date.now() >= submittedAt + row.maxWaitMinutes * 60_000) {
      status = "TIMEOUT";
      errorCode = "POLL_WINDOW_EXPIRED";
      errorMessage = `Evaluation remained PENDING after the ${row.maxWaitMinutes}-minute polling window. Polling stopped; the provider may still settle later.`;
    }
  }

  const completedAt =
    status === "COMPLETED"
      ? evaluation.completedAt
        ? new Date(evaluation.completedAt)
        : new Date()
      : null;
  const [updated] = await db
    .update(reppoEvaluations)
    .set({
      status,
      providerStatus: evaluation.status,
      score: score ?? null,
      decision,
      confidence,
      route,
      result: result ?? null,
      critique: result ?? null,
      creditsCharged: evaluation.creditsCharged ?? null,
      errorCode,
      errorMessage,
      completedAt,
      lastPolledAt: new Date(),
    })
    .where(eq(reppoEvaluations.id, row.id))
    .returning();

  if (status === "COMPLETED") {
    await recordAudit(organizationId, run.borrowerId, "SYSTEM", undefined, "REPPO_EVALUATION_COMPLETED", row.id, {
      providerEvalId: row.providerEvalId,
      score,
      decision,
      confidence,
      route,
      creditsCharged: evaluation.creditsCharged ?? null,
    }, { providerStatus: evaluation.status });
  } else if (status === "FAILED" || status === "TIMEOUT") {
    await recordAudit(organizationId, run.borrowerId, "SYSTEM", undefined, `REPPO_EVALUATION_${status}`, row.id, {
      providerEvalId: row.providerEvalId,
      errorCode,
      providerStatus: evaluation.status,
    }, { errorMessage });
  }
  return serializeEvaluation(updated ?? row);
}

export async function pollReppoJob(evaluationId: string): Promise<"PENDING" | "COMPLETED" | "FAILED" | "TIMEOUT"> {
  const [row] = await db.select().from(reppoEvaluations).where(eq(reppoEvaluations.id, evaluationId)).limit(1);
  if (!row) return "FAILED";
  const view = await refreshReppoEvaluation(row.organizationId, row);
  return view.status as "PENDING" | "COMPLETED" | "FAILED" | "TIMEOUT";
}
