import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 24, scale: 8 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

export const organizationStatus = pgEnum("organization_status", ["active", "suspended"]);
export const membershipRole = pgEnum("membership_role", [
  "ORG_ADMIN",
  "CREDIT_ANALYST",
  "CREDIT_MANAGER",
  "PORTFOLIO_MANAGER",
  "AUDITOR",
]);
export const membershipStatus = pgEnum("membership_status", ["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"]);
export const invitationStatus = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
export const borrowerClassification = pgEnum("borrower_classification", ["CORPORATE", "OTHER"]);
export const borrowerStatus = pgEnum("borrower_status", ["ACTIVE", "INACTIVE"]);
export const facilityStatus = pgEnum("facility_status", ["DRAFT", "ACTIVE", "MATURED", "CLOSED"]);
export const documentCategory = pgEnum("document_category", [
  "CREDIT_AGREEMENT",
  "AMENDMENT",
  "FINANCIAL_STATEMENT",
  "MANAGEMENT_ACCOUNTS",
  "DEBT_SCHEDULE",
  "OTHER_SUPPORT",
]);
export const documentStatus = pgEnum("document_status", [
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
]);
export const extractionType = pgEnum("extraction_type", ["COVENANT", "FINANCIAL_METRIC"]);
export const extractionStatus = pgEnum("extraction_status", ["STARTED", "SUCCEEDED", "NEEDS_REVIEW", "FAILED"]);
export const covenantType = pgEnum("covenant_type", ["MAX_LEVERAGE"]);
export const covenantStatus = pgEnum("covenant_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "NEEDS_REVIEW",
  "REJECTED",
  "SUPERSEDED",
]);
export const evidenceStatus = pgEnum("evidence_status", [
  "SUGGESTED",
  "CONFIRMED",
  "REJECTED",
  "SUPERSEDED",
  "MANUAL_CONFIRMED",
]);
export const assessmentKind = pgEnum("assessment_kind", ["ACTUAL", "FORECAST"]);
export const verificationStatus = pgEnum("verification_status", ["VERIFYING", "VERIFIED", "FAILED", "INCOMPLETE", "STALE"]);
export const complianceStatus = pgEnum("compliance_status", [
  "COMPLIANT",
  "BREACHED",
  "INDETERMINATE",
  "NOT_ASSESSED",
  "AT_RISK",
  "NO_PROJECTED_BREACH",
]);
export const scenarioStatus = pgEnum("scenario_status", ["DRAFT", "SAVED", "ARCHIVED"]);
export const caseType = pgEnum("case_type", ["BREACH", "POTENTIAL_BREACH", "MISSING_EVIDENCE", "CONFLICTING_EVIDENCE", "CONTRACT_REVIEW"]);
export const caseSeverity = pgEnum("case_severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const caseStatus = pgEnum("case_status", [
  "OPEN",
  "ASSIGNED",
  "INVESTIGATING",
  "AWAITING_INFORMATION",
  "AWAITING_APPROVAL",
  "ESCALATED",
  "RESOLUTION_IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);
export const memoStatus = pgEnum("memo_status", ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "INVALIDATED"]);
export const approvalAction = pgEnum("approval_action", ["ACTIVATE_COVENANT", "APPROVE_MEMO", "CLOSE_CASE"]);
export const approvalStatus = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
  "INVALIDATED",
  "EXPIRED",
]);
export const decisionStatus = pgEnum("decision_status", ["APPROVED", "REJECTED", "CHANGES_REQUESTED"]);
export const actorType = pgEnum("actor_type", ["USER", "SYSTEM"]);
export const jobStatus = pgEnum("job_status", ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "DEAD", "CANCELLED"]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: organizationStatus("status").default("active").notNull(),
    defaultCurrency: char("default_currency", { length: 3 }).default("USD").notNull(),
    timezone: text("timezone").default("UTC").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("organizations_slug_uq").on(table.slug)],
);

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    displayName: text("display_name"),
    status: text("status").default("active").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    userId: text("user_id").notNull(),
    role: membershipRole("role").notNull(),
    status: membershipStatus("status").default("INVITED").notNull(),
    invitedBy: text("invited_by"),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("memberships_org_user_uq").on(table.organizationId, table.userId),
    index("memberships_org_role_status_idx").on(table.organizationId, table.role, table.status),
  ],
);

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    normalizedEmail: text("normalized_email").notNull(),
    targetRole: membershipRole("target_role").notNull(),
    tokenSha256: char("token_sha256", { length: 64 }).notNull(),
    status: invitationStatus("status").default("PENDING").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: text("accepted_by"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("invitations_token_uq").on(table.tokenSha256),
    uniqueIndex("invitations_pending_email_uq")
      .on(table.organizationId, table.normalizedEmail)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);

export const borrowers = pgTable(
  "borrowers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    legalName: text("legal_name").notNull(),
    referenceCode: text("reference_code").notNull(),
    normalizedReferenceCode: text("normalized_reference_code").notNull(),
    classification: borrowerClassification("classification").default("CORPORATE").notNull(),
    status: borrowerStatus("status").default("ACTIVE").notNull(),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("borrowers_org_ref_uq").on(table.organizationId, table.normalizedReferenceCode),
    index("borrowers_org_name_idx").on(table.organizationId, table.legalName),
  ],
);

export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    borrowerId: uuid("borrower_id").notNull().references(() => borrowers.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    referenceCode: text("reference_code").notNull(),
    facilityType: text("facility_type").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    committedAmount: money("committed_amount").notNull(),
    outstandingAmount: money("outstanding_amount"),
    agreementDate: date("agreement_date").notNull(),
    maturityDate: date("maturity_date"),
    contractTimezone: text("contract_timezone").default("UTC").notNull(),
    status: facilityStatus("status").default("DRAFT").notNull(),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("facilities_org_ref_uq").on(table.organizationId, table.referenceCode),
    index("facilities_org_borrower_status_idx").on(table.organizationId, table.borrowerId, table.status),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
    category: documentCategory("category").notNull(),
    displayName: text("display_name").notNull(),
    currentVersionId: uuid("current_version_id"),
    status: text("status").default("ACTIVE").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("documents_org_facility_category_idx").on(table.organizationId, table.facilityId, table.category)],
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "restrict" }),
    versionNo: integer("version_no").default(1).notNull(),
    objectKey: text("object_key").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    mimeType: text("mime_type").notNull(),
    pageCount: integer("page_count"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    asOfDate: date("as_of_date"),
    processingStatus: documentStatus("processing_status").default("RECEIVED").notNull(),
    parserVersion: text("parser_version"),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    supersedesVersionId: uuid("supersedes_version_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  },
  (table) => [
    uniqueIndex("document_versions_doc_version_uq").on(table.documentId, table.versionNo),
    index("document_versions_org_status_idx").on(table.organizationId, table.processingStatus),
  ],
);

export const extractionRuns = pgTable(
  "extraction_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    documentVersionId: uuid("document_version_id").notNull().references(() => documentVersions.id, { onDelete: "restrict" }),
    extractionType: extractionType("extraction_type").notNull(),
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    promptVersion: text("prompt_version").notNull(),
    providerRequestId: text("provider_request_id"),
    status: extractionStatus("status").default("STARTED").notNull(),
    outputJson: jsonb("output_json").$type<Record<string, unknown>>(),
    outputSha256: char("output_sha256", { length: 64 }),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("extraction_runs_org_document_idx").on(table.organizationId, table.documentVersionId, table.createdAt)],
);

export const covenantDefinitions = pgTable(
  "covenant_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    covenantType: covenantType("covenant_type").default("MAX_LEVERAGE").notNull(),
    activeVersionId: uuid("active_version_id"),
    status: covenantStatus("status").default("DRAFT").notNull(),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("covenant_definitions_org_facility_status_idx").on(table.organizationId, table.facilityId, table.status)],
);

export const covenantDefinitionVersions = pgTable(
  "covenant_definition_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    covenantDefinitionId: uuid("covenant_definition_id").notNull().references(() => covenantDefinitions.id, { onDelete: "restrict" }),
    versionNo: integer("version_no").notNull(),
    formulaAst: jsonb("formula_ast").$type<Record<string, unknown>>().notNull(),
    formulaSha256: char("formula_sha256", { length: 64 }).notNull(),
    threshold: money("threshold").notNull(),
    operator: text("operator").notNull(),
    ratioUnit: text("ratio_unit").default("x").notNull(),
    periodPolicy: jsonb("period_policy").$type<Record<string, unknown>>().notNull(),
    inputMetricKeys: text("input_metric_keys").array().notNull(),
    sourceRefs: jsonb("source_refs").$type<Record<string, unknown>[]>().notNull(),
    contractClauseText: text("contract_clause_text").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    status: covenantStatus("status").default("DRAFT").notNull(),
    createdBy: text("created_by").notNull(),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    supersedesVersionId: uuid("supersedes_version_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("covenant_versions_definition_version_uq").on(table.covenantDefinitionId, table.versionNo),
    index("covenant_versions_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const financialEvidence = pgTable(
  "financial_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
    documentVersionId: uuid("document_version_id").references(() => documentVersions.id, { onDelete: "restrict" }),
    canonicalMetricKey: text("canonical_metric_key").notNull(),
    value: money("value").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    unit: text("unit").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    asOfDate: date("as_of_date"),
    sourcePage: integer("source_page"),
    sourceExcerpt: text("source_excerpt"),
    extractionRunId: uuid("extraction_run_id"),
    status: evidenceStatus("status").default("SUGGESTED").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reason: text("reason"),
    supersedesEvidenceId: uuid("supersedes_evidence_id"),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("financial_evidence_org_facility_metric_idx").on(table.organizationId, table.facilityId, table.canonicalMetricKey),
    index("financial_evidence_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
    covenantDefinitionId: uuid("covenant_definition_id").notNull().references(() => covenantDefinitions.id, { onDelete: "restrict" }),
    covenantVersionId: uuid("covenant_version_id").notNull().references(() => covenantDefinitionVersions.id, { onDelete: "restrict" }),
    assessmentKind: assessmentKind("assessment_kind").notNull(),
    testDate: date("test_date").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    formulaSha256: char("formula_sha256", { length: 64 }).notNull(),
    inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>().notNull(),
    inputSnapshotSha256: char("input_snapshot_sha256", { length: 64 }).notNull(),
    calculatedValue: money("calculated_value"),
    thresholdSnapshot: money("threshold_snapshot").notNull(),
    operatorSnapshot: text("operator_snapshot").notNull(),
    verificationStatus: verificationStatus("verification_status").default("VERIFYING").notNull(),
    complianceStatus: complianceStatus("compliance_status").default("NOT_ASSESSED").notNull(),
    calculationTrace: jsonb("calculation_trace").$type<string[]>(),
    supersedesAssessmentId: uuid("supersedes_assessment_id"),
    createdBy: text("created_by").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("assessments_org_facility_testdate_idx").on(table.organizationId, table.facilityId, table.testDate),
    index("assessments_covenant_date_idx").on(table.covenantDefinitionId, table.testDate),
  ],
);

export const verificationRuns = pgTable(
  "verification_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "restrict" }),
    policyVersion: text("policy_version").notNull(),
    checks: jsonb("checks").$type<Record<string, unknown>>().notNull(),
    recomputedValue: money("recomputed_value"),
    recomputedSnapshotSha256: char("recomputed_snapshot_sha256", { length: 64 }),
    result: verificationStatus("result").notNull(),
    failureCodes: text("failure_codes").array().notNull(),
    verifiedByService: text("verified_by_service").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("verification_runs_org_assessment_idx").on(table.organizationId, table.assessmentId, table.createdAt)],
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
    covenantDefinitionId: uuid("covenant_definition_id").notNull().references(() => covenantDefinitions.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    horizonStart: date("horizon_start").notNull(),
    horizonEnd: date("horizon_end").notNull(),
    assumptionSet: jsonb("assumption_set").$type<Record<string, unknown>>().notNull(),
    status: scenarioStatus("status").default("DRAFT").notNull(),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
);

export const exceptionCases = pgTable(
  "exception_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
    covenantDefinitionId: uuid("covenant_definition_id").references(() => covenantDefinitions.id, { onDelete: "restrict" }),
    assessmentId: uuid("assessment_id").references(() => assessments.id, { onDelete: "restrict" }),
    caseType: caseType("case_type").notNull(),
    severity: caseSeverity("severity").default("MEDIUM").notNull(),
    status: caseStatus("status").default("OPEN").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    ownerUserId: text("owner_user_id"),
    dueDate: date("due_date"),
    resolutionCode: text("resolution_code"),
    resolutionReason: text("resolution_reason"),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("exception_cases_active_assessment_type_uq")
      .on(table.assessmentId, table.caseType)
      .where(sql`${table.status} NOT IN ('RESOLVED','CLOSED')`),
    index("exception_cases_org_status_owner_idx").on(table.organizationId, table.status, table.ownerUserId),
  ],
);

export const caseNotes = pgTable(
  "case_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    caseId: uuid("case_id").notNull().references(() => exceptionCases.id, { onDelete: "restrict" }),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility").default("INTERNAL").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("case_notes_org_case_idx").on(table.organizationId, table.caseId, table.createdAt)],
);

export const memoDrafts = pgTable(
  "memo_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    caseId: uuid("case_id").notNull().references(() => exceptionCases.id, { onDelete: "restrict" }),
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "restrict" }),
    versionNo: integer("version_no").notNull(),
    factsSnapshot: jsonb("facts_snapshot").$type<Record<string, unknown>>().notNull(),
    factsSha256: char("facts_sha256", { length: 64 }).notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    bodySha256: char("body_sha256", { length: 64 }).notNull(),
    status: memoStatus("status").default("DRAFT").notNull(),
    createdBy: text("created_by").notNull(),
    supersedesMemoId: uuid("supersedes_memo_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("memo_drafts_case_version_uq").on(table.caseId, table.versionNo)],
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    actionType: approvalAction("action_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    requesterId: text("requester_id").notNull(),
    actionPayload: jsonb("action_payload").$type<Record<string, unknown>>().notNull(),
    payloadSha256: char("payload_sha256", { length: 64 }).notNull(),
    dependencyVersions: jsonb("dependency_versions").$type<Record<string, unknown>>().notNull(),
    status: approvalStatus("status").default("PENDING").notNull(),
    supersedesRequestId: uuid("supersedes_request_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    version: integer("version").default(1).notNull(),
  },
  (table) => [index("approval_requests_org_status_idx").on(table.organizationId, table.status, table.createdAt)],
);

export const approvalDecisions = pgTable(
  "approval_decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    approvalRequestId: uuid("approval_request_id").notNull().references(() => approvalRequests.id, { onDelete: "restrict" }),
    decision: decisionStatus("decision").notNull(),
    decidedBy: text("decided_by").notNull(),
    reason: text("reason"),
    payloadSha256: char("payload_sha256", { length: 64 }).notNull(),
    dependencyVersions: jsonb("dependency_versions").$type<Record<string, unknown>>().notNull(),
    auditEventId: uuid("audit_event_id"),
    decidedAt: createdAt(),
  },
  (table) => [uniqueIndex("approval_decisions_request_uq").on(table.approvalRequestId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    sequenceNo: bigint("sequence_no", { mode: "number" }).notNull(),
    actorType: actorType("actor_type").notNull(),
    actorUserId: text("actor_user_id"),
    eventType: text("event_type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    payloadSha256: char("payload_sha256", { length: 64 }).notNull(),
    previousHash: char("previous_hash", { length: 64 }).notNull(),
    eventHash: char("event_hash", { length: 64 }).notNull(),
    signature: text("signature"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("audit_events_org_sequence_uq").on(table.organizationId, table.sequenceNo),
    uniqueIndex("audit_events_org_hash_uq").on(table.organizationId, table.eventHash),
    index("audit_events_org_created_idx").on(table.organizationId, table.createdAt),
    index("audit_events_entity_idx").on(table.organizationId, table.entityType, table.entityId),
  ],
);

export const auditHeads = pgTable("audit_heads", {
  organizationId: uuid("organization_id").primaryKey().references(() => organizations.id, { onDelete: "restrict" }),
  lastSequenceNo: bigint("last_sequence_no", { mode: "number" }).default(0).notNull(),
  lastHash: char("last_hash", { length: 64 }).default("GENESIS").notNull(),
  updatedAt: updatedAt(),
});

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    userId: text("user_id").notNull(),
    routeKey: text("route_key").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: char("request_hash", { length: 64 }).notNull(),
    responseStatus: integer("response_status").notNull(),
    responseBody: jsonb("response_body").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("idempotency_org_user_route_key_uq").on(table.organizationId, table.userId, table.routeKey, table.idempotencyKey),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatus("status").default("QUEUED").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }).defaultNow().notNull(),
    lastErrorCode: text("last_error_code"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("jobs_idempotency_key_uq").on(table.idempotencyKey),
    index("jobs_queue_idx").on(table.status, table.nextRunAt),
  ],
);

export const schema = {
  organizations,
  profiles,
  memberships,
  organizationInvitations,
  borrowers,
  facilities,
  documents,
  documentVersions,
  extractionRuns,
  covenantDefinitions,
  covenantDefinitionVersions,
  financialEvidence,
  assessments,
  verificationRuns,
  scenarios,
  exceptionCases,
  caseNotes,
  memoDrafts,
  approvalRequests,
  approvalDecisions,
  auditEvents,
  auditHeads,
  idempotencyKeys,
  jobs,
};
