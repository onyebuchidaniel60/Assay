import { sha256 } from "./verification.js";

export type AuditEventInput = {
  organizationId: string;
  sequenceNo: number;
  actorType: "USER" | "SYSTEM";
  actorUserId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  previousHash: string;
  createdAt: string;
};

export type AuditEvent = AuditEventInput & {
  payloadSha256: string;
  eventHash: string;
};

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Non-finite numbers are not canonical.");
      return JSON.stringify(value);
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
}

export function eventHashInput(event: AuditEventInput): string {
  return [
    event.organizationId,
    String(event.sequenceNo),
    event.previousHash,
    sha256(canonicalize(event.payload)),
  ].join("|");
}

export function appendAuditEvent(event: AuditEventInput): AuditEvent {
  const payloadSha256 = sha256(canonicalize(event.payload));
  const eventHash = sha256(eventHashInput(event));
  return { ...event, payloadSha256, eventHash };
}

export type AuditVerification = {
  result: "VALID" | "INVALID" | "UNAVAILABLE";
  checkedCount: number;
  firstFailedSequence: number | null;
  recoveredHead: string | null;
};

export function verifyAuditChain(events: AuditEvent[]): AuditVerification {
  if (events.length === 0) {
    return { result: "UNAVAILABLE", checkedCount: 0, firstFailedSequence: null, recoveredHead: null };
  }
  const sorted = [...events].sort((a, b) => a.sequenceNo - b.sequenceNo);
  let previousHash = sorted[0]?.previousHash ?? "GENESIS";
  if (previousHash.trim() !== "GENESIS" && !/^[0-9a-f]{64}$/.test(previousHash)) {
    return { result: "INVALID", checkedCount: sorted.length, firstFailedSequence: sorted[0]?.sequenceNo ?? null, recoveredHead: null };
  }
  let expectedSequence = sorted[0]?.sequenceNo ?? 1;
  for (const event of sorted) {
    if (event.sequenceNo !== expectedSequence) {
      return { result: "INVALID", checkedCount: sorted.length, firstFailedSequence: event.sequenceNo, recoveredHead: null };
    }
    const expected = appendAuditEvent({ ...event, previousHash });
    if (expected.eventHash !== event.eventHash || expected.payloadSha256 !== event.payloadSha256) {
      return { result: "INVALID", checkedCount: sorted.length, firstFailedSequence: event.sequenceNo, recoveredHead: null };
    }
    previousHash = event.eventHash;
    expectedSequence += 1;
  }
  return { result: "VALID", checkedCount: sorted.length, firstFailedSequence: null, recoveredHead: previousHash };
}
