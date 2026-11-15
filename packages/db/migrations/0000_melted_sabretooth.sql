CREATE TYPE "public"."actor_type" AS ENUM('USER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."approval_action" AS ENUM('ACTIVATE_COVENANT', 'APPROVE_MEMO', 'CLOSE_CASE');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'INVALIDATED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."assessment_kind" AS ENUM('ACTUAL', 'FORECAST');--> statement-breakpoint
CREATE TYPE "public"."borrower_classification" AS ENUM('CORPORATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."borrower_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."case_severity" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('OPEN', 'ASSIGNED', 'INVESTIGATING', 'AWAITING_INFORMATION', 'AWAITING_APPROVAL', 'ESCALATED', 'RESOLUTION_IN_PROGRESS', 'RESOLVED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('BREACH', 'POTENTIAL_BREACH', 'MISSING_EVIDENCE', 'CONFLICTING_EVIDENCE', 'CONTRACT_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."compliance_status" AS ENUM('COMPLIANT', 'BREACHED', 'INDETERMINATE', 'NOT_ASSESSED', 'AT_RISK', 'NO_PROJECTED_BREACH');--> statement-breakpoint
CREATE TYPE "public"."covenant_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'NEEDS_REVIEW', 'REJECTED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."covenant_type" AS ENUM('MAX_LEVERAGE');--> statement-breakpoint
CREATE TYPE "public"."decision_status" AS ENUM('APPROVED', 'REJECTED', 'CHANGES_REQUESTED');--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('CREDIT_AGREEMENT', 'AMENDMENT', 'FINANCIAL_STATEMENT', 'MANAGEMENT_ACCOUNTS', 'DEBT_SCHEDULE', 'OTHER_SUPPORT');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('RECEIVED', 'QUARANTINED', 'SCANNING', 'EXTRACTING_TEXT', 'AI_EXTRACTION', 'NEEDS_REVIEW', 'PROCESSED', 'UNSUPPORTED_SCANNED_PDF', 'REJECTED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('SUGGESTED', 'CONFIRMED', 'REJECTED', 'SUPERSEDED', 'MANUAL_CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('STARTED', 'SUCCEEDED', 'NEEDS_REVIEW', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."extraction_type" AS ENUM('COVENANT', 'FINANCIAL_METRIC');--> statement-breakpoint
CREATE TYPE "public"."facility_status" AS ENUM('DRAFT', 'ACTIVE', 'MATURED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('ORG_ADMIN', 'CREDIT_ANALYST', 'CREDIT_MANAGER', 'PORTFOLIO_MANAGER', 'AUDITOR');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."memo_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."scenario_status" AS ENUM('DRAFT', 'SAVED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('VERIFYING', 'VERIFIED', 'FAILED', 'INCOMPLETE', 'STALE');--> statement-breakpoint
CREATE TABLE "approval_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"approval_request_id" uuid NOT NULL,
	"decision" "decision_status" NOT NULL,
	"decided_by" text NOT NULL,
	"reason" text,
	"payload_sha256" char(64) NOT NULL,
	"dependency_versions" jsonb NOT NULL,
	"audit_event_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"action_type" "approval_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"requester_id" text NOT NULL,
	"action_payload" jsonb NOT NULL,
	"payload_sha256" char(64) NOT NULL,
	"dependency_versions" jsonb NOT NULL,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"supersedes_request_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"covenant_definition_id" uuid NOT NULL,
	"covenant_version_id" uuid NOT NULL,
	"assessment_kind" "assessment_kind" NOT NULL,
	"test_date" date NOT NULL,
	"period_start" date,
	"period_end" date,
	"formula_sha256" char(64) NOT NULL,
	"input_snapshot" jsonb NOT NULL,
	"input_snapshot_sha256" char(64) NOT NULL,
	"calculated_value" numeric(24, 8),
	"threshold_snapshot" numeric(24, 8) NOT NULL,
	"operator_snapshot" text NOT NULL,
	"verification_status" "verification_status" DEFAULT 'VERIFYING' NOT NULL,
	"compliance_status" "compliance_status" DEFAULT 'NOT_ASSESSED' NOT NULL,
	"calculation_trace" jsonb,
	"supersedes_assessment_id" uuid,
	"created_by" text NOT NULL,
	"verified_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"sequence_no" bigint NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_user_id" text,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_sha256" char(64) NOT NULL,
	"previous_hash" char(64) NOT NULL,
	"event_hash" char(64) NOT NULL,
	"signature" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_heads" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"last_sequence_no" bigint DEFAULT 0 NOT NULL,
	"last_hash" char(64) DEFAULT 'GENESIS' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrowers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"reference_code" text NOT NULL,
	"normalized_reference_code" text NOT NULL,
	"classification" "borrower_classification" DEFAULT 'CORPORATE' NOT NULL,
	"status" "borrower_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"visibility" text DEFAULT 'INTERNAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "covenant_definition_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"covenant_definition_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"formula_ast" jsonb NOT NULL,
	"formula_sha256" char(64) NOT NULL,
	"threshold" numeric(24, 8) NOT NULL,
	"operator" text NOT NULL,
	"ratio_unit" text DEFAULT 'x' NOT NULL,
	"period_policy" jsonb NOT NULL,
	"input_metric_keys" text[] NOT NULL,
	"source_refs" jsonb NOT NULL,
	"contract_clause_text" text NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"status" "covenant_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"supersedes_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "covenant_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"name" text NOT NULL,
	"covenant_type" "covenant_type" DEFAULT 'MAX_LEVERAGE' NOT NULL,
	"active_version_id" uuid,
	"status" "covenant_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"version_no" integer DEFAULT 1 NOT NULL,
	"object_key" text NOT NULL,
	"sha256" char(64) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"page_count" integer,
	"period_start" date,
	"period_end" date,
	"as_of_date" date,
	"processing_status" "document_status" DEFAULT 'RECEIVED' NOT NULL,
	"parser_version" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_version_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"category" "document_category" NOT NULL,
	"display_name" text NOT NULL,
	"current_version_id" uuid,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exception_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"covenant_definition_id" uuid,
	"assessment_id" uuid,
	"case_type" "case_type" NOT NULL,
	"severity" "case_severity" DEFAULT 'MEDIUM' NOT NULL,
	"status" "case_status" DEFAULT 'OPEN' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"owner_user_id" text,
	"due_date" date,
	"resolution_code" text,
	"resolution_reason" text,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"document_version_id" uuid NOT NULL,
	"extraction_type" "extraction_type" NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"prompt_version" text NOT NULL,
	"provider_request_id" text,
	"status" "extraction_status" DEFAULT 'STARTED' NOT NULL,
	"output_json" jsonb,
	"output_sha256" char(64),
	"input_tokens" integer,
	"output_tokens" integer,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"name" text NOT NULL,
	"reference_code" text NOT NULL,
	"facility_type" text NOT NULL,
	"currency" char(3) NOT NULL,
	"committed_amount" numeric(24, 8) NOT NULL,
	"outstanding_amount" numeric(24, 8),
	"agreement_date" date NOT NULL,
	"maturity_date" date,
	"contract_timezone" text DEFAULT 'UTC' NOT NULL,
	"status" "facility_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"document_version_id" uuid,
	"canonical_metric_key" text NOT NULL,
	"value" numeric(24, 8) NOT NULL,
	"currency" char(3) NOT NULL,
	"unit" text NOT NULL,
	"period_start" date,
	"period_end" date,
	"as_of_date" date,
	"source_page" integer,
	"source_excerpt" text,
	"extraction_run_id" uuid,
	"status" "evidence_status" DEFAULT 'SUGGESTED' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"reason" text,
	"supersedes_evidence_id" uuid,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"route_key" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" char(64) NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"job_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'QUEUED' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"lease_until" timestamp with time zone,
	"next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error_code" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "membership_role" NOT NULL,
	"status" "membership_status" DEFAULT 'INVITED' NOT NULL,
	"invited_by" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memo_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"facts_snapshot" jsonb NOT NULL,
	"facts_sha256" char(64) NOT NULL,
	"body_markdown" text NOT NULL,
	"body_sha256" char(64) NOT NULL,
	"status" "memo_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"supersedes_memo_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"normalized_email" text NOT NULL,
	"target_role" "membership_role" NOT NULL,
	"token_sha256" char(64) NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by" text,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"default_currency" char(3) DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"covenant_definition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"horizon_start" date NOT NULL,
	"horizon_end" date NOT NULL,
	"assumption_set" jsonb NOT NULL,
	"status" "scenario_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"policy_version" text NOT NULL,
	"checks" jsonb NOT NULL,
	"recomputed_value" numeric(24, 8),
	"recomputed_snapshot_sha256" char(64),
	"result" "verification_status" NOT NULL,
	"failure_codes" text[] NOT NULL,
	"verified_by_service" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_approval_request_id_approval_requests_id_fk" FOREIGN KEY ("approval_request_id") REFERENCES "public"."approval_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_covenant_definition_id_covenant_definitions_id_fk" FOREIGN KEY ("covenant_definition_id") REFERENCES "public"."covenant_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_covenant_version_id_covenant_definition_versions_id_fk" FOREIGN KEY ("covenant_version_id") REFERENCES "public"."covenant_definition_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_heads" ADD CONSTRAINT "audit_heads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_notes" ADD CONSTRAINT "case_notes_case_id_exception_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."exception_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covenant_definition_versions" ADD CONSTRAINT "covenant_definition_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covenant_definition_versions" ADD CONSTRAINT "covenant_definition_versions_covenant_definition_id_covenant_definitions_id_fk" FOREIGN KEY ("covenant_definition_id") REFERENCES "public"."covenant_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covenant_definitions" ADD CONSTRAINT "covenant_definitions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covenant_definitions" ADD CONSTRAINT "covenant_definitions_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception_cases" ADD CONSTRAINT "exception_cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception_cases" ADD CONSTRAINT "exception_cases_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception_cases" ADD CONSTRAINT "exception_cases_covenant_definition_id_covenant_definitions_id_fk" FOREIGN KEY ("covenant_definition_id") REFERENCES "public"."covenant_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exception_cases" ADD CONSTRAINT "exception_cases_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_evidence" ADD CONSTRAINT "financial_evidence_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_evidence" ADD CONSTRAINT "financial_evidence_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_evidence" ADD CONSTRAINT "financial_evidence_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_drafts" ADD CONSTRAINT "memo_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_drafts" ADD CONSTRAINT "memo_drafts_case_id_exception_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."exception_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memo_drafts" ADD CONSTRAINT "memo_drafts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_covenant_definition_id_covenant_definitions_id_fk" FOREIGN KEY ("covenant_definition_id") REFERENCES "public"."covenant_definitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_decisions_request_uq" ON "approval_decisions" USING btree ("approval_request_id");--> statement-breakpoint
CREATE INDEX "approval_requests_org_status_idx" ON "approval_requests" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "assessments_org_facility_testdate_idx" ON "assessments" USING btree ("organization_id","facility_id","test_date");--> statement-breakpoint
CREATE INDEX "assessments_covenant_date_idx" ON "assessments" USING btree ("covenant_definition_id","test_date");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_org_sequence_uq" ON "audit_events" USING btree ("organization_id","sequence_no");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_org_hash_uq" ON "audit_events" USING btree ("organization_id","event_hash");--> statement-breakpoint
CREATE INDEX "audit_events_org_created_idx" ON "audit_events" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "borrowers_org_ref_uq" ON "borrowers" USING btree ("organization_id","normalized_reference_code");--> statement-breakpoint
CREATE INDEX "borrowers_org_name_idx" ON "borrowers" USING btree ("organization_id","legal_name");--> statement-breakpoint
CREATE INDEX "case_notes_org_case_idx" ON "case_notes" USING btree ("organization_id","case_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "covenant_versions_definition_version_uq" ON "covenant_definition_versions" USING btree ("covenant_definition_id","version_no");--> statement-breakpoint
CREATE INDEX "covenant_versions_org_status_idx" ON "covenant_definition_versions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "covenant_definitions_org_facility_status_idx" ON "covenant_definitions" USING btree ("organization_id","facility_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_doc_version_uq" ON "document_versions" USING btree ("document_id","version_no");--> statement-breakpoint
CREATE INDEX "document_versions_org_status_idx" ON "document_versions" USING btree ("organization_id","processing_status");--> statement-breakpoint
CREATE INDEX "documents_org_facility_category_idx" ON "documents" USING btree ("organization_id","facility_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "exception_cases_active_assessment_type_uq" ON "exception_cases" USING btree ("assessment_id","case_type") WHERE "exception_cases"."status" NOT IN ('RESOLVED','CLOSED');--> statement-breakpoint
CREATE INDEX "exception_cases_org_status_owner_idx" ON "exception_cases" USING btree ("organization_id","status","owner_user_id");--> statement-breakpoint
CREATE INDEX "extraction_runs_org_document_idx" ON "extraction_runs" USING btree ("organization_id","document_version_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_org_ref_uq" ON "facilities" USING btree ("organization_id","reference_code");--> statement-breakpoint
CREATE INDEX "facilities_org_borrower_status_idx" ON "facilities" USING btree ("organization_id","borrower_id","status");--> statement-breakpoint
CREATE INDEX "financial_evidence_org_facility_metric_idx" ON "financial_evidence" USING btree ("organization_id","facility_id","canonical_metric_key");--> statement-breakpoint
CREATE INDEX "financial_evidence_org_status_idx" ON "financial_evidence" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_org_user_route_key_uq" ON "idempotency_keys" USING btree ("organization_id","user_id","route_key","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_idempotency_key_uq" ON "jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "jobs_queue_idx" ON "jobs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_uq" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_org_role_status_idx" ON "memberships" USING btree ("organization_id","role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "memo_drafts_case_version_uq" ON "memo_drafts" USING btree ("case_id","version_no");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_uq" ON "organization_invitations" USING btree ("token_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_email_uq" ON "organization_invitations" USING btree ("organization_id","normalized_email") WHERE "organization_invitations"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uq" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "verification_runs_org_assessment_idx" ON "verification_runs" USING btree ("organization_id","assessment_id","created_at");