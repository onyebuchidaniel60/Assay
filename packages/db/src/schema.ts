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

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
const sealed = (name: string) => ({
  ciphertext: text(`${name}_ciphertext`).notNull(),
  nonce: text(`${name}_nonce`).notNull(),
  tag: text(`${name}_tag`).notNull(),
});

export const organizationStatus = pgEnum("organization_status", ["ACTIVE", "SUSPENDED"]);
export const membershipRole = pgEnum("membership_role", ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);
export const membershipStatus = pgEnum("membership_status", ["INVITED", "ACTIVE", "SUSPENDED", "REVOKED"]);
export const invitationStatus = pgEnum("invitation_status", ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]);
export const profileStatus = pgEnum("profile_status", ["ACTIVE", "DISABLED"]);
export const borrowerStatus = pgEnum("borrower_status", ["ACTIVE", "ARCHIVED"]);
export const facilityStatus = pgEnum("facility_status", ["ACTIVE", "CLOSED"]);
export const documentStatus = pgEnum("document_status", [
  "UPLOADED",
  "PROCESSING",
  "REDACTION_REVIEW",
  "READY",
  "FAILED",
  "SHREDDED",
]);
export const analysisStatus = pgEnum("analysis_status", [
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
  "PROOF_FAILED",
  "READY_FOR_MANAGER",
  "APPROVED",
  "REJECTED",
  "FAILED",
  "CANCELLED",
]);
export const covenantReviewStatus = pgEnum("covenant_review_status", ["PENDING", "CONFIRMED", "REJECTED"]);
export const scenarioKind = pgEnum("scenario_kind", ["BASELINE", "EBITDA_DOWN_10", "DEBT_UP_10"]);
export const scenarioOutcome = pgEnum("scenario_outcome", ["COMPLIANT", "BREACH"]);
export const riskBand = pgEnum("risk_band", ["LOW", "MEDIUM", "HIGH"]);
export const resultCode = pgEnum("result_code", ["COMPLIANT", "BREACH", "UNKNOWN"]);
export const proofState = pgEnum("proof_state", ["VERIFYING", "VERIFIED", "FAILED"]);
export const approvalDecision = pgEnum("approval_decision", ["APPROVE", "REJECT"]);
export const actorType = pgEnum("actor_type", ["USER", "SYSTEM"]);
export const extractionStatus = pgEnum("extraction_status", ["STARTED", "SUCCEEDED", "FAILED"]);
export const jobStatus = pgEnum("job_status", ["QUEUED", "RUNNING", "RETRY", "SUCCEEDED", "FAILED", "CANCELLED"]);
export const borrowerKeyStatus = pgEnum("borrower_key_status", ["ACTIVE", "SHREDDED"]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: organizationStatus("status").default("ACTIVE").notNull(),
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
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    status: profileStatus("status").default("ACTIVE").notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("profiles_email_uq").on(table.email)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "restrict" }),
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
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
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
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    displayAlias: text("display_alias").notNull(),
    referenceToken: text("reference_token").notNull(),
    normalizedReferenceToken: text("normalized_reference_token").notNull(),
    status: borrowerStatus("status").default("ACTIVE").notNull(),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("borrowers_org_reference_uq").on(table.organizationId, table.normalizedReferenceToken),
    index("borrowers_org_alias_idx").on(table.organizationId, table.displayAlias),
  ],
);

export const borrowerKeys = pgTable(
  "borrower_keys",
  {
    borrowerId: uuid("borrower_id")
      .primaryKey()
      .references(() => borrowers.id, { onDelete: "restrict" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    wrappedDek: text("wrapped_dek").notNull(),
    wrapNonce: text("wrap_nonce").notNull(),
    wrapTag: text("wrap_tag").notNull(),
    keyVersion: integer("key_version").default(1).notNull(),
    status: borrowerKeyStatus("status").default("ACTIVE").notNull(),
    createdAt: createdAt(),
    shreddedAt: timestamp("shredded_at", { withTimezone: true }),
  },
);

export const facilities = pgTable(
  "facilities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => borrowers.id, { onDelete: "restrict" }),
    facilityReferenceToken: text("facility_reference_token").notNull(),
    normalizedFacilityReferenceToken: text("normalized_facility_reference_token").notNull(),
    label: text("label").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    status: facilityStatus("status").default("ACTIVE").notNull(),
    createdBy: text("created_by").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("facilities_borrower_reference_uq").on(table.borrowerId, table.normalizedFacilityReferenceToken),
    index("facilities_org_borrower_status_idx").on(table.organizationId, table.borrowerId, table.status),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => borrowers.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "restrict" }),
    uploadedBy: text("uploaded_by").notNull(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    pageCount: integer("page_count"),
    storageKey: text("storage_key").notNull(),
    sha256Ciphertext: char("sha256_ciphertext", { length: 64 }).notNull(),
    contentHmac: char("content_hmac", { length: 64 }).notNull(),
    status: documentStatus("status").default("UPLOADED").notNull(),
    failureCode: text("failure_code"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("documents_borrower_facility_checksum_uq").on(
      table.borrowerId,
      table.facilityId,
      table.sha256Ciphertext,
    ),
    index("documents_org_facility_status_idx").on(table.organizationId, table.facilityId, table.status),
  ],
);

export const analysisRuns = pgTable(
  "analysis_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => borrowers.id, { onDelete: "restrict" }),
    facilityId: uuid("facility_id")
      .notNull()
      .references(() => facilities.id, { onDelete: "restrict" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "restrict" }),
    runNumber: integer("run_number").notNull(),
    status: analysisStatus("status").default("DRAFT").notNull(),
    createdBy: text("created_by").notNull(),
    servTraceId: text("serv_trace_id"),
    providerTrace: jsonb("provider_trace").$type<Record<string, unknown>>().default({}).notNull(),
    termsVersion: integer("terms_version"),
    financialInputsHash: char("financial_inputs_hash", { length: 64 }),
    resultCode: resultCode("result_code"),
    failureCode: text("failure_code"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("analysis_runs_facility_run_number_uq").on(table.facilityId, table.runNumber),
    uniqueIndex("analysis_runs_document_uq").on(table.documentId),
    index("analysis_runs_org_status_idx").on(table.organizationId, table.status, table.createdAt),
    index("analysis_runs_org_borrower_created_idx").on(table.organizationId, table.borrowerId, table.createdAt),
  ],
);

export const covenantTerms = pgTable(
  "covenant_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    covenantType: text("covenant_type").default("DEBT_TO_ADJUSTED_EBITDA").notNull(),
    comparator: text("comparator").default("LTE").notNull(),
    thresholdBps: integer("threshold_bps").notNull(),
    currency: char("currency", { length: 3 }),
    totalDebtDefinition: text("total_debt_definition").notNull(),
    ebitdaDefinition: text("ebitda_definition").notNull(),
    permittedAddbacks: jsonb("permitted_addbacks").$type<Record<string, unknown>[]>().notNull(),
    testingDate: date("testing_date"),
    cureRightsSummary: text("cure_rights_summary"),
    evidence: jsonb("evidence").$type<Record<string, unknown>[]>().notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    uncertaintyNotes: jsonb("uncertainty_notes").$type<string[]>().notNull(),
    reviewStatus: covenantReviewStatus("review_status").default("PENDING").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("covenant_terms_run_uq").on(table.analysisRunId),
    index("covenant_terms_org_review_idx").on(table.organizationId, table.reviewStatus),
  ],
);

export const financialInputs = pgTable(
  "financial_inputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    currency: char("currency", { length: 3 }).notNull(),
    ...sealed("payload"),
    financialInputsHash: char("financial_inputs_hash", { length: 64 }).notNull(),
    attestedBy: text("attested_by").notNull(),
    attestedAt: timestamp("attested_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("financial_inputs_run_uq").on(table.analysisRunId)],
);

export const scenarioResults = pgTable(
  "scenario_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    scenario: scenarioKind("scenario").notNull(),
    ...sealed("payload"),
    result: scenarioOutcome("result").notNull(),
    riskBand: riskBand("risk_band"),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("scenario_results_run_scenario_uq").on(table.analysisRunId, table.scenario)],
);

export const proofArtifacts = pgTable(
  "proof_artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    circuitVersion: text("circuit_version").notNull(),
    verificationKeyHash: char("verification_key_hash", { length: 64 }).notNull(),
    proofStorageKey: text("proof_storage_key").notNull(),
    publicSignals: jsonb("public_signals").$type<string[]>().notNull(),
    witnessCommitment: char("witness_commitment", { length: 64 }).notNull(),
    status: proofState("status").default("VERIFYING").notNull(),
    verified: boolean("verified").default(false).notNull(),
    errorCode: text("error_code"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("proof_artifacts_run_uq").on(table.analysisRunId)],
);

export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    managerId: text("manager_id").notNull(),
    decision: approvalDecision("decision").notNull(),
    riskAcknowledged: boolean("risk_acknowledged").default(false).notNull(),
    rationale: text("rationale"),
    proofArtifactId: uuid("proof_artifact_id").references(() => proofArtifacts.id, { onDelete: "restrict" }),
    analysisVersion: integer("analysis_version").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("approvals_run_uq").on(table.analysisRunId),
    index("approvals_manager_created_idx").on(table.managerId, table.createdAt),
  ],
);

export const redactionRevisions = pgTable(
  "redaction_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull(),
    redactedTextStorageKey: text("redacted_text_storage_key").notNull(),
    encryptedTokenMap: text("encrypted_token_map").notNull(),
    tokenMapNonce: text("token_map_nonce").notNull(),
    tokenMapTag: text("token_map_tag").notNull(),
    entities: jsonb("entities").$type<Record<string, unknown>[]>().notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("redaction_revisions_run_revision_uq").on(table.analysisRunId, table.revision)],
);

export const extractionRuns = pgTable(
  "extraction_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    promptVersion: text("prompt_version").notNull(),
    providerRequestId: text("provider_request_id"),
    status: extractionStatus("status").default("STARTED").notNull(),
    outputSha256: char("output_sha256", { length: 64 }),
    attestation: jsonb("attestation").$type<Record<string, unknown>>().default({}).notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    errorCode: text("error_code"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("extraction_runs_run_created_idx").on(table.analysisRunId, table.createdAt)],
);

export const feedbackRecords = pgTable(
  "feedback_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    analysisRunId: uuid("analysis_run_id")
      .notNull()
      .references(() => analysisRuns.id, { onDelete: "restrict" }),
    createdBy: text("created_by").notNull(),
    correctionType: text("correction_type").notNull(),
    beforeValue: jsonb("before_value").$type<Record<string, unknown>>().notNull(),
    afterValue: jsonb("after_value").$type<Record<string, unknown>>().notNull(),
    syntheticOnly: boolean("synthetic_only").default(true).notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("feedback_records_run_idx").on(table.analysisRunId, table.createdAt)],
);

export const reppoEvaluations = pgTable(
  "reppo_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    feedbackRecordId: uuid("feedback_record_id")
      .notNull()
      .references(() => feedbackRecords.id, { onDelete: "restrict" }),
    providerEvalId: text("provider_eval_id"),
    status: text("status").default("PENDING").notNull(),
    providerStatus: text("provider_status"),
    score: integer("score"),
    decision: text("decision"),
    confidence: text("confidence"),
    critique: jsonb("critique").$type<Record<string, unknown>>(),
    result: jsonb("result").$type<Record<string, unknown>>(),
    route: text("route"),
    creditsCharged: integer("credits_charged"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    maxWaitMinutes: integer("max_wait_minutes").default(10).notNull(),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    providerCost: numeric("provider_cost", { precision: 12, scale: 6 }),
  },
  (table) => [
    uniqueIndex("reppo_evaluations_provider_id_uq").on(table.providerEvalId),
    index("reppo_evaluations_status_idx").on(table.status, table.submittedAt),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    borrowerId: uuid("borrower_id")
      .notNull()
      .references(() => borrowers.id, { onDelete: "restrict" }),
    sequenceNo: bigint("sequence_no", { mode: "number" }).notNull(),
    eventType: text("event_type").notNull(),
    actorType: actorType("actor_type").notNull(),
    actorId: text("actor_id"),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    previousHash: char("previous_hash", { length: 64 }).notNull(),
    ...sealed("payload"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    eventHash: char("event_hash", { length: 64 }).notNull(),
    signature: text("signature").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("audit_events_borrower_sequence_uq").on(table.borrowerId, table.sequenceNo),
    uniqueIndex("audit_events_borrower_hash_uq").on(table.borrowerId, table.eventHash),
    index("audit_events_borrower_created_idx").on(table.borrowerId, table.createdAt),
    index("audit_events_org_entity_idx").on(table.organizationId, table.entityType, table.entityId),
  ],
);

export const auditHeads = pgTable("audit_heads", {
  borrowerId: uuid("borrower_id")
    .primaryKey()
    .references(() => borrowers.id, { onDelete: "restrict" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "restrict" }),
  lastSequenceNo: bigint("last_sequence_no", { mode: "number" }).default(0).notNull(),
  lastHash: char("last_hash", { length: 64 }).default("GENESIS").notNull(),
  updatedAt: updatedAt(),
});

export const idempotencyRecords = pgTable(
  "idempotency_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    actorId: text("actor_id").notNull(),
    key: text("key").notNull(),
    method: text("method").notNull(),
    route: text("route").notNull(),
    requestHash: char("request_hash", { length: 64 }).notNull(),
    responseStatus: integer("response_status").notNull(),
    responseResourceType: text("response_resource_type").notNull(),
    responseResourceId: text("response_resource_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("idempotency_org_actor_key_uq").on(table.organizationId, table.actorId, table.key),
    index("idempotency_created_idx").on(table.createdAt),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    jobType: text("job_type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: jobStatus("status").default("QUEUED").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
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
  borrowerKeys,
  facilities,
  documents,
  analysisRuns,
  covenantTerms,
  financialInputs,
  scenarioResults,
  proofArtifacts,
  approvals,
  redactionRevisions,
  extractionRuns,
  feedbackRecords,
  reppoEvaluations,
  auditEvents,
  auditHeads,
  idempotencyRecords,
  jobs,
};
