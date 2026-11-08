# DATA_MODEL.md — PostgreSQL schema blueprint

All tenant-owned entities carry `organization_id`; all API queries must scope by it. UUID primary keys unless stated. UTC `timestamptz`; contractual periods `date`; financial values `NUMERIC(24,8)` and JSON/API decimal strings. Drizzle migrations are source-controlled. Better Auth owns its user/session/account/verification tables.

## Relationships

```text
organizations 1--* memberships *--1 Better Auth users; organizations 1--* organization_invitations
organizations 1--* borrowers 1--* facilities
facilities 1--* documents 1--* document_versions
facilities 1--* covenant_definitions 1--* covenant_definition_versions
facilities 1--* financial_evidence
covenant_definition_versions 1--* assessments 1--* verification_runs
assessments 1--* exception_cases; scenarios reference covenant/facility
exception_cases 1--* case_notes; cases 1--* memo_drafts
approval_requests 1--1 approval_decisions (immutable)
organizations 1--* audit_events; organizations 1--1 audit_heads
```

## Table contracts

### organizations
`id uuid PK`, `name varchar(160)`, `slug varchar(80) UNIQUE`, `status enum(active,suspended)`, `default_currency char(3) DEFAULT USD`, `timezone varchar(64) DEFAULT UTC`, timestamps.

### memberships
`id uuid PK`, `organization_id FK`, `user_id FK Better Auth user.id`, `role enum(ORG_ADMIN,CREDIT_ANALYST,CREDIT_MANAGER,PORTFOLIO_MANAGER,AUDITOR)`, `status enum(INVITED,ACTIVE,SUSPENDED,REVOKED)`, `invited_by`, `version int`, timestamps. Unique `(organization_id,user_id)`, index `(organization_id,role,status)`.

### organization_invitations
`id`, `organization_id`, `normalized_email`, `target_role enum(CREDIT_ANALYST,CREDIT_MANAGER,PORTFOLIO_MANAGER,AUDITOR,ORG_ADMIN)`, `token_sha256 char(64) UNIQUE`, `status enum(PENDING,ACCEPTED,REVOKED,EXPIRED)`, `created_by`, `created_at`, `expires_at`, `accepted_at NULL`, `accepted_by NULL`, `revoked_at NULL`. Unique pending invitation on `(organization_id,normalized_email)` with partial index `WHERE status = PENDING`; before a new invitation, an expired pending row is transitioned to EXPIRED in the same transaction; token plaintext is returned once to the admin and never stored or logged. Default expiry 72 hours; one-time consumption enforced transactionally. No email provider is required; the admin copies the invite URL through their approved external channel. Use 32 random bytes encoded base64url; place the token in the URL fragment (not query/path) so it is not sent in the initial HTTP request; client immediately removes it from browser history and submits it in the acceptance POST body.

### borrowers
`id`, `organization_id`, `legal_name varchar(240)`, `reference_code varchar(80)`, `normalized_reference_code`, `classification enum(CORPORATE,OTHER)`, `status enum(ACTIVE,INACTIVE)`, `created_by`, `version`, timestamps. Unique `(organization_id,normalized_reference_code)`, index `(organization_id,legal_name)`.

### facilities
`id`, `organization_id`, `borrower_id FK`, `name`, `reference_code`, `facility_type`, `currency char(3)`, `committed_amount numeric(24,8)`, `outstanding_amount numeric(24,8) NULL`, `agreement_date date`, `maturity_date date NULL`, `contract_timezone DEFAULT UTC`, `status enum(DRAFT,ACTIVE,MATURED,CLOSED)`, `created_by`, `version`, timestamps. Unique `(organization_id,reference_code)`, indexes `(organization_id,borrower_id,status)`. Amount >=0; maturity >= agreement date. Borrower and facility tenant must match.

### documents
`id`, `organization_id`, `facility_id`, `category enum(CREDIT_AGREEMENT,AMENDMENT,FINANCIAL_STATEMENT,MANAGEMENT_ACCOUNTS,DEBT_SCHEDULE,OTHER_SUPPORT)`, `display_name` sanitized (never object key), `current_version_id`, `status enum(ACTIVE,ARCHIVED)`, `created_by`, timestamps. Index `(organization_id,facility_id,category)`.

### document_versions
`id`, `organization_id`, `document_id`, `version_no int`, `object_key varchar(512)`, `sha256 char(64)`, `size_bytes bigint`, `mime_type`, `page_count int`, `period_start/end date`, `as_of_date date`, `processing_status enum(RECEIVED,QUARANTINED,SCANNING,EXTRACTING_TEXT,AI_EXTRACTION,NEEDS_REVIEW,PROCESSED,UNSUPPORTED_SCANNED_PDF,REJECTED,FAILED)`, `parser_version`, `created_by`, `created_at`, `supersedes_version_id`, allow-listed `metadata jsonb`. Unique `(document_id,version_no)`; indexes org/status. Original binary immutable; no signed URL persisted.

### extraction_runs
`id`, `organization_id`, `document_version_id`, `extraction_type enum(COVENANT,FINANCIAL_METRIC)`, `provider`, `model_id`, `prompt_version`, `provider_request_id`, `status enum(STARTED,SUCCEEDED,NEEDS_REVIEW,FAILED)`, `output_json jsonb`, `output_sha256`, token usage, `error_code`, created/completed timestamps. Index by org/document/date. Extraction JSON is sensitive.

### covenant_definitions
`id`, `organization_id`, `facility_id`, `name`, `covenant_type enum(MAX_LEVERAGE)` P0, `active_version_id`, `status enum(DRAFT,ACTIVE,SUPERSEDED,REJECTED)`, `created_by`, `version`, timestamps. Index org/facility/status.

### covenant_definition_versions
`id`, `organization_id`, `covenant_definition_id`, `version_no`, `formula_ast jsonb`, `formula_sha256`, `threshold numeric(24,8)`, `operator enum(LTE,GTE,LT,GT)`, `ratio_unit DEFAULT x`, `period_policy jsonb`, `input_metric_keys text[]`, `source_refs jsonb`, `contract_clause_text` (sensitive), `effective_from/to date`, `status enum(DRAFT,PENDING_APPROVAL,APPROVED,ACTIVE,NEEDS_REVIEW,REJECTED,SUPERSEDED)`, `created_by`, `approved_by/at`, `supersedes_version_id`, timestamps. Unique `(covenant_definition_id,version_no)`; indexes org/status and effective date. Formula AST allowlisted.

### financial_evidence
`id`, `organization_id`, `facility_id`, `document_version_id NULL` (manual evidence requires reason), `canonical_metric_key`, `value numeric(24,8)`, `currency char(3)`, `unit`, `period_start/end`, `as_of_date`, `source_page`, `source_excerpt`, `extraction_run_id`, `status enum(SUGGESTED,CONFIRMED,REJECTED,SUPERSEDED,MANUAL_CONFIRMED)`, `reviewed_by/at`, `reason`, `supersedes_evidence_id`, `created_by`, `created_at`. Index org/facility/metric/period/status and document version. Corrections create new row.

### assessments
`id`, `organization_id`, `facility_id`, `covenant_definition_id`, `covenant_version_id`, `assessment_kind enum(ACTUAL,FORECAST)`, `test_date`, `period_start/end`, `formula_sha256`, immutable `input_snapshot jsonb`, `input_snapshot_sha256`, `calculated_value numeric(24,8) NULL`, threshold/operator snapshot, `verification_status enum(VERIFYING,VERIFIED,FAILED,INCOMPLETE,STALE)`, `compliance_status enum(COMPLIANT,BREACHED,INDETERMINATE,NOT_ASSESSED,AT_RISK,NO_PROJECTED_BREACH)`, `calculation_trace jsonb`, `supersedes_assessment_id`, `created_by`, `verified_at`, `version`, timestamps. Index org/facility/testdate and covenant/date.

### verification_runs
`id`, `organization_id`, `assessment_id`, `policy_version`, `checks jsonb`, `recomputed_value`, `recomputed_snapshot_sha256`, `result enum(VERIFIED,FAILED,INCOMPLETE,STALE)`, `failure_codes text[]`, `verified_by_service`, timestamp. Index org/assessment/date.

### scenarios
`id`, `organization_id`, `facility_id`, `covenant_definition_id`, `name`, `horizon_start/end`, `assumption_set jsonb`, `status enum(DRAFT,SAVED,ARCHIVED)`, `created_by`, `version`, timestamps. Forecast values and assumptions are explicit/versioned, not actual evidence.

### exception_cases
`id`, `organization_id`, `facility_id`, `covenant_definition_id`, `assessment_id`, `case_type enum(BREACH,POTENTIAL_BREACH,MISSING_EVIDENCE,CONFLICTING_EVIDENCE,CONTRACT_REVIEW)`, `severity enum(LOW,MEDIUM,HIGH,CRITICAL)`, `status enum(OPEN,ASSIGNED,INVESTIGATING,AWAITING_INFORMATION,AWAITING_APPROVAL,ESCALATED,RESOLUTION_IN_PROGRESS,RESOLVED,CLOSED)`, `title`, `description`, `owner_user_id`, `due_date`, `resolution_code`, `resolution_reason`, `created_by`, `version`, timestamps. Partial unique active-case rule on `(assessment_id,case_type)` while active; index org/status/owner/due.

### case_notes
`id`, `organization_id`, `case_id`, `author_id`, `body`, `visibility enum(INTERNAL)`, `created_at`. Append-only.

### memo_drafts
`id`, `organization_id`, `case_id`, `assessment_id`, `version_no`, `facts_snapshot jsonb`, `facts_sha256`, `body_markdown`, `body_sha256`, `status enum(DRAFT,PENDING_APPROVAL,APPROVED,REJECTED,INVALIDATED)`, `created_by`, `supersedes_memo_id`, timestamps. Unique `(case_id,version_no)`.

### approval_requests
`id`, `organization_id`, `action_type enum(ACTIVATE_COVENANT,APPROVE_MEMO,CLOSE_CASE)`, `entity_type`, `entity_id`, `requester_id`, immutable `action_payload jsonb`, `payload_sha256`, `dependency_versions jsonb`, `status enum(PENDING,APPROVED,REJECTED,CHANGES_REQUESTED,INVALIDATED,EXPIRED)`, optional `supersedes_request_id`, timestamps, `version`. Index org/status/date. The request row is a current-state projection; decision evidence is stored separately and append-only.

### approval_decisions
`id`, `organization_id`, `approval_request_id FK UNIQUE`, `decision enum(APPROVED,REJECTED,CHANGES_REQUESTED)`, `decided_by`, `reason`, `payload_sha256`, `dependency_versions jsonb`, `audit_event_id`, `decided_at`. Insert-only; unique request ensures a request receives one final decision. A revised action creates a new approval request linked by `supersedes_request_id` rather than rewriting the old decision.

### audit_events
`id`, `organization_id`, `sequence_no bigint`, `actor_type enum(USER,SYSTEM)`, `actor_user_id`, `event_type`, `entity_type`, `entity_id`, `payload jsonb`, `payload_sha256`, `previous_hash`, `event_hash`, `created_at`. Unique `(organization_id,sequence_no)` and `(organization_id,event_hash)`; index org/time and entity. No update/delete API; app DB role should not have DELETE permission.

### audit_heads
`organization_id PK/FK`, `last_sequence_no`, `last_hash`, `updated_at`. Lock row while appending.

### idempotency_keys
`id`, `organization_id`, `user_id`, `route_key`, `idempotency_key`, `request_hash`, `response_status`, `response_body jsonb`, `created_at`, `expires_at`. Unique `(organization_id,user_id,route_key,idempotency_key)`. Same key/different request hash = 409.

## Global constraints and relationships
- Verify tenant equality across borrower/facility/document/evidence/covenant/assessment/case/approval links inside transaction; use composite FKs where practical.
- Historical assessment snapshot stores exact formula/evidence IDs and values; do not use mutable “current” pointers to reconstruct old assessments.
- Audit append and material change commit in same DB transaction.
- Archive related entities; no destructive cascade across evidence/audit dependencies.
- All confidential data remains organization-scoped.

## Data classification
- Borrower/facility fields: confidential.
- Agreements, financial statements, clauses, metrics, memos: highly sensitive.
- Sessions/password hashes/tokens: auth secrets; never log.
- Audit: restricted evidence; manager/admin/auditor read, system append.
- Provider metadata/token counts: internal; no raw source text in ordinary logs.
- UI/marketing info only: public.
