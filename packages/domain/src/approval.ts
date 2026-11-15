import { sha256 } from "./verification.js";
import { canonicalize } from "./audit.js";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" | "INVALIDATED" | "EXPIRED";

export type ApprovalRequest = {
  id: string;
  requesterId: string;
  status: ApprovalStatus;
  payloadSha256: string;
  dependencySha256: string;
  version: number;
  expiresAt?: string;
};

export function approvalPayloadHash(payload: Record<string, unknown>): string {
  return sha256(canonicalize(payload));
}

export function dependencyHash(dependencies: Record<string, unknown>): string {
  return sha256(canonicalize(dependencies));
}

export type ApprovalDecisionInput = {
  request: ApprovalRequest;
  actorId: string;
  actorRole: string;
  decision: "APPROVE" | "REJECT" | "CHANGES_REQUESTED";
  reason?: string;
  currentPayloadSha256: string;
  currentDependencySha256: string;
  now?: Date;
  expectedVersion?: number;
};

export type ApprovalDecisionResult =
  | { ok: true; status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED" }
  | { ok: false; code: string; message: string };

export function decideApproval(input: ApprovalDecisionInput): ApprovalDecisionResult {
  const { request, actorId, actorRole, decision } = input;
  if (request.status !== "PENDING") {
    return { ok: false, code: "APPROVAL_NOT_PENDING", message: "Only a pending approval can be decided." };
  }
  if (actorRole !== "CREDIT_MANAGER") {
    return { ok: false, code: "FORBIDDEN", message: "Credit manager permission is required." };
  }
  if (request.requesterId === actorId) {
    return { ok: false, code: "SELF_APPROVAL_FORBIDDEN", message: "A requester cannot approve their own critical action." };
  }
  if (input.expectedVersion !== undefined && request.version !== input.expectedVersion) {
    return { ok: false, code: "CONFLICT", message: "The approval request version is stale." };
  }
  if (request.expiresAt && new Date(request.expiresAt).getTime() < (input.now ?? new Date()).getTime()) {
    return { ok: false, code: "APPROVAL_EXPIRED", message: "The approval request has expired." };
  }
  if (request.payloadSha256 !== input.currentPayloadSha256) {
    return { ok: false, code: "APPROVAL_INVALIDATED", message: "The action payload changed after submission." };
  }
  if (request.dependencySha256 !== input.currentDependencySha256) {
    return { ok: false, code: "APPROVAL_INVALIDATED", message: "A material dependency changed after submission." };
  }
  if (decision !== "APPROVE" && (!input.reason || input.reason.trim().length === 0)) {
    return { ok: false, code: "REASON_REQUIRED", message: "Rejection or change request requires a reason." };
  }
  return {
    ok: true,
    status: decision === "APPROVE" ? "APPROVED" : decision === "REJECT" ? "REJECTED" : "CHANGES_REQUESTED",
  };
}
