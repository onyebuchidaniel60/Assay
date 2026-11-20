CREATE TYPE "public"."external_evidence_validation" AS ENUM('VALID', 'INCOMPLETE', 'INVALID');--> statement-breakpoint
CREATE TYPE "public"."payment_authorization_decision" AS ENUM('APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."payment_data_status" AS ENUM('NOT_REQUESTED', 'PENDING', 'RETRIEVED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('PROPOSED', 'POLICY_REJECTED', 'AUTHORIZED', 'SUBMITTING', 'SUBMITTED', 'CONFIRMED', 'RECONCILIATION_REQUIRED', 'RECONCILED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_session_status" AS ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED');--> statement-breakpoint
CREATE TABLE "external_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"payment_intent_id" uuid,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"kind" text NOT NULL,
	"request_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"endpoint" text NOT NULL,
	"source_url" text NOT NULL,
	"publisher" text NOT NULL,
	"reporting_period" text NOT NULL,
	"linked_field" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"content_sha256" char(64) NOT NULL,
	"payload_ciphertext" text NOT NULL,
	"payload_nonce" text NOT NULL,
	"payload_tag" text NOT NULL,
	"limitations" jsonb NOT NULL,
	"validation_status" "external_evidence_validation" NOT NULL,
	"validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"decision" "payment_authorization_decision" NOT NULL,
	"policy_version" text NOT NULL,
	"policy_snapshot" jsonb NOT NULL,
	"authorized_amount_minor" numeric(24, 0),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"payment_session_id" uuid NOT NULL,
	"actor_id" text NOT NULL,
	"rail" text DEFAULT 'arc-circle-gateway' NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"service_id" text NOT NULL,
	"request_context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"endpoint" text NOT NULL,
	"method" text DEFAULT 'GET' NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" char(64) NOT NULL,
	"quote_sha256" char(64) NOT NULL,
	"network" text NOT NULL,
	"asset" text NOT NULL,
	"pay_to" text NOT NULL,
	"amount_minor" numeric(24, 0) NOT NULL,
	"authorized_amount_minor" numeric(24, 0),
	"settled_amount_minor" numeric(24, 0),
	"scheme" text DEFAULT 'exact' NOT NULL,
	"status" "payment_intent_status" DEFAULT 'PROPOSED' NOT NULL,
	"policy_decision" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rejection_code" text,
	"rejection_reason" text,
	"payer_address" text,
	"provider_transaction" text,
	"transaction_hash" text,
	"transfer_id" text,
	"nonce" text,
	"valid_before" timestamp with time zone,
	"quote" jsonb NOT NULL,
	"receipt" jsonb,
	"failure_code" text,
	"failure_message" text,
	"data_status" "payment_data_status" DEFAULT 'NOT_REQUESTED' NOT NULL,
	"data_failure_code" text,
	"authorized_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"settled_at" timestamp with time zone,
	"reconciled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_key" text NOT NULL,
	"network" text NOT NULL,
	"asset" text NOT NULL,
	"max_per_payment_minor" numeric(24, 0) NOT NULL,
	"max_total_minor" numeric(24, 0) NOT NULL,
	"spent_total_minor" numeric(24, 0) DEFAULT '0' NOT NULL,
	"reserved_total_minor" numeric(24, 0) DEFAULT '0' NOT NULL,
	"status" "payment_session_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_evidence" ADD CONSTRAINT "external_evidence_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_evidence" ADD CONSTRAINT "external_evidence_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_evidence" ADD CONSTRAINT "external_evidence_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_evidence" ADD CONSTRAINT "external_evidence_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_authorizations" ADD CONSTRAINT "payment_authorizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_authorizations" ADD CONSTRAINT "payment_authorizations_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_borrower_id_borrowers_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."borrowers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_payment_session_id_payment_sessions_id_fk" FOREIGN KEY ("payment_session_id") REFERENCES "public"."payment_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_sessions" ADD CONSTRAINT "payment_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "external_evidence_run_content_uq" ON "external_evidence" USING btree ("analysis_run_id","content_sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "external_evidence_payment_uq" ON "external_evidence" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "external_evidence_run_created_idx" ON "external_evidence" USING btree ("analysis_run_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_authorizations_intent_uq" ON "payment_authorizations" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "payment_authorizations_org_created_idx" ON "payment_authorizations" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_intents_org_idempotency_uq" ON "payment_intents" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_intents_nonce_uq" ON "payment_intents" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "payment_intents_run_created_idx" ON "payment_intents" USING btree ("analysis_run_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_intents_status_created_idx" ON "payment_intents" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payment_intents_session_status_idx" ON "payment_intents" USING btree ("payment_session_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_sessions_org_key_uq" ON "payment_sessions" USING btree ("organization_id","session_key");--> statement-breakpoint
CREATE INDEX "payment_sessions_org_status_idx" ON "payment_sessions" USING btree ("organization_id","status");