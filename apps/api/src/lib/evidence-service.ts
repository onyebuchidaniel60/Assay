import { and, desc, eq } from "@assay/db";
import {
  appendBorrowerAuditEventInTx,
  externalEvidence,
  loadBorrowerDek,
  type AssayDb,
} from "@assay/db";
import { fromSealedColumns, sealJson, unsealJson } from "@assay/crypto";
import type { FinancialDataResult } from "@assay/financial-data";

type Tx = Parameters<Parameters<AssayDb["transaction"]>[0]>[0];

export type ExternalEvidenceView = {
  id: string;
  providerId: string;
  providerName: string;
  kind: string;
  endpoint: string;
  sourceUrl: string;
  publisher: string;
  reportingPeriod: string;
  linkedField: string | null;
  retrievedAt: string;
  contentSha256: string;
  validationStatus: string;
  validationErrors: string[];
  limitations: string[];
  paymentIntentId: string | null;
  requestContext: Record<string, unknown>;
  payload?: unknown;
  createdAt: string;
};

function serialize(row: typeof externalEvidence.$inferSelect, payload?: unknown): ExternalEvidenceView {
  return {
    id: row.id,
    providerId: row.providerId,
    providerName: row.providerName,
    kind: row.kind,
    endpoint: row.endpoint,
    sourceUrl: row.sourceUrl,
    publisher: row.publisher,
    reportingPeriod: row.reportingPeriod,
    linkedField: row.linkedField,
    retrievedAt: row.retrievedAt.toISOString(),
    contentSha256: row.contentSha256,
    validationStatus: row.validationStatus,
    validationErrors: row.validationErrors,
    limitations: row.limitations,
    paymentIntentId: row.paymentIntentId,
    requestContext: row.requestContext,
    ...(payload !== undefined ? { payload } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function storeExternalEvidence(input: {
  db: AssayDb;
  organizationId: string;
  borrowerId: string;
  analysisRunId: string;
  paymentIntentId: string | null;
  result: FinancialDataResult;
  requestContext: Record<string, unknown>;
  createdBy: string;
}): Promise<ExternalEvidenceView> {
  return input.db.transaction(async (tx) => {
    const dek = await loadBorrowerDek(tx, input.organizationId, input.borrowerId);
    const sealed = sealJson(input.result.data, dek);
    const existing = await tx
      .select()
      .from(externalEvidence)
      .where(
        and(
          eq(externalEvidence.analysisRunId, input.analysisRunId),
          eq(externalEvidence.contentSha256, input.result.contentSha256),
        ),
      )
      .limit(1);
    if (existing[0]) {
      const row = existing[0];
      const payload = unsealJson<unknown>(
        fromSealedColumns({ ciphertext: row.ciphertext, nonce: row.nonce, tag: row.tag }),
        dek,
      );
      return serialize(row, payload);
    }

    const [row] = await tx
      .insert(externalEvidence)
      .values({
        organizationId: input.organizationId,
        borrowerId: input.borrowerId,
        analysisRunId: input.analysisRunId,
        paymentIntentId: input.paymentIntentId,
        providerId: input.result.providerId,
        providerName: input.result.publisher,
        kind: String(input.requestContext.kind ?? "COMPANY_FACTS"),
        requestContext: input.requestContext,
        endpoint: input.result.endpoint,
        sourceUrl: input.result.sourceUrl,
        publisher: input.result.publisher,
        reportingPeriod: input.result.reportingPeriod,
        linkedField: typeof input.requestContext.linkedField === "string" ? input.requestContext.linkedField : null,
        retrievedAt: new Date(input.result.retrievedAt),
        contentSha256: input.result.contentSha256,
        ciphertext: sealed.ciphertext,
        nonce: sealed.nonce,
        tag: sealed.tag,
        limitations: input.result.limitations,
        validationStatus: input.result.validationStatus,
        validationErrors: input.result.validationErrors,
        createdBy: input.createdBy,
      })
      .returning();
    if (!row) throw new Error("External evidence insert did not return a row.");

    const eventType =
      input.result.validationStatus === "VALID"
        ? "EXTERNAL_EVIDENCE_RETRIEVED"
        : input.result.validationStatus === "INCOMPLETE"
          ? "EXTERNAL_EVIDENCE_INCOMPLETE"
          : "EXTERNAL_EVIDENCE_REJECTED";
    await appendBorrowerAuditEventInTx(tx, {
      organizationId: input.organizationId,
      borrowerId: input.borrowerId,
      actorType: "SYSTEM",
      eventType,
      entityType: "external_evidence",
      entityId: row.id,
      metadata: {
        providerId: input.result.providerId,
        kind: String(input.requestContext.kind ?? "COMPANY_FACTS"),
        reportingPeriod: input.result.reportingPeriod,
        contentSha256: input.result.contentSha256,
        validationStatus: input.result.validationStatus,
        paymentIntentId: input.paymentIntentId,
      },
      payload: {
        sourceUrl: input.result.sourceUrl,
        publisher: input.result.publisher,
        limitations: input.result.limitations,
        validationErrors: input.result.validationErrors,
        requestContext: input.requestContext,
      },
    });
    return serialize(row, input.result.data);
  });
}

export async function listExternalEvidence(input: {
  db: AssayDb;
  organizationId: string;
  borrowerId: string;
  analysisRunId: string;
  includePayload: boolean;
}): Promise<ExternalEvidenceView[]> {
  const rows = await input.db
    .select()
    .from(externalEvidence)
    .where(
      and(
        eq(externalEvidence.organizationId, input.organizationId),
        eq(externalEvidence.analysisRunId, input.analysisRunId),
      ),
    )
    .orderBy(desc(externalEvidence.createdAt))
    .limit(50);
  if (!input.includePayload) return rows.map((row) => serialize(row));
  const dek = await loadBorrowerDek(input.db, input.organizationId, input.borrowerId);
  return rows.map((row) =>
    serialize(
      row,
      unsealJson<unknown>(
        fromSealedColumns({ ciphertext: row.ciphertext, nonce: row.nonce, tag: row.tag }),
        dek,
      ),
    ),
  );
}

export async function getExternalEvidenceById(input: {
  db: AssayDb;
  organizationId: string;
  borrowerId: string;
  analysisRunId: string;
  evidenceId: string;
  includePayload: boolean;
}): Promise<ExternalEvidenceView | null> {
  const [row] = await input.db
    .select()
    .from(externalEvidence)
    .where(
      and(
        eq(externalEvidence.id, input.evidenceId),
        eq(externalEvidence.organizationId, input.organizationId),
        eq(externalEvidence.analysisRunId, input.analysisRunId),
      ),
    )
    .limit(1);
  if (!row) return null;
  if (!input.includePayload) return serialize(row);
  const dek = await loadBorrowerDek(input.db, input.organizationId, input.borrowerId);
  return serialize(
    row,
    unsealJson<unknown>(
      fromSealedColumns({ ciphertext: row.ciphertext, nonce: row.nonce, tag: row.tag }),
      dek,
    ),
  );
}

export async function recordEvidenceRequestAudit(input: {
  tx: Tx;
  organizationId: string;
  borrowerId: string;
  analysisRunId: string;
  providerId: string;
  kind: string;
  requestContext: Record<string, unknown>;
  actorId: string;
}): Promise<void> {
  await appendBorrowerAuditEventInTx(input.tx, {
    organizationId: input.organizationId,
    borrowerId: input.borrowerId,
    actorType: "USER",
    actorId: input.actorId,
    eventType: "EXTERNAL_EVIDENCE_REQUESTED",
    entityType: "analysis_run",
    entityId: input.analysisRunId,
    metadata: {
      providerId: input.providerId,
      kind: input.kind,
    },
    payload: input.requestContext,
  });
}

export async function recordEvidenceFailureAudit(input: {
  db: AssayDb;
  organizationId: string;
  borrowerId: string;
  analysisRunId: string;
  providerId: string;
  kind: string;
  errorCode: string;
  message: string;
  actorId: string;
}): Promise<void> {
  await input.db.transaction(async (tx) => {
    await appendBorrowerAuditEventInTx(tx, {
      organizationId: input.organizationId,
      borrowerId: input.borrowerId,
      actorType: "SYSTEM",
      eventType: "EXTERNAL_EVIDENCE_FAILED",
      entityType: "analysis_run",
      entityId: input.analysisRunId,
      metadata: { providerId: input.providerId, kind: input.kind, errorCode: input.errorCode },
      payload: { message: input.message.slice(0, 500) },
    });
  });
}
