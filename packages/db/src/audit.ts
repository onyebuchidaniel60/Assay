import { asc, eq } from "drizzle-orm";
import { appendAuditEvent as buildAuditEvent, verifyAuditChain } from "@assay/domain";
import { signAuditHash, verifyAuditSignature } from "@assay/crypto";
import type { AssayDb } from "./client.js";
import { auditEvents, auditHeads } from "./schema.js";

export type AuditInput = {
  organizationId: string;
  actorType: "USER" | "SYSTEM";
  actorUserId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
};

export type AppendedAuditEvent = ReturnType<typeof buildAuditEvent> & { signature: string };

export async function appendSignedAuditEvent(db: AssayDb, input: AuditInput): Promise<AppendedAuditEvent> {
  const privateKey = process.env.AUDIT_SIGNING_PRIVATE_KEY_BASE64;
  if (!privateKey) throw new Error("AUDIT_SIGNING_PRIVATE_KEY_BASE64 is required.");

  return db.transaction(async (tx) => {
    const [head] = await tx
      .select()
      .from(auditHeads)
      .where(eq(auditHeads.organizationId, input.organizationId))
      .for("update");
    if (!head) throw new Error("Audit head is missing for the organization.");

    const sequenceNo = Number(head.lastSequenceNo) + 1;
    const createdAt = new Date().toISOString();
    const event = buildAuditEvent({
      organizationId: input.organizationId,
      sequenceNo,
      actorType: input.actorType,
      ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload,
      previousHash: head.lastHash,
      createdAt,
    });
    const signature = signAuditHash(event.eventHash, privateKey);

    await tx.insert(auditEvents).values({
      organizationId: event.organizationId,
      sequenceNo: event.sequenceNo,
      actorType: event.actorType,
      actorUserId: event.actorUserId,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      payload: event.payload,
      payloadSha256: event.payloadSha256,
      previousHash: event.previousHash,
      eventHash: event.eventHash,
      signature,
      createdAt: new Date(event.createdAt),
    });
    await tx
      .update(auditHeads)
      .set({ lastSequenceNo: sequenceNo, lastHash: event.eventHash, updatedAt: new Date() })
      .where(eq(auditHeads.organizationId, input.organizationId));

    return { ...event, signature };
  });
}

export type AuditVerificationResult = {
  result: "VALID" | "INVALID" | "UNAVAILABLE";
  checkedCount: number;
  firstFailedSequence: number | null;
  headHash: string | null;
};

export async function verifyOrganizationAudit(db: AssayDb, organizationId: string): Promise<AuditVerificationResult> {
  const publicKey = process.env.AUDIT_SIGNING_PUBLIC_KEY_BASE64;
  if (!publicKey) throw new Error("AUDIT_SIGNING_PUBLIC_KEY_BASE64 is required.");

  const rows = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, organizationId))
    .orderBy(asc(auditEvents.sequenceNo));
  if (rows.length === 0) {
    return { result: "UNAVAILABLE", checkedCount: 0, firstFailedSequence: null, headHash: null };
  }

  const events = rows.map((row) => ({
    organizationId: row.organizationId,
    sequenceNo: Number(row.sequenceNo),
    actorType: row.actorType,
    ...(row.actorUserId ? { actorUserId: row.actorUserId } : {}),
    eventType: row.eventType,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: row.payload,
    previousHash: row.previousHash,
    createdAt: row.createdAt.toISOString(),
    payloadSha256: row.payloadSha256,
    eventHash: row.eventHash,
  }));
  const chain = verifyAuditChain(events);
  if (chain.result !== "VALID") {
    return { result: chain.result, checkedCount: chain.checkedCount, firstFailedSequence: chain.firstFailedSequence, headHash: null };
  }
  for (const row of rows) {
    if (!row.signature || !verifyAuditSignature(row.eventHash, row.signature, publicKey)) {
      return { result: "INVALID", checkedCount: rows.length, firstFailedSequence: Number(row.sequenceNo), headHash: null };
    }
  }
  return { result: "VALID", checkedCount: rows.length, firstFailedSequence: null, headHash: rows[rows.length - 1]?.eventHash ?? null };
}
