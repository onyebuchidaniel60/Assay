export const analysisStates = [
  "DRAFT",
  "FILE_UPLOADED",
  "PARSING",
  "REDACTION_REVIEW",
  "REDACTION_CONFIRMED",
  "EXTRACTION_PENDING",
  "TERMS_REVIEW",
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
  "APPROVED",
  "REJECTED",
  "PROOF_FAILED",
  "FAILED",
  "CANCELLED",
] as const;

export type AnalysisState = (typeof analysisStates)[number];

const analysisTransitions: Record<AnalysisState, AnalysisState[]> = {
  DRAFT: ["FILE_UPLOADED", "CANCELLED"],
  FILE_UPLOADED: ["PARSING", "FAILED", "CANCELLED"],
  PARSING: ["REDACTION_REVIEW", "FAILED", "CANCELLED"],
  REDACTION_REVIEW: ["REDACTION_CONFIRMED", "FAILED", "CANCELLED"],
  REDACTION_CONFIRMED: ["EXTRACTION_PENDING", "CANCELLED"],
  EXTRACTION_PENDING: ["TERMS_REVIEW", "FAILED", "CANCELLED"],
  TERMS_REVIEW: ["TERMS_CONFIRMED", "FAILED", "CANCELLED"],
  TERMS_CONFIRMED: ["FINANCIALS_PENDING", "CANCELLED"],
  FINANCIALS_PENDING: ["FINANCIALS_CONFIRMED", "FAILED", "CANCELLED"],
  FINANCIALS_CONFIRMED: ["CALCULATION_PENDING", "CANCELLED"],
  CALCULATION_PENDING: ["CALCULATED", "CALCULATED_SERV_PENDING", "FAILED", "CANCELLED"],
  CALCULATED: ["BREACH_REVIEW", "PROOF_PENDING", "FAILED", "CANCELLED"],
  CALCULATED_SERV_PENDING: ["CALCULATED", "FAILED", "CANCELLED"],
  BREACH_REVIEW: ["REJECTED"],
  PROOF_PENDING: ["PROOF_VERIFIED", "PROOF_FAILED", "CANCELLED"],
  PROOF_VERIFIED: ["READY_FOR_MANAGER", "CANCELLED"],
  READY_FOR_MANAGER: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: [],
  REJECTED: [],
  PROOF_FAILED: ["FAILED"],
  FAILED: [],
  CANCELLED: [],
};

export const documentStates = ["UPLOADED", "PROCESSING", "REDACTION_REVIEW", "READY", "FAILED", "SHREDDED"] as const;

export type DocumentState = (typeof documentStates)[number];

const documentTransitions: Record<DocumentState, DocumentState[]> = {
  UPLOADED: ["PROCESSING", "FAILED"],
  PROCESSING: ["REDACTION_REVIEW", "FAILED"],
  REDACTION_REVIEW: ["READY", "FAILED"],
  READY: ["SHREDDED"],
  FAILED: ["PROCESSING"],
  SHREDDED: [],
};

export const evidenceStates = ["SUGGESTED", "CONFIRMED", "REJECTED", "SUPERSEDED", "MANUAL_CONFIRMED"] as const;
export type EvidenceState = (typeof evidenceStates)[number];

const evidenceTransitions: Record<EvidenceState, EvidenceState[]> = {
  SUGGESTED: ["CONFIRMED", "REJECTED", "MANUAL_CONFIRMED"],
  CONFIRMED: ["SUPERSEDED"],
  REJECTED: [],
  SUPERSEDED: [],
  MANUAL_CONFIRMED: ["SUPERSEDED"],
};

export const covenantStates = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "NEEDS_REVIEW", "REJECTED", "SUPERSEDED"] as const;
export type CovenantState = (typeof covenantStates)[number];

const covenantTransitions: Record<CovenantState, CovenantState[]> = {
  DRAFT: ["PENDING_APPROVAL", "NEEDS_REVIEW"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "NEEDS_REVIEW"],
  APPROVED: ["ACTIVE"],
  ACTIVE: ["SUPERSEDED"],
  NEEDS_REVIEW: ["DRAFT", "REJECTED"],
  REJECTED: [],
  SUPERSEDED: [],
};

export const caseStates = [
  "OPEN",
  "ASSIGNED",
  "INVESTIGATING",
  "AWAITING_INFORMATION",
  "AWAITING_APPROVAL",
  "ESCALATED",
  "RESOLUTION_IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
] as const;

export type CaseState = (typeof caseStates)[number];

const caseTransitions: Record<CaseState, CaseState[]> = {
  OPEN: ["ASSIGNED"],
  ASSIGNED: ["INVESTIGATING", "ESCALATED"],
  INVESTIGATING: ["AWAITING_INFORMATION", "AWAITING_APPROVAL", "ESCALATED", "RESOLUTION_IN_PROGRESS"],
  AWAITING_INFORMATION: ["INVESTIGATING", "ESCALATED"],
  AWAITING_APPROVAL: ["INVESTIGATING", "RESOLUTION_IN_PROGRESS", "ESCALATED"],
  ESCALATED: ["INVESTIGATING", "RESOLUTION_IN_PROGRESS"],
  RESOLUTION_IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const transitions = {
  analysis: analysisTransitions,
  document: documentTransitions,
  evidence: evidenceTransitions,
  covenant: covenantTransitions,
  case: caseTransitions,
} as const;

export function canTransition<S extends string>(
  machine: keyof typeof transitions,
  current: S,
  next: S,
): boolean {
  const map = transitions[machine] as Record<string, readonly string[]>;
  return Boolean(map[current]?.includes(next));
}

export function assertTransition<S extends string>(machine: keyof typeof transitions, current: S, next: S): void {
  if (!canTransition(machine, current, next)) {
    throw new Error(`Invalid ${machine} transition: ${current} -> ${next}`);
  }
}

export type ActualComplianceStatus = "COMPLIANT" | "BREACHED" | "INDETERMINATE" | "NOT_ASSESSED";
export type VerificationStatus = "VERIFIED" | "FAILED" | "INCOMPLETE" | "STALE" | "VERIFYING";
export type ForecastStatus = "AT_RISK" | "NO_PROJECTED_BREACH" | "INDETERMINATE";

export function isActualStatus(value: string): value is ActualComplianceStatus {
  return ["COMPLIANT", "BREACHED", "INDETERMINATE", "NOT_ASSESSED"].includes(value);
}

export function isForecastStatus(value: string): value is ForecastStatus {
  return ["AT_RISK", "NO_PROJECTED_BREACH", "INDETERMINATE"].includes(value);
}
