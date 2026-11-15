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
  "BREACH_REVIEW",
  "PROOF_PENDING",
  "PROOF_VERIFIED",
  "READY_FOR_MANAGER",
  "APPROVED",
  "REJECTED",
  "PROOF_FAILED",
  "FAILED",
] as const;

export type AnalysisState = (typeof analysisStates)[number];

const analysisTransitions: Record<AnalysisState, AnalysisState[]> = {
  DRAFT: ["FILE_UPLOADED"],
  FILE_UPLOADED: ["PARSING", "FAILED"],
  PARSING: ["REDACTION_REVIEW", "FAILED"],
  REDACTION_REVIEW: ["REDACTION_CONFIRMED", "FAILED"],
  REDACTION_CONFIRMED: ["EXTRACTION_PENDING"],
  EXTRACTION_PENDING: ["TERMS_REVIEW", "FAILED"],
  TERMS_REVIEW: ["TERMS_CONFIRMED", "FAILED"],
  TERMS_CONFIRMED: ["FINANCIALS_PENDING"],
  FINANCIALS_PENDING: ["FINANCIALS_CONFIRMED", "FAILED"],
  FINANCIALS_CONFIRMED: ["CALCULATION_PENDING"],
  CALCULATION_PENDING: ["CALCULATED", "FAILED"],
  CALCULATED: ["BREACH_REVIEW", "PROOF_PENDING", "FAILED"],
  BREACH_REVIEW: ["REJECTED"],
  PROOF_PENDING: ["PROOF_VERIFIED", "PROOF_FAILED"],
  PROOF_VERIFIED: ["READY_FOR_MANAGER"],
  READY_FOR_MANAGER: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
  PROOF_FAILED: ["FAILED"],
  FAILED: [],
};

export const documentStates = [
  "RECEIVED",
  "QUARANTINED",
  "SCANNING",
  "EXTRACTING_TEXT",
  "AI_EXTRACTION",
  "NEEDS_REVIEW",
  "PROCESSED",
  "UNSUPPORTED_SCANNED_PDF",
  "REJECTED",
  "FAILED",
] as const;

export type DocumentState = (typeof documentStates)[number];

const documentTransitions: Record<DocumentState, DocumentState[]> = {
  RECEIVED: ["QUARANTINED"],
  QUARANTINED: ["SCANNING", "REJECTED"],
  SCANNING: ["EXTRACTING_TEXT", "REJECTED"],
  EXTRACTING_TEXT: ["AI_EXTRACTION", "NEEDS_REVIEW", "UNSUPPORTED_SCANNED_PDF", "FAILED"],
  AI_EXTRACTION: ["NEEDS_REVIEW", "PROCESSED", "FAILED"],
  NEEDS_REVIEW: ["PROCESSED", "REJECTED"],
  PROCESSED: [],
  UNSUPPORTED_SCANNED_PDF: [],
  REJECTED: [],
  FAILED: ["QUARANTINED"],
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
