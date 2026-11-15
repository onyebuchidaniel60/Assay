CREATE TYPE "public"."actor_type" AS ENUM('USER', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."analysis_status" AS ENUM('DRAFT', 'FILE_UPLOADED', 'PARSING', 'REDACTION_REVIEW', 'REDACTION_CONFIRMED', 'EXTRACTION_PENDING', 'TERMS_REVIEW', 'TERMS_CONFIRMED', 'FINANCIALS_PENDING', 'FINANCIALS_CONFIRMED', 'CALCULATION_PENDING', 'CALCULATED', 'CALCULATED_SERV_PENDING', 'BREACH_REVIEW', 'PROOF_PENDING', 'PROOF_VERIFIED', 'PROOF_FAILED', 'READY_FOR_MANAGER', 'APPROVED', 'REJECTED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."approval_decision" AS ENUM('APPROVE', 'REJECT');--> statement-breakpoint
CREATE TYPE "public"."borrower_key_status" AS ENUM('ACTIVE', 'SHREDDED');--> statement-breakpoint
CREATE TYPE "public"."borrower_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."covenant_review_status" AS ENUM('PENDING', 'CONFIRMED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('UPLOADED', 'PROCESSING', 'REDACTION_REVIEW', 'READY', 'FAILED', 'SHREDDED');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('STARTED', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."facility_status" AS ENUM('ACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('QUEUED', 'RUNNING', 'RETRY', 'SUCCEEDED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('ANALYST', 'MANAGER', 'AUDITOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."proof_state" AS ENUM('VERIFYING', 'VERIFIED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."result_code" AS ENUM('COMPLIANT', 'BREACH', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."risk_band" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."scenario_kind" AS ENUM('BASELINE', 'EBITDA_DOWN_10', 'DEBT_UP_10');--> statement-breakpoint
CREATE TYPE "public"."scenario_outcome" AS ENUM('COMPLIANT', 'BREACH');--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"run_number" integer NOT NULL,
	"status" "analysis_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" text NOT NULL,
	"serv_trace_id" text,
	"provider_trace" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"terms_version" integer,
	"financial_inputs_hash" char(64),
	"result_code" "result_code",
	"failure_code" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"manager_id" text NOT NULL,
	"decision" "approval_decision" NOT NULL,
	"risk_acknowledged" boolean DEFAULT false NOT NULL,
	"rationale" text,
	"proof_artifact_id" uuid,
	"analysis_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"sequence_no" bigint NOT NULL,
	"event_type" text NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" text,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"previous_hash" char(64) NOT NULL,
	"payload_ciphertext" text NOT NULL,
	"payload_nonce" text NOT NULL,
	"payload_tag" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_hash" char(64) NOT NULL,
	"signature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_heads" (
	"borrower_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"last_sequence_no" bigint DEFAULT 0 NOT NULL,
	"last_hash" char(64) DEFAULT 'GENESIS' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borrower_keys" (
	"borrower_id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"wrapped_dek" text NOT NULL,
	"wrap_nonce" text NOT NULL,
	"wrap_tag" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"status" "borrower_key_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shredded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "borrowers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"display_alias" text NOT NULL,
	"reference_token" text NOT NULL,
	"normalized_reference_token" text NOT NULL,
	"status" "borrower_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "covenant_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"covenant_type" text DEFAULT 'DEBT_TO_ADJUSTED_EBITDA' NOT NULL,
	"comparator" text DEFAULT 'LTE' NOT NULL,
	"threshold_bps" integer NOT NULL,
	"currency" char(3),
	"total_debt_definition" text NOT NULL,
	"ebitda_definition" text NOT NULL,
	"permitted_addbacks" jsonb NOT NULL,
	"testing_date" date,
	"cure_rights_summary" text,
	"evidence" jsonb NOT NULL,
	"confidence" numeric(4, 3),
	"uncertainty_notes" jsonb NOT NULL,
	"review_status" "covenant_review_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"facility_id" uuid NOT NULL,
	"uploaded_by" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"page_count" integer,
	"storage_key" text NOT NULL,
	"sha256_ciphertext" char(64) NOT NULL,
	"content_hmac" char(64) NOT NULL,
	"status" "document_status" DEFAULT 'UPLOADED' NOT NULL,
	"failure_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"prompt_version" text NOT NULL,
	"provider_request_id" text,
	"status" "extraction_status" DEFAULT 'STARTED' NOT NULL,
	"output_sha256" char(64),
	"attestation" jsonb DEFAULT '{}'::jsonb NOT NULL,
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
	"facility_reference_token" text NOT NULL,
	"normalized_facility_reference_token" text NOT NULL,
	"label" text NOT NULL,
	"currency" char(3) NOT NULL,
	"status" "facility_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"correction_type" text NOT NULL,
	"before_value" jsonb NOT NULL,
	"after_value" jsonb NOT NULL,
	"synthetic_only" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"currency" char(3) NOT NULL,
	"payload_ciphertext" text NOT NULL,
	"payload_nonce" text NOT NULL,
	"payload_tag" text NOT NULL,
	"financial_inputs_hash" char(64) NOT NULL,
	"attested_by" text NOT NULL,
	"attested_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"key" text NOT NULL,
	"method" text NOT NULL,
	"route" text NOT NULL,
	"request_hash" char(64) NOT NULL,
	"response_status" integer NOT NULL,
	"response_resource_type" text NOT NULL,
	"response_resource_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"locked_at" timestamp with time zone,
	"locked_by" text,
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
	"status" "organization_status" DEFAULT 'ACTIVE' NOT NULL,
	"default_currency" char(3) DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "profile_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proof_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"circuit_version" text NOT NULL,
	"verification_key_hash" char(64) NOT NULL,
	"proof_storage_key" text NOT NULL,
	"public_signals" jsonb NOT NULL,
	"witness_commitment" char(64) NOT NULL,
	"status" "proof_state" DEFAULT 'VERIFYING' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"error_code" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redaction_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"redacted_text_storage_key" text NOT NULL,
	"encrypted_token_map" text NOT NULL,
	"token_map_nonce" text NOT NULL,
	"token_map_tag" text NOT NULL,
	"entities" jsonb NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reppo_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"feedback_record_id" uuid NOT NULL,
	"provider_eval_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"score" integer,
	"decision" text,
	"confidence" text,
	"critique" jsonb,
	"route" text,
	"submitted_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"provider_cost" numeric(12, 6)
);
--> statement-breakpoint
CREATE TABLE "scenario_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"scenario" "scenario_kind" NOT NULL,
	"payload_ciphertext" text NOT NULL,
	"payload_nonce" text NOT NULL,
	"payload_tag" text NOT NULL,
	"result" "scenario_outcome" NOT NULL,
	"risk_band" "risk_band",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_proof_artifact_id_proof_artifacts_id_fk" FOREIGN KEY ("proof_artifact_id") REFERENCES "public"."proof_artifacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_heads" ADD CONSTRAINT "audit_heads_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_heads" ADD CONSTRAINT "audit_heads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_keys" ADD CONSTRAINT "borrower_keys_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrower_keys" ADD CONSTRAINT "borrower_keys_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowers" ADD CONSTRAINT "borrowers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covenant_terms" ADD CONSTRAINT "covenant_terms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "covenant_terms" ADD CONSTRAINT "covenant_terms_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_facility_id_facilities_id_fk" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_records" ADD CONSTRAINT "feedback_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_records" ADD CONSTRAINT "feedback_records_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_inputs" ADD CONSTRAINT "financial_inputs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_inputs" ADD CONSTRAINT "financial_inputs_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_artifacts" ADD CONSTRAINT "proof_artifacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proof_artifacts" ADD CONSTRAINT "proof_artifacts_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redaction_revisions" ADD CONSTRAINT "redaction_revisions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redaction_revisions" ADD CONSTRAINT "redaction_revisions_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD CONSTRAINT "reppo_evaluations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reppo_evaluations" ADD CONSTRAINT "reppo_evaluations_feedback_record_id_feedback_records_id_fk" FOREIGN KEY ("feedback_record_id") REFERENCES "public"."feedback_records"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_results" ADD CONSTRAINT "scenario_results_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_results" ADD CONSTRAINT "scenario_results_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_facility_run_number_uq" ON "analysis_runs" USING btree ("facility_id","run_number");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_document_uq" ON "analysis_runs" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_org_status_idx" ON "analysis_runs" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "analysis_runs_org_borrower_created_idx" ON "analysis_runs" USING btree ("organization_id","borrower_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_run_uq" ON "approvals" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "approvals_manager_created_idx" ON "approvals" USING btree ("manager_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_borrower_sequence_uq" ON "audit_events" USING btree ("borrower_id","sequence_no");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_events_borrower_hash_uq" ON "audit_events" USING btree ("borrower_id","event_hash");--> statement-breakpoint
CREATE INDEX "audit_events_borrower_created_idx" ON "audit_events" USING btree ("borrower_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_org_entity_idx" ON "audit_events" USING btree ("organization_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "borrowers_org_reference_uq" ON "borrowers" USING btree ("organization_id","normalized_reference_token");--> statement-breakpoint
CREATE INDEX "borrowers_org_alias_idx" ON "borrowers" USING btree ("organization_id","display_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "covenant_terms_run_uq" ON "covenant_terms" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX "covenant_terms_org_review_idx" ON "covenant_terms" USING btree ("organization_id","review_status");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_borrower_facility_checksum_uq" ON "documents" USING btree ("borrower_id","facility_id","sha256_ciphertext");--> statement-breakpoint
CREATE INDEX "documents_org_facility_status_idx" ON "documents" USING btree ("organization_id","facility_id","status");--> statement-breakpoint
CREATE INDEX "extraction_runs_run_created_idx" ON "extraction_runs" USING btree ("analysis_run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "facilities_borrower_reference_uq" ON "facilities" USING btree ("borrower_id","normalized_facility_reference_token");--> statement-breakpoint
CREATE INDEX "facilities_org_borrower_status_idx" ON "facilities" USING btree ("organization_id","borrower_id","status");--> statement-breakpoint
CREATE INDEX "feedback_records_run_idx" ON "feedback_records" USING btree ("analysis_run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_inputs_run_uq" ON "financial_inputs" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_org_actor_key_uq" ON "idempotency_records" USING btree ("organization_id","actor_id","key");--> statement-breakpoint
CREATE INDEX "idempotency_created_idx" ON "idempotency_records" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_idempotency_key_uq" ON "jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "jobs_queue_idx" ON "jobs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_uq" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_org_role_status_idx" ON "memberships" USING btree ("organization_id","role","status");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_uq" ON "organization_invitations" USING btree ("token_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_pending_email_uq" ON "organization_invitations" USING btree ("organization_id","normalized_email") WHERE "organization_invitations"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_uq" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_email_uq" ON "profiles" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "proof_artifacts_run_uq" ON "proof_artifacts" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redaction_revisions_run_revision_uq" ON "redaction_revisions" USING btree ("analysis_run_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "reppo_evaluations_provider_id_uq" ON "reppo_evaluations" USING btree ("provider_eval_id");--> statement-breakpoint
CREATE INDEX "reppo_evaluations_status_idx" ON "reppo_evaluations" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_results_run_scenario_uq" ON "scenario_results" USING btree ("analysis_run_id","scenario");