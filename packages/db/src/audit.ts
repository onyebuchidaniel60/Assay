import { and, asc, eq } from "drizzle-orm";
import { appendAuditEvent as buildAuditEvent, sha256, verifyAuditChain } from "@assay/domain";
import {
  fromSealedColumns,
  parseKek,
  sealJson,
  signAuditHash,
  unsealJson,
  unwrapDek,
  verifyAuditSignature,
  type SealedColumns,
} from "@assay/crypto";
import type { AssayDb } from "./client.js";
import { auditEvents, auditHeads, borrowerKeys, profiles } from "./schema.js";

export type AuditActor = {
  organizationId: string;
  borrowerId: string;
  actorType: "USER" | "SYSTEM";
  actorId?: string | undefined;
};

export type AppendBorrowerAuditInput = AuditActor & {
  eventType: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt?: Date;
};

type AuditTx = Parameters<Parameters<AssayDb["transaction"]>[0]>[0];

export function ciphertextDigest(ciphertext: string): string {
  return sha256(ciphertext);
}

function envelopeFor(row: {
  eventType: string;
  entityType: string;
  entityId: string;
  actorType: "USER" | "SYSTEM";
  actorId: string | null;
  metadata: Record<string, unknown>;
  ciphertext: string;
  createdAt: Date;
}) {
  return {
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    actorType: row.actorType,
    actorId: row.actorId,
    metadata: row.metadata,
    payloadSha256: ciphertextDigest(row.ciphertext),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadBorrowerDek(
  tx: AssayDb | AuditTx,
  organizationId: string,
  borrowerId: string,
  kekBase64 = process.env.DATA_KEK_BASE64,
): Promise<Buffer> {
  if (!kekBase64) throw new Error("DATA_KEK_BASE64 is required.");
  const [key] = await tx
    .select()
    .from(borrowerKeys)
    .where(and(eq(borrowerKeys.borrowerId, borrowerId), eq(borrowerKeys.organizationId, organizationId)))
    .limit(1);
  if (!key) throw new Error("Borrower key material is missing.");
  if (key.status !== "ACTIVE") throw new Error("Borrower key material has been shredded.");
  return unwrapDek(
    { version: 1, nonce: key.wrapNonce, tag: key.wrapTag, ciphertext: key.wrappedDek },
    parseKek(kekBase64),
  );
}

export async function ensureBorrowerAuditHead(tx: AuditTx, organizationId: string, borrowerId: string): Promise<void> {
  await tx
    .insert(auditHeads)
    .values({ borrowerId, organizationId })
    .onConflictDoNothing({ target: auditHeads.borrowerId });
}

export async function appendBorrowerAuditEvent(
  db: AssayDb,
  input: AppendBorrowerAuditInput,
): Promise<{ id: string; sequenceNo: number; eventHash: string; signature: string }> {
  return db.transaction(async (tx) => appendBorrowerAuditEventInTx(tx, input));
}

export async function appendBorrowerAuditEventInTx(
  tx: AuditTx,
  input: AppendBorrowerAuditInput,
): Promise<{ id: string; sequenceNo: number; eventHash: string; signature: string }> {
  const privateKey = process.env.AUDIT_SIGNING_PRIVATE_KEY_BASE64;
  if (!privateKey) throw new Error("AUDIT_SIGNING_PRIVATE_KEY_BASE64 is required.");

  {
    await ensureBorrowerAuditHead(tx, input.organizationId, input.borrowerId);
    const [head] = await tx
      .select()
      .from(auditHeads)
      .where(eq(auditHeads.borrowerId, input.borrowerId))
      .for("update");
    if (!head) throw new Error("Borrower audit head is missing.");

    const dek = await loadBorrowerDek(tx, input.organizationId, input.borrowerId);
    const sealed = sealJson(input.payload, dek);
    const createdAt = input.createdAt ?? new Date();
    const sequenceNo = Number(head.lastSequenceNo) + 1;
    const payloadEnvelope = envelopeFor({
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      metadata: input.metadata,
      ciphertext: sealed.ciphertext,
      createdAt,
    });
    const event = buildAuditEvent({
      organizationId: input.organizationId,
      sequenceNo,
      actorType: input.actorType,
      ...(input.actorId ? { actorUserId: input.actorId } : {}),
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: payloadEnvelope,
      previousHash: head.lastHash,
      createdAt: createdAt.toISOString(),
    });
    const signature = signAuditHash(event.eventHash, privateKey);

    const [row] = await tx
      .insert(auditEvents)
      .values({
        organizationId: input.organizationId,
        borrowerId: input.borrowerId,
        sequenceNo: event.sequenceNo,
        eventType: event.eventType,
        actorType: event.actorType,
        actorId: input.actorId ?? null,
        entityType: event.entityType,
        entityId: event.entityId,
        previousHash: event.previousHash,
        ciphertext: sealed.ciphertext,
        nonce: sealed.nonce,
        tag: sealed.tag,
        metadata: input.metadata,
        eventHash: event.eventHash,
        signature,
        createdAt,
      })
      .returning({ id: auditEvents.id });
    if (!row) throw new Error("Audit event insert did not return an id.");

    await tx
      .update(auditHeads)
      .set({ lastSequenceNo: sequenceNo, lastHash: event.eventHash, updatedAt: new Date() })
      .where(eq(auditHeads.borrowerId, input.borrowerId));

    return { id: row.id, sequenceNo, eventHash: event.eventHash, signature };
  }
}

export type AuditVerificationResult = {
  result: "VALID" | "INVALID" | "UNAVAILABLE";
  checkedCount: number;
  firstFailedSequence: number | null;
  headHash: string | null;
};

export async function verifyBorrowerAudit(
  db: AssayDb,
  organizationId: string,
  borrowerId: string,
): Promise<AuditVerificationResult> {
  const publicKey = process.env.AUDIT_SIGNING_PUBLIC_KEY_BASE64;
  if (!publicKey) throw new Error("AUDIT_SIGNING_PUBLIC_KEY_BASE64 is required.");

  const rows = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.organizationId, organizationId), eq(auditEvents.borrowerId, borrowerId)))
    .orderBy(asc(auditEvents.sequenceNo));
  if (rows.length === 0) {
    return { result: "UNAVAILABLE", checkedCount: 0, firstFailedSequence: null, headHash: null };
  }

  const events = rows.map((row) => {
    const base = {
      organizationId: row.organizationId,
      sequenceNo: Number(row.sequenceNo),
      actorType: row.actorType,
      ...(row.actorId ? { actorUserId: row.actorId } : {}),
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId,
      payload: envelopeFor(row),
      previousHash: row.previousHash,
      createdAt: row.createdAt.toISOString(),
    };
    const rebuilt = buildAuditEvent(base);
    return { ...rebuilt, eventHash: row.eventHash };
  });
  const chain = verifyAuditChain(events);
  if (chain.result !== "VALID") {
    return {
      result: chain.result,
      checkedCount: chain.checkedCount,
      firstFailedSequence: chain.firstFailedSequence,
      headHash: null,
    };
  }
  for (const row of rows) {
    if (!row.signature || !verifyAuditSignature(row.eventHash, row.signature, publicKey)) {
      return { result: "INVALID", checkedCount: rows.length, firstFailedSequence: Number(row.sequenceNo), headHash: null };
    }
  }
  return {
    result: "VALID",
    checkedCount: rows.length,
    firstFailedSequence: null,
    headHash: rows[rows.length - 1]?.eventHash ?? null,
  };
}

export type AuditEventView = {
  id: string;
  sequenceNo: number;
  eventType: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  previousHash: string;
  eventHash: string;
  signature: string;
  createdAt: string;
};

export async function listBorrowerAuditEvents(
  db: AssayDb,
  organizationId: string,
  borrowerId: string,
  limit = 100,
): Promise<AuditEventView[]> {
  const rows = await db
    .select({ event: auditEvents, actorName: profiles.displayName })
    .from(auditEvents)
    .leftJoin(profiles, eq(profiles.userId, auditEvents.actorId))
    .where(and(eq(auditEvents.organizationId, organizationId), eq(auditEvents.borrowerId, borrowerId)))
    .orderBy(asc(auditEvents.sequenceNo))
    .limit(Math.max(1, Math.min(500, limit)));
  return rows.map(({ event: row, actorName }) => ({
    id: row.id,
    sequenceNo: Number(row.sequenceNo),
    eventType: row.eventType,
    actorType: row.actorType,
    actorId: row.actorId,
    actorName: actorName ?? null,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    previousHash: row.previousHash,
    eventHash: row.eventHash,
    signature: row.signature,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function readBorrowerAuditPayload(
  db: AssayDb,
  organizationId: string,
  borrowerId: string,
  eventId: string,
): Promise<Record<string, unknown> | null> {
  const [row] = await db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.id, eventId),
        eq(auditEvents.organizationId, organizationId),
        eq(auditEvents.borrowerId, borrowerId),
      ),
    )
    .limit(1);
  if (!row) return null;
  try {
    const dek = await loadBorrowerDek(db, organizationId, borrowerId);
    return unsealJson<Record<string, unknown>>(
      fromSealedColumns({ ciphertext: row.ciphertext, nonce: row.nonce, tag: row.tag }),
      dek,
    );
  } catch {
    return null;
  }
}

export type { SealedColumns };
