import { and, eq } from "@assay/db";
import {
  analysisRuns,
  appendBorrowerAuditEventInTx,
  claimJob,
  completeJob,
  createDb,
  documents,
  failJob,
  reclaimExpiredJobs,
  redactionRevisions,
  rescheduleJob,
  type ClaimedJob,
} from "@assay/db";
import { PrivateObjectStorage } from "@assay/storage";
import { decryptBytes, sealJson } from "@assay/crypto";
import {
  DocumentRejectedError,
  PresidioUnavailableError,
  parseDocument,
  presidioFromEnv,
} from "@assay/document";
import { buildRedaction } from "./lib/redaction.js";
import { runExtraction } from "./lib/extraction.js";
import { pollReppoJob } from "./lib/reppo.js";
import { loadBorrowerDek } from "@assay/db";
import { loadPaymentRuntimeConfig } from "./lib/payment-config.js";
import { executePaymentJob, reconcilePaymentJob, RetryPaymentReconciliation } from "./lib/payment-execution.js";

const db = createDb();
const storage = new PrivateObjectStorage();

async function handleAnalysisParse(job: ClaimedJob): Promise<void> {
  const analysisRunId = String(job.payload.analysisRunId ?? "");
  if (!analysisRunId) return;
  const [run] = await db
    .select()
    .from(analysisRuns)
    .where(and(eq(analysisRuns.id, analysisRunId), eq(analysisRuns.organizationId, job.organizationId)))
    .limit(1);
  if (!run) return;
  if (!["FILE_UPLOADED", "PARSING"].includes(run.status)) return;
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, run.documentId), eq(documents.organizationId, job.organizationId)))
    .limit(1);
  if (!document) {
    await db
      .update(analysisRuns)
      .set({ status: "FAILED", failureCode: "DOCUMENT_MISSING", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(analysisRuns.id, run.id));
    return;
  }

  await db.transaction(async (tx) => {
    await tx.update(analysisRuns).set({ status: "PARSING", updatedAt: new Date() }).where(eq(analysisRuns.id, run.id));
    await tx.update(documents).set({ status: "PROCESSING", updatedAt: new Date() }).where(eq(documents.id, document.id));
  });

  const failPermanently = async (code: string) => {
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(analysisRuns).where(eq(analysisRuns.id, run.id)).for("update");
      if (!current || !["FILE_UPLOADED", "PARSING"].includes(current.status)) return;
      await tx
        .update(documents)
        .set({ status: "FAILED", failureCode: code, updatedAt: new Date() })
        .where(eq(documents.id, document.id));
      await tx
        .update(analysisRuns)
        .set({ status: "FAILED", failureCode: code, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(analysisRuns.id, run.id));
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: job.organizationId,
        borrowerId: run.borrowerId,
        actorType: "SYSTEM",
        eventType: "DOCUMENT_PARSE_FAILED",
        entityType: "document",
        entityId: document.id,
        metadata: { failureCode: code },
        payload: { failureCode: code },
      });
    });
  };

  try {
    const presidio = presidioFromEnv();
    const dek = await loadBorrowerDek(db, job.organizationId, run.borrowerId);
    const objectBytes = await storage.get(document.storageKey);
    const sealed = JSON.parse(new TextDecoder().decode(objectBytes)) as {
      version: 1;
      nonce: string;
      tag: string;
      ciphertext: string;
    };
    const plaintext = decryptBytes(sealed, dek);
    const kind = document.mimeType === "application/pdf" ? "application/pdf" : "text/plain";
    const parsed = await parseDocument(plaintext, kind, document.originalFilename);
    const redacted = await buildRedaction(parsed.pages, presidio, run.id);
    const sealedPages = sealJson({ pages: redacted.pages, modelText: redacted.modelText }, dek);
    const storageKey = `org/${job.organizationId}/borrowers/${run.borrowerId}/redactions/${run.id}/1.json`;
    await storage.put(storageKey, new TextEncoder().encode(JSON.stringify(sealedPages)), "application/octet-stream");
    const sealedTokens = sealJson(redacted.tokenMap, dek);
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: redactionRevisions.id })
        .from(redactionRevisions)
        .where(and(eq(redactionRevisions.analysisRunId, run.id), eq(redactionRevisions.revision, 1)))
        .limit(1);
      if (!existing) {
        await tx.insert(redactionRevisions).values({
          organizationId: job.organizationId,
          analysisRunId: run.id,
          revision: 1,
          redactedTextStorageKey: storageKey,
          encryptedTokenMap: sealedTokens.ciphertext,
          tokenMapNonce: sealedTokens.nonce,
          tokenMapTag: sealedTokens.tag,
          entities: redacted.entities,
        });
      }
      await tx
        .update(analysisRuns)
        .set({ status: "REDACTION_REVIEW", failureCode: null, completedAt: null, updatedAt: new Date() })
        .where(eq(analysisRuns.id, run.id));
      await tx
        .update(documents)
        .set({ status: "REDACTION_REVIEW", failureCode: null, pageCount: parsed.pageCount, updatedAt: new Date() })
        .where(eq(documents.id, document.id));
      await appendBorrowerAuditEventInTx(tx, {
        organizationId: job.organizationId,
        borrowerId: run.borrowerId,
        actorType: "SYSTEM",
        eventType: "REDACTION_READY",
        entityType: "analysis_run",
        entityId: run.id,
        metadata: { revision: 1, entityCount: redacted.entities.length, pageCount: parsed.pageCount },
        payload: { revision: 1, entityCount: redacted.entities.length },
      });
    });
  } catch (error) {
    if (error instanceof DocumentRejectedError) {
      await failPermanently(error.code);
      return;
    }
    if (error instanceof PresidioUnavailableError) {
      process.stderr.write(`analysis.parse redaction unavailable: ${error.message}\n`);
      await failPermanently("REDACTION_SERVICE_UNAVAILABLE");
      return;
    }
    throw error;
  }
}

async function handleAnalysisExtract(job: ClaimedJob): Promise<void> {
  const analysisRunId = String(job.payload.analysisRunId ?? "");
  const actorId = String(job.payload.actorId ?? "");
  if (!analysisRunId || !actorId) return;
  await runExtraction(job.organizationId, analysisRunId, actorId);
}

async function handleReppoPoll(job: ClaimedJob): Promise<void> {
  const evaluationId = String(job.payload.evaluationId ?? "");
  if (!evaluationId) return;
  const status = await pollReppoJob(evaluationId);
  if (status === "PENDING") {
    await rescheduleJob(db, job.id, new Date(Date.now() + 60_000));
  }
}

const paymentConfig = loadPaymentRuntimeConfig();

async function handlePaymentExecute(job: ClaimedJob): Promise<void> {
  const paymentIntentId = String(job.payload.paymentIntentId ?? "");
  if (!paymentIntentId) return;
  await executePaymentJob(paymentConfig, paymentIntentId);
}

async function handlePaymentReconcile(job: ClaimedJob): Promise<void> {
  const paymentIntentId = String(job.payload.paymentIntentId ?? "");
  if (!paymentIntentId) return;
  const outcome = await reconcilePaymentJob(paymentConfig, paymentIntentId, job.attempts, job.maxAttempts);
  if (outcome === "RETRY") {
    throw new RetryPaymentReconciliation();
  }
}

const handlers = new Map<string, (job: ClaimedJob) => Promise<void>>([
  ["healthcheck", async () => undefined],
  ["analysis.parse", handleAnalysisParse],
  ["analysis.extract", handleAnalysisExtract],
  ["reppo.poll", handleReppoPoll],
  ["payment.execute", handlePaymentExecute],
  ["payment.reconcile", handlePaymentReconcile],
]);

let running = false;
let timer: NodeJS.Timeout | undefined;

async function tick() {
  await reclaimExpiredJobs(db);
  const job = await claimJob(db);
  if (!job) return;
  const handler = handlers.get(job.jobType);
  if (!handler) {
    await failJob(db, job.id, "NO_HANDLER");
    return;
  }
  try {
    await handler(job);
    await completeJob(db, job.id);
  } catch {
    await failJob(db, job.id, "HANDLER_ERROR");
  }
}

export function startWorker() {
  if (running || process.env.WORKER_ENABLED === "false") return;
  running = true;
  timer = setInterval(() => {
    void tick().catch(() => undefined);
  }, 2_000);
  timer.unref();
}

export function stopWorker() {
  running = false;
  if (timer) clearInterval(timer);
  timer = undefined;
}
