# CovenantOps — Complete Implementation-Ready Blueprint

**Version:** 1.0  
**Date:** 8 November 2026  
**Product:** CovenantOps — Financial Covenant Operations Platform  
**Hackathon path:** Vultr Agent Rush — Powering the Future of Work  
**Status:** Product and technical decisions fixed for MVP; operator intake still required before implementation.

> **Operating contract:** The operator makes product, business, architecture, security and UX decisions here. The coding agent is the autonomous implementation engineer. It must not independently redesign the product, replace the stack, weaken controls or add features. It executes the approved plan continuously after one consolidated readiness intake.

## Decision summary

- **Working product name:** CovenantOps (name/domain/trademark availability not checked).
- **Customer:** Credit risk/portfolio monitoring teams at commercial lenders and private-credit firms.
- **Core promise:** Contract-specific, evidence-backed covenant assessment and operational exception resolution.
- **MVP:** One contract-configurable maximum Debt/EBITDA covenant; source-linked extraction; human-confirmed evidence; deterministic calculation; independent fail-closed verification; a separate forecast scenario; exception case; evidence-backed memo; maker-checker approval; stale-version invalidation; tamper-evident audit history.
- **Architecture:** Modular monolith plus one background worker and isolated PDF parser.
- **Deployment:** Docker Compose on Vultr Cloud Compute, private Vultr Object Storage and Vultr Serverless Inference.
- **No application code is included in this blueprint.**

---

# 1. Product definition

## 1.1 Product

**CovenantOps** is an evidence-driven financial covenant operations platform for commercial lenders and private credit firms. It organizes borrower facilities, interprets validated contractual covenant definitions, reconciles source-linked financial evidence, calculates actual covenant compliance deterministically, assesses separate forecast scenarios, and coordinates investigation, approval and resolution of exceptions.

## 1.2 Problem and current workarounds

Credit teams commonly assemble covenant information from signed credit agreements and amendments, borrower financial statements, debt schedules, management accounts, spreadsheets, email and shared drives. Manual extraction, contract-specific formula interpretation, reconciliation, periodic testing, escalation and approval create fragmented evidence and operational delay. Generic ratios do not reliably reproduce bespoke credit agreement definitions. A generated memo is not sufficient unless its facts, formula, evidence version and authorization are traceable.

## 1.3 Users and roles

- **Credit Analyst:** creates borrower/facility records, uploads documents, reviews extraction, confirms evidence, runs assessments, investigates cases and drafts memos.
- **Credit Manager:** validates/activates covenant definitions, approves defined critical actions, assigns/escalates cases and reviews portfolio exceptions. Maker-checker prevents self-approval.
- **Portfolio Manager:** views portfolio status and approved forecast scenarios; no authority to activate contractual definitions or approve critical actions unless separately granted.
- **Organization Administrator:** invites users, assigns roles and manages organization settings; no inherent credit approval authority.
- **Auditor / Read-only Reviewer:** inspects authorized documents, assessment snapshots, approvals and audit records; cannot mutate.

## 1.4 Value and differentiator

The product is not a PDF chatbot or a generic ratio dashboard. Its differentiator is a traceable chain from contractual clause → approved formula version → source financial evidence → deterministic computation → independent verification → case action → exact human approval → append-only audit history. Material data changes invalidate dependent assessments and pending approvals.

## 1.5 Primary use case

A credit analyst onboards a corporate borrower facility, uploads a credit agreement, reviews a proposed maximum Debt/EBITDA covenant, obtains manager activation, uploads a financial statement, confirms source-linked debt and LTM EBITDA, and obtains a verified 3.20x compliant result. A separate explicit forecast scenario produces 3.63x and is classified AT_RISK without altering actual status. New actual evidence then produces 3.70x, verified as BREACHED; the platform creates a case, drafts an evidence-backed memo, obtains manager approval and records all events. A changed evidence version invalidates affected approvals and forces reassessment.

## 1.6 Secondary use cases

Facility onboarding and amendment review; missing/conflicting evidence investigation; upcoming testing review; forecast stress scenarios; audit evidence reconstruction; portfolio exception triage.

## 1.7 Explicit non-goals

No loan origination, loan servicing/payment collection, general ledger, automatic credit underwriting, legal opinion, determination of enforceability/default remedies, automatic borrower notices, payment/waiver execution, unrestricted contract interpretation, OCR for scanned PDFs in MVP, banking/accounting-system integrations, or autonomous approval/send/delete actions.

Full definition and scope: [`PROJECT_SPEC.md`](PROJECT_SPEC.md).

# 2. MVP scope

## MUST HAVE (P0)

1. Invite/seed-controlled sign-in, organization workspace and server-side RBAC.
2. Borrower and facility records.
3. PDF upload (25 MiB, 200 pages max), private storage, SHA-256, versioning, malware scan and isolated text parsing.
4. AI-proposed source-linked extraction of one supported maximum Debt/EBITDA covenant and required metrics.
5. Human review and manager activation of the effective-dated contractual definition.
6. Evidence review/confirmation with page and quote provenance.
7. Restricted formula AST and Decimal.js deterministic calculation.
8. Independent verifier and explicit verification status; fail closed.
9. Separate actual statuses: COMPLIANT, BREACHED, INDETERMINATE, NOT_ASSESSED. Separate forecast scenario status: AT_RISK, NO_PROJECTED_BREACH, INDETERMINATE.
10. One exception/case workflow; memo draft from verified facts; manager approval; no email send.
11. Version-aware stale assessment/approval invalidation.
12. SHA-256 document hashes and hash-linked organization audit events.
13. Portfolio/facility/covenant/case/approval/audit views.
14. Deploy web app/control plane and worker on Vultr; private Vultr Object Storage; Vultr Serverless Inference for bounded extraction/memo work.
15. Tests, README/docs, protected synthetic-data preview and <=180-second demo video.

## SHOULD HAVE (P1)

Richer amendment comparison; cure-period tracking; additional evidence types; audit evidence PDF export; notifications inside app; more detailed portfolio filters; configurable review thresholds; improved forecast scenarios.

## NICE TO HAVE

Bulk facility import, advanced analytics/trend charts, automated reminders, additional read-only reports, scenario comparison UI.

## FUTURE

More covenant families; multi-currency conversions; OCR with human validation; loan/accounting integrations; institutional SSO; policy-configurable multi-level approvals; external signed audit checkpoints; legally-reviewed borrower communications; production retention/tenant policy tooling.

## OUT OF SCOPE

Payments, balances/escrow, payouts, bank APIs, live borrower portals, legal notices, credit decisioning, generic autonomous agents, arbitrary code execution and production financial data in demo/preview.

Scope details: [`PROJECT_SPEC.md`](PROJECT_SPEC.md). MVP formula and workflow boundary: [`BUSINESS_LOGIC.md`](BUSINESS_LOGIC.md).

# 3. User roles and permission model

All roles are assigned per organization membership. API authorization is server-side and scoped to the authenticated organization. The client cannot choose an organization ID to expand access.

| Permission | Analyst | Credit Manager | Portfolio Manager | Org Admin | Auditor |
|---|---|---|---|---|---|
| Read authorized borrower/facility | Yes | Yes | Yes | Yes | Yes |
| Create/update borrower/facility | Yes | Yes | No by default | Yes | No |
| Upload documents | Yes | Yes | No by default | Yes | No |
| Review/correct extraction | Yes | Yes | Read | No | Read |
| Propose covenant version | Yes | Yes | No | No | No |
| Activate covenant | No | Yes | No | No | No |
| Confirm financial evidence | Yes | Yes | No | No | No |
| Run actual assessment | Yes | Yes | Read | No | Read |
| Create/assign case | Create | Assign/escalate | Read | No | Read |
| Draft memo | Yes | Yes | Read | No | Read |
| Approve critical action | No | Yes, maker-checker | No by default | No | No |
| Invite/manage memberships | No | No | No | Yes | No |
| Verify/read audit chain | No | Yes | Read scoped | Yes | Yes |

Organization admin does not automatically equal credit manager. System service identities can process jobs but cannot impersonate a human approver. See `PROJECT_SPEC.md`, `SECURITY.md`.

# 4. Complete user flows

Detailed preconditions, inputs, state mutations, permissions, success/failure paths and edge cases are in [`PROJECT_SPEC.md`](PROJECT_SPEC.md), [`BUSINESS_LOGIC.md`](BUSINESS_LOGIC.md) and [`UI_UX.md`](UI_UX.md). Required MVP journeys:

1. **Invitation/authentication/workspace:** organization admin creates a one-time invitation for a named email and role → token hash stored, plaintext link returned once → recipient accepts with matching email/name/password → Better Auth creates account, token is consumed once and membership is created → user signs in → server loads membership/role → workspace. Public self-signup without a valid invite is denied.
2. **Borrower/facility setup:** analyst creates borrower → validates normalized reference uniqueness → creates facility with currency/date/amount constraints → database mutation and audit event commit atomically.
3. **Document ingestion:** user chooses authorized facility and PDF → server checks role, size, signature, type and idempotency → streams to private staging object while hashing → commits version/job/audit metadata → worker scans → isolated parser extracts page-indexed text → unsupported/malicious file is quarantined/rejected/reviewed.
4. **Covenant extraction/activation:** worker submits bounded page text to Vultr inference → schema, model ID, page and quote validation → candidate DRAFT → analyst edits/reviews → approval request → manager maker-checker approval → exact version becomes ACTIVE.
5. **Financial extraction/review:** extracted metric candidates include value, currency, unit, period and source → analyst confirms/rejects/corrects → correction creates successor evidence row → unresolved conflicts block assessment.
6. **Actual assessment:** user selects test date and confirmed evidence IDs → server validates tenant/facility/period/currency → freezes formula/evidence snapshot → Decimal.js computes → independent verifier reloads and recomputes → classification only from verified result → audit event.
7. **Forecast scenario:** user supplies explicit assumptions/horizon → deterministic calculation → scenario AT_RISK or NO_PROJECTED_BREACH → actual status unchanged.
8. **Breach/case/memo:** verified BREACHED assessment → idempotent case create/assign → agent drafts memo only from facts packet → statement checks → manager reviews exact memo version and approves/rejects → no external send.
9. **Stale evidence:** new evidence/formula/document version → affected assessments STALE and pending approvals INVALIDATED atomically or via blocking invalidation state → reassess → new approval.
10. **Audit review:** authorized manager/auditor requests scoped events → verifies sequence/hash chain → shows valid/invalid/unavailable and first failed sequence; no destructive repair.

# 5. Functional requirements and acceptance

P0 requirements are grouped into the following implementable units:

| ID | Requirement | Core acceptance |
|---|---|---|
| FR-01 | Auth/workspace/RBAC | User only sees memberships and records authorized for that organization; API-level denial passes IDOR tests. |
| FR-02 | Borrower/facility | Valid create/read/update; duplicate normalized references return 409; tenant relation enforced. |
| FR-03 | Document processing | 25 MiB/200 page PDF limit; scan before parse; original immutable/hash recorded; parser returns page-indexed text; unsupported scanned/encrypted docs require review. |
| FR-04 | Contract extraction | AI result schema valid; every claim has verified quote/page; no source/quote fabricated; candidate remains inactive. |
| FR-05 | Covenant configuration | Allowlisted formula AST only; threshold/operator/date/source references versioned; manager approval required for activation. |
| FR-06 | Financial evidence | Metric, decimal value, unit/currency, period, document version and source retained; missing/conflicting inputs block final result. |
| FR-07 | Reconciliation | All required metrics confirmed and compatible; conflict/missing reason visible; cannot silently mix periods/currencies. |
| FR-08 | Calculation | Reproducible Decimal.js result with input/formula trace; same snapshot yields same result; exact 3.50x is compliant for <=3.50x. |
| FR-09 | Classification | Actual and forecast dimensions separate; only verified result can assert COMPLIANT/BREACHED; unknowns INDETERMINATE. |
| FR-10 | Scenario | Forecast inputs/assumptions versioned; projected threshold issue shows AT_RISK; actual remains unchanged. |
| FR-11 | Verification | Independent recompute and all required checks; failure/incomplete/stale blocks critical actions. |
| FR-12 | Case | One active case per assessment/type; allowlisted transitions; close requires coded reason, actor and timestamp. |
| FR-13 | Memo/approval | Memo facts trace to verified snapshot; unsupported claims rejected; manager decision bound to exact payload/dependencies; no send. |
| FR-14 | Versioning | Evidence/formula change marks dependent assessments stale and pending approvals invalid; old history retained. |
| FR-15 | Audit | Every material mutation atomically appends event/head; integrity check detects modified/reordered/deleted event. |
| FR-16 | Dashboard/detail UI | Counts distinguish actual vs forecast; user can navigate to facility/covenant/evidence/case/approval and inspect states. |
| FR-17 | Deployment/docs/demo | Public/protected Vultr preview with synthetic data, test evidence, setup docs and reviewed <=180-second walkthrough. |

Every requirement's actor, precondition, input/output, validation, errors and acceptance detail is in `PROJECT_SPEC.md`; route contracts in `API.md`; negative tests in `EDGE_CASE_MATRIX.md` and `docs/TESTING.md`.

# 6. Business logic and state machines

## 6.1 Authority hierarchy

Applicable signed source agreement/effective amendment → human-approved covenant definition version → human-confirmed financial evidence versions → deterministic calculation → independent verification → human decision. AI output cannot override the chain.

## 6.2 Debt/EBITDA formula contract

MVP supports only maximum leverage with a contract-specific, restricted JSON AST. Example base AST:

```json
{
  "schema_version": 1,
  "kind": "divide",
  "numerator": {"kind": "metric", "key": "gross_debt"},
  "denominator": {"kind": "metric", "key": "ltm_ebitda"}
}
```

Allowed nodes: `metric`, `sum`, `subtract`, `min`, `max`, `divide`, cited numeric `constant`. Maximum depth 8 and 50 nodes; allow-listed keys only; no `eval`, `Function`, loops, arbitrary functions, property access, SQL or model-generated code. No default cash netting/addbacks/exclusions. Only contract-cited, approved adjustments are eligible. Same currency; no FX in MVP; debt at test date; EBITDA LTM ending at test date unless approved contractual definition states otherwise. Zero/negative EBITDA, missing/ambiguous metric, period mismatch or unsupported AST → INDETERMINATE/NEEDS_REVIEW.

Use PostgreSQL `NUMERIC(24,8)` and Decimal.js. Financial API values are strings. Compare unrounded ratio to threshold; UI may display two decimals. For <=3.50x, exactly 3.50x is compliant; 3.50000001x is breached. No invented tolerance.

## 6.3 Status dimensions

- Actual compliance: `COMPLIANT`, `BREACHED`, `INDETERMINATE`, `NOT_ASSESSED`.
- Verification: `VERIFIED`, `FAILED`, `INCOMPLETE`, `STALE`.
- Forecast scenario: `AT_RISK`, `NO_PROJECTED_BREACH`, `INDETERMINATE`.
- A scenario can never rewrite actual status.

## 6.4 State machines

- Document: RECEIVED → QUARANTINED → SCANNING → EXTRACTING_TEXT → AI_EXTRACTION → NEEDS_REVIEW / PROCESSED; alternatives REJECTED, FAILED, UNSUPPORTED_SCANNED_PDF, STORAGE_ERROR.
- Evidence: SUGGESTED → CONFIRMED / REJECTED → SUPERSEDED. Confirmed evidence is immutable.
- Covenant version: DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → SUPERSEDED; alternatives REJECTED/NEEDS_REVIEW.
- Assessment: CREATED → CALCULATED → VERIFYING → VERIFIED; alternatives INCOMPLETE/FAILED/STALE/SUPERSEDED.
- Case: OPEN → ASSIGNED → INVESTIGATING → AWAITING_INFORMATION/AWAITING_APPROVAL → ESCALATED → RESOLUTION_IN_PROGRESS → RESOLVED → CLOSED. Only valid transitions allowed.
- Approval: PENDING → APPROVED/REJECTED/CHANGES_REQUESTED/INVALIDATED/EXPIRED.

## 6.5 Approval, idempotency and audit

Maker-checker; requester cannot approve same critical action. Request hashes immutable action payload and dependency versions. Any material change invalidates pending approval. Transactions/compare-and-set prevent double decisions; duplicate idempotency key + same request returns prior result; same key + different request returns 409. Active case unique per assessment/type. Per-organization audit chain uses monotonically increasing sequence, previous hash and SHA-256 canonical payload. This is tamper-evident, not blockchain and not proof of trusted timestamp/legal non-repudiation.

Full rules and examples: `BUSINESS_LOGIC.md`; transaction model: `DATABASE_OPERATIONS.md`.

# 7. Data model

PostgreSQL 18+ is authoritative. UUID primary keys; tenant `organization_id` on all tenant-owned rows; UTC `timestamptz`, contractual test periods as `date`; monetary values `NUMERIC(24,8)`; JSON/API financial values strings.

Core entities:

- Organization, membership, one-time organization invitation, Better Auth user/session/account tables.
- Borrower, facility.
- Document, immutable document version, extraction run.
- Covenant definition and effective-dated covenant definition version.
- Financial evidence (one immutable record per confirmed version).
- Assessment (ACTUAL or FORECAST) with immutable formula/evidence snapshot and SHA-256.
- Verification run.
- Scenario/assumptions.
- Exception case, append-only case note, memo draft.
- Approval request with immutable action payload and dependency-version snapshot.
- Audit event, per-organization audit head, idempotency key.

Key constraints: unique tenant/reference code; tenant equality across linked rows; immutable document objects; version uniqueness; partial unique active case by assessment/type; assessment uniqueness by covenant-version/test-date/evidence-snapshot/kind; approval state/version compare-and-set; audit sequence and hash uniqueness; scoped indexes for organization/facility/status/date. Avoid cascade deletion of financial evidence/audit dependencies. No hard-delete API for source docs, assessments, approvals or audit events.

Complete fields, nullability, status enums, indexes and relationships: `DATA_MODEL.md`.

# 8. System architecture

**Modular monolith + one background worker + isolated parser.** Browser calls Next.js server-side APIs only. Business rules live in shared domain packages; route handlers stay thin.

```text
Browser
  │ HTTPS
  ▼
Vultr Firewall → Caddy (TLS/reverse proxy)
  │
  ▼
Next.js web (UI + REST + auth)
  ├── PostgreSQL 18 (private; business data + pg-boss queue)
  ├── private Vultr Object Storage (documents/reports)
  └── pg-boss jobs → worker
                      ├── ClamAV (private scan)
                      ├── isolated PDF parser (no public ingress/no internet egress)
                      ├── Vultr Object Storage (outbound HTTPS)
                      └── Vultr Serverless Inference (outbound HTTPS)
```

- App VM starts at proposed 4 vCPU/8 GB/160 GB NVMe, subject to live quote, service capacity, load testing, credits and operator cost authorization.
- Only Caddy ports 80/443 public; SSH 22 restricted to approved operator CIDR. Never publish database, parser or scanner.
- Separate Docker networks, non-root containers, dropped capabilities, resource limits, no privileged mode.
- Upload API streams/hashes to private staging; transaction inserts metadata/version/job/audit; compensating cleanup/orphan reconciliation for cross-store failure.
- Worker scans before isolated parse; page text is sent only for bounded, relevant extraction. AI outputs validated and source quotes verified against parsed page text.
- Assessment snapshot freezes exact versions; deterministic engine and independent verifier recompute; critical state and audit commit atomically.
- No Vercel/Supabase/Redis/Kubernetes/microservices/vector DB/payments/email/bank integrations in MVP.

See `ARCHITECTURE.md` and `DATABASE_OPERATIONS.md`.

# 9. Fixed technology stack

| Concern | Decision | Responsibility |
|---|---|---|
| Runtime | Node.js 24 LTS | Server/worker runtime |
| Monorepo/package manager | pnpm workspaces | Shared packages, one lockfile |
| Web + REST | Next.js 16 App Router, React 19, TypeScript | UI and route handlers |
| Styling/components | Tailwind CSS 4, shadcn/ui, Radix, Lucide | Accessible UI system |
| Forms/validation | React Hook Form + Zod | Shared form and API schemas |
| Tables/charts | TanStack Table; Recharts where useful | Operational tables and restrained trends |
| Auth | Better Auth; email/password invite/seed controlled | Session auth; no public signup |
| Database | PostgreSQL 18+ | ACID, JSONB snapshots, NUMERIC, row locks |
| ORM/migrations | Drizzle ORM/drizzle-kit | Typed SQL and versioned migrations |
| Queue | pg-boss | Durable Postgres-backed worker queue |
| Financial math | decimal.js | Exact decimal math |
| PDF text | pdfjs-dist in isolated parser container | Page-indexed text only; no OCR MVP |
| Malware | ClamAV | Scan before parse; fail closed |
| Storage | Vultr Object Storage (S3-compatible) | Private original documents/exports |
| AI inference | Vultr Serverless Inference, OpenAI-compatible API | Proposed extraction and memo prose only |
| Logging | Pino | Structured redacted logs |
| TLS/reverse proxy | Caddy | HTTPS, routing |
| Deploy | Docker Compose on Vultr Cloud Compute; Ubuntu 24.04 LTS | Application hosting/orchestration |
| Tests | Vitest, API integration, Playwright | Unit/integration/E2E |
| CI | GitHub Actions | Lint/typecheck/test/build; deploy only with authority |

Pin current patched versions and container image digests during implementation; no floating `latest` tags. Alternatives rejected: Vercel frontend + thin Vultr backend (does not make Vultr central); Supabase DB; Redis/BullMQ; Kubernetes; separate microservices; generic agent orchestration; LLM calculations. Stack rationale and live-service checks are in `ARCHITECTURE.md`.

# 10. API specification

Base path `/api/v1`; Better Auth under `/api/auth/*`. All business routes require authenticated session and active organization membership; organization derives from session, never client field. Financial amounts use decimal strings, dates ISO `YYYY-MM-DD`, currency uppercase 3-letter. Mutations validate with Zod and enforce CSRF/origin checks. Standard response/error envelope defined in `API.md`.

Endpoint groups:

- Health: `GET /api/health/live`, `GET /api/health/ready`.
- Workspace: `GET /me`, `/workspace`; member list/invitation/role updates.
- Dashboard: `GET /dashboard/summary`.
- Borrowers/facilities: list/create/read/patch; nested facility create/list.
- Documents: multipart upload; list/detail/version/download; job status.
- Extractions/covenants: extraction runs; covenant draft, detail, versions, patch, submit approval.
- Approvals: list/detail and `POST /approvals/:id/decision` with maker-checker and snapshot checks.
- Evidence: list, manual evidence, confirm/reject, supersede.
- Assessments: create/read/list; scenarios create/read.
- Cases/memos: create/read/patch state, append note, create memo draft, submit memo approval, case timeline.
- Audit/export: list events, verify chain, generate assessment PDF export, download authorized export.

Rate-limit login, uploads, inference-triggering actions, assessments and memo drafts. Use `Idempotency-Key` for retryable critical POST operations. Use `If-Match`/`expectedVersion` for mutable versioned records. Do not expose storage object keys or signed URLs in logs. Exact request/response and permission matrix: `API.md`.

# 11. Database operations and side effects

- DB is source of truth; object storage is immutable blob store; queue is durable orchestration.
- A business mutation and audit append/head update share a DB transaction. Audit append failure rolls back critical business mutation.
- Cross-system upload uses staged object + DB transaction + compensation/orphan reconciliation; no claim of distributed ACID transaction.
- Assessments freeze evidence and formula snapshots before compute. The verifier uses a separate reference evaluator (not the primary calculation function), independently reloads/recomputes and compare-and-set finalizes only if dependencies remain current.
- Approval decision uses row lock/compare-and-set; concurrent second decision gets 409.
- Evidence supersession inserts successor row, marks dependencies stale and pending approvals invalid within a transaction or a blocking invalidation process.
- Jobs include only tenant/entity/version IDs and idempotency token; no raw file bytes/secrets/commands. Retry transient provider/network errors max 3 with backoff+jitter; deterministic failures go to review.
- Use unique constraints, partial unique indexes and idempotency keys; handle concurrent case, assessment, upload, approval and audit append operations explicitly.
- Backups are encrypted and private; recovery is not claimed until restore is tested.

Detailed SQL-level operation patterns: `DATABASE_OPERATIONS.md`.

# 12. Authentication and authorization

Better Auth email/password with invitation-gated account creation and seeded demo users; no public self-signup without a valid one-time token. Admin creates a 256-bit invite token for a normalized email/role, stores only SHA-256 token hash with 72-hour expiry, and manually shares the link (no email provider). Acceptance checks token/email/expiry/one-time use and creates the user through Better Auth. Secure HTTP-only, SameSite and Secure cookies in production; CSRF/origin enforcement. Membership table maps user to organization and role. Permissions checked in every server API/domain service and repositories require tenant context. No JWT in localStorage. Avoid resource-existence leaks across tenants. Admin membership management does not implicitly confer credit approval. Analysts cannot approve their own critical action. Auditor is read-only. Service workers cannot impersonate users or approve.

## Access safeguards

- Every query constrained by organization ID obtained from session membership.
- Tenant-equality checked across borrower/facility/document/evidence/assessment/case/approval relations.
- Explicit resource/action permission matrix.
- Compare-and-set/row locks for approval and version changes.
- Rate limits and generic auth errors to resist enumeration.
- UI guards are supplementary; server is authoritative.

# 13. Security architecture

Threats and required controls:

- IDOR/cross-tenant access → tenant scoping, composite relation checks, API security tests.
- Session theft/CSRF → secure cookies, origin/CSRF checks, session rotation/expiry.
- Privilege escalation/self-approval → separate org-admin and credit-manager permissions, maker-checker, server-side actor identity.
- Injection/XSS → parameterized queries, React escaping, safe Markdown sanitizer, CSP, input validation.
- SSRF → no arbitrary URL fetch; fixed provider/storage endpoints and strict egress.
- Malicious PDF/parser abuse → MIME+signature/size/page limits, ClamAV fail-closed, isolated parser, no egress, CPU/memory/PID limits.
- Prompt injection/hallucination → document text untrusted, no model tools, structured schemas, quote/page validation, independent deterministic checks using a separately implemented reference evaluator.
- Model fallback → verify response model identifier equals configured model; mismatch rejected.
- Financial tampering → immutable evidence snapshots, exact Decimal calculations, independent verification, source trace.
- Replay/race → idempotency, unique constraints, row locks, version checks.
- Secret exposure → runtime secrets only, Pino redaction, client-bundle scan, secret scan in CI.
- Storage exposure → private bucket, random object keys, short-lived presigned GET only after auth, no public ACL/CDN.
- Audit tamper → hash chain, restricted DB role, append-only app behavior, integrity verification. Hash chain alone is not trusted timestamp or non-repudiation.
- Host/containers → firewall, patched pinned images, non-root, dropped capabilities, resource/network isolation.

No real borrower data in demo/preview. Production use with sensitive customer data requires institution-specific security, legal, vendor and data-processing approval beyond the hackathon MVP. Full threat matrix: `SECURITY.md`; edge scenarios: `EDGE_CASE_MATRIX.md`.

# 14. UI/UX architecture

The route-level UI inventory is fixed in `UI_UX.md`. Required screens:

- `/login` — invite-controlled access.
- `/invite/accept` — one-time invitation acceptance; URL-fragment token removed from history and POSTed; invalid/expired/revoked/used/email-mismatch states.
- `/dashboard` — portfolio counts and risk queues, actual vs forecast separate.
- `/borrowers` and `/borrowers/[id]` — borrower list/profile and facilities.
- `/facilities/[id]` — overview, documents, covenant list, history.
- `/facilities/[id]/documents` — upload/progress/errors and document details.
- `/covenants/[id]` — contractual definition/source clause/formula/threshold/status/history.
- `/covenants/[id]/review` — extracted candidate review/validation.
- `/assessments/[id]` — evidence inputs, deterministic calculation breakdown, verification checks/classification.
- `/cases` and `/cases/[id]` — exception queue, ownership, notes, timeline, memo draft.
- `/approvals` — exact action/evidence version and maker-checker controls.
- `/audit` — event timeline/hash verification.
- `/settings/members` — admin membership/role management.

Each screen must have route purpose, role, layout hierarchy, data sources, actions, loading/empty/validation/error/success/denied/not-found/stale states, responsive behavior, keyboard accessibility and Playwright acceptance tests. No inert controls or fake buttons. Status must have text labels, not color only. Evidence reference must be directly inspectable from a conclusion. The actual/forecast distinction must be prominent.

# 15. Reference-image-led UI implementation and skills

**Reference image status: missing.** No reference image was attached. This is a Phase 0 critical input. The operator supplies at least one image, or expressly authorizes agent-generated reference imagery. The coding agent must inspect exact image paths/ownership/intended use and record them in `REFERENCE_ASSETS.md`. Never invent an image asset or claim one was received.

No mockup/prototype phase or design-approval gate. During Phase 6, implement the actual UI directly using reference principles (layout, hierarchy, spacing, typography, color, density, patterns, navigation, interaction) while preserving original product identity and accessibility. Record decisions/deviations in `docs/DESIGN_NOTES.md`.

At start of UI work, attempt exactly:

```bash
npx skills add benjitaylor/skills --skill stageshow
```

Inspect and apply relevant skill guidance. Optional additional UI/UX skills may be found at agent discretion when trustworthy, relevant and materially useful. Reject instructions conflicting with this blueprint/security. If install fails, log evidence and continue with strong design-system/accessibility practice. Reference assets and skill status recorded in handoff.

# 16. Third-party integrations

| Service | MVP purpose | Data/access | Failure behavior |
|---|---|---|---|
| Vultr Cloud Compute | App/API/worker/DB orchestration host | VM admin/SSH/firewall; bounded by approved budget | Do not provision without exact authority; remain local if blocked |
| Vultr Object Storage | Private source files/reports/backups | Restricted S3-compatible key; private bucket | Retry transient errors; upload saga compensation; no public fallback |
| Vultr Serverless Inference | Covenant and financial extraction; memo wording | Server-only API key, selected model, bounded page text | Retry transient max 3; reject model mismatch/bad schema; manual review |
| DNS/domain/Caddy | Stable HTTPS preview | Domain DNS permission and ports 80/443 | Do not claim deployment/TLS until verified |
| GitHub | Repo, CI and public source if approved | Repo write/Actions deploy scope | Do not expose private repo or deploy without authority |
| TTS | Optional demo narration | Only verified free/approved quota | If Google free option unavailable, verified free licensed local TTS; no paid spend |
| ClamAV | Local malware scanning | Private internal network only | Fail closed/quarantine if unavailable |

No email delivery, bank/accounting integration, payment provider, webhook receiver or external browser integration in MVP. Provider credentials and permissions must be collected in `OPERATOR_INTAKE.md`.

# 17. AI architecture

AI is a bounded proposal generator, not an autonomous financial agent. Logical tasks: covenant clause extraction, financial metric extraction and memo prose drafting. It receives only minimal relevant page text and organization-scoped context. It has no privileged tools and cannot activate covenant definitions, calculate ratios authoritatively, approve actions, send messages, mutate financial records or edit audit history.

- Server-side Vultr Serverless Inference with OpenAI-compatible API.
- Proposed model: `deepseek-v4.1-flash-1017`; must be checked against live catalog/key/quotas and output quality during intake. Do not assume model availability.
- Require model ID returned in response to match configured model; mismatch is failed dependency check.
- Structured schema response if available; Zod validation always required.
- Every extracted quote/page must be validated against parsed page text; every value must carry currency/unit/period.
- Low confidence, unsupported clause, ambiguity, missing input or malformed output → NEEDS_REVIEW/INDETERMINATE.
- Prompt version, model ID, provider request ID, output hash and token usage stored; raw prompt/document body not logged.
- Bounded chunking and token/timeout/concurrency caps; no infinite agent loops, no vector DB, no arbitrary fetch tools.
- Memo generation gets a deterministic verified fact packet; post-validation rejects unsupported facts/numbers/legal claims.
- Retry transient 429/5xx/network only, max 3; deterministic schema/quote/model failure is not blindly retried.

# 18. Payment architecture

**Not applicable.** CovenantOps does not collect, hold, transfer, escrow or pay money. Loan principal and debt amounts are informational contract/financial data only. No payment provider, payment webhook, balance ledger, payout, refund or wallet integration. The coding agent must not add payments.

# 19. Admin and operations

MVP admin surface is minimal: invite/create users, assign/revoke organization memberships, activate/suspend membership, inspect system health and sanitized job status. Organization admin cannot approve covenant definitions/memos solely by being admin. Credit manager handles credit approvals. Auditor gets scoped read-only records and audit verification.

Operational controls: private document storage, ClamAV status, processing job state, retry/dead-letter visibility, safe health endpoints, Pino redaction, VM resource health, database backup/restore verification and audit chain health. No general-purpose admin override, silent record deletion, impersonation or edit-audit control.

# 20. Error and edge-case matrix

`EDGE_CASE_MATRIX.md` is authoritative. Mandatory categories include invalid/missing/duplicate input; unauthorized and cross-tenant request; not found; oversized/wrong/malicious/encrypted/scanned PDF; scanner/parser/storage/DB outage; duplicate job; malformed AI output/fake quote/wrong model; prompt injection; unsupported covenant AST/ambiguous adjustment; missing/conflicting/incompatible financial metric; zero/negative EBITDA; threshold boundary; forecast/actual confusion; verifier mismatch; stale version; requester self-approval; concurrent approval; duplicate case; memo unsupported claim; audit tamper; expired presigned URL; UI network/permission/validation error; and production action without authority.

All errors use the safe API envelope. Critical state mutations are atomic and idempotent. Never work around failure by disabling verification, access control, antivirus, TLS or audit.

# 21. Test strategy

- **Unit:** Decimal calculations and exact boundaries; formula AST validator; period/currency/units; classification; state transitions; version invalidation; audit canonicalization/hash; maker-checker; idempotency key hashing.
- **Integration:** Better Auth and RBAC; tenant scoping; file staging/DB compensation; ClamAV fail-closed; PDF parser; Vultr inference schema/model/quote validation; deterministic calculation/verifier; audit transaction; storage presigned download; job retries and replay.
- **E2E:** complete borrower→facility→document→covenant review→activation→evidence→3.20x compliant→3.63x forecast AT_RISK (actual unchanged)→3.70x breach→case→memo→approval→evidence superseded→stale invalidation→reassessment→audit verify.
- **Security:** IDOR, role escalation, CSRF, XSS, SQLi, SSRF, prompt injection, malicious PDF, model fallback, rate limits, replay, concurrent actions, secrets, audit tamper, container/network review.
- **Acceptance:** requirements AC-01 through AC-14 in `PROJECT_SPEC.md`; detailed plans in `docs/TESTING.md`.

A test is passed only with command/exit-code/evidence in `docs/BUILD_LOG.md`. The final visual phase cannot start until critical unit/integration/E2E checks pass and no unresolved critical/high severity issue remains.

# 22. Repository structure

```text
covenantops/
├── README.md
├── PROJECT_SPEC.md
├── IMPLEMENTATION_BLUEPRINT.md
├── ARCHITECTURE.md
├── BUSINESS_LOGIC.md
├── DATA_MODEL.md
├── DATABASE_OPERATIONS.md
├── API.md
├── SECURITY.md
├── UI_UX.md
├── EDGE_CASE_MATRIX.md
├── IMPLEMENTATION_PLAN.md
├── AGENTS.md
├── AI_HANDOFF.md
├── OPERATOR_INTAKE.md
├── REFERENCE_ASSETS.md
├── DEMO_VIDEO_PLAN.md
├── .env.example
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.yml
├── apps/
│   ├── web/                 # Next.js UI + REST route handlers
│   ├── worker/              # pg-boss consumers
│   └── pdf-parser/          # isolated no-egress parser service
├── packages/
│   ├── domain/              # calculations, states, verification
│   ├── db/                  # Drizzle schema/migrations/repos
│   ├── contracts/           # shared Zod contracts
│   ├── ai/                  # Vultr inference, prompts, schemas
│   ├── storage/              # Vultr S3 adapter/local dev adapter
│   └── config/              # validated env/config
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── security/
├── docs/
│   ├── SETUP.md
│   ├── CONFIGURATION.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   ├── TROUBLESHOOTING.md
│   ├── DESIGN_NOTES.md
│   ├── BUILD_LOG.md
│   └── OPERATOR_GUIDE.md
└── artifacts/
    └── demo/
```

Adapt only for existing repository conventions that do not alter architecture or security. `apps/pdf-parser` must be isolated, no public ingress or internet egress. `OPERATOR_GUIDE.md` is created if required for demo/operator operations.

# 23. Environment configuration

Exact variable purpose, requiredness, client/server exposure and validation are in `docs/CONFIGURATION.md`. Critical variables include:

```dotenv
NODE_ENV=
APP_BASE_URL=
DATABASE_URL=
DATABASE_DIRECT_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
VULTR_INFERENCE_API_KEY=
VULTR_INFERENCE_BASE_URL=https://api.vultrinference.com/v1
VULTR_INFERENCE_MODEL=deepseek-v4.1-flash-1017
VULTR_INFERENCE_TIMEOUT_MS=
VULTR_INFERENCE_MAX_TOKENS=
VULTR_INFERENCE_MAX_CONCURRENT=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
STORAGE_PROVIDER=vultr
MAX_UPLOAD_BYTES=26214400
MAX_PDF_PAGES=200
PDF_PARSER_URL=
CLAMAV_HOST=
PG_BOSS_SCHEMA=
LOG_LEVEL=info
AUDIT_HASH_VERSION=sha256-v1
DEMO_MODE=true
PREVIEW_ALLOWED_ORIGIN=
GOOGLE_TTS_API_KEY=
BACKUP_BUCKET_PREFIX=
```

Values above are names/proposed defaults only; actual endpoints/keys/region, quotas and current model ID must be validated during intake. No secrets in repository or `NEXT_PUBLIC_*` variables. `.env.example` holds placeholders, not credentials. Separate local/preview/production credentials and data stores.

# 24. Autonomous implementation plan

The exact mandatory sequence is:

**Complete operator intake → early skeletal frontend deployment → core functionality → end-to-end verification → reference-image-led UI implementation → frontend/docs/footer completeness → demo video → final regression and authorized release.**

Detailed task lists, evidence and commit checkpoints are in `IMPLEMENTATION_PLAN.md`.

- **Phase 0 — Intake/readiness:** inspect repo without changes; gather all missing inputs once; inspect image; validate Vultr accounts, service keys/catalog/quota, cost budget, domain/DNS/TLS, network, permissions and preview authority. No coding while critical input missing.
- **Phase 1 — Repo foundation + early shell/preview:** preserve repo work, create route-complete labeled skeleton, health routes, workspace/config, secure Vultr deployment and protected synthetic preview; record URL and commit.
- **Phase 2 — Backend/data/auth:** migrations, Better Auth, membership/RBAC, tenant repos, storage adapter, worker/queue, audit head/events, observability.
- **Phase 3 — Domain/API:** borrower/facility, documents, scan/parser, extraction, covenant, financial evidence, Decimal calculation, verification, forecast, case, memo, approval, invalidation, dashboard/audit.
- **Phase 4 — Functional UI integration:** wire real API behavior and all states using temporary consistent design system.
- **Phase 5 — Functionality gate:** unit/integration/security/E2E complete, fix and rerun until pass; no unresolved critical/high issue; preview commit/evidence recorded.
- **Phase 6 — Reference UI + stageShow:** attempt required skill, inspect supplied image, implement actual UI directly, record notes; no mockup phase or approval stop.
- **Phase 7 — Frontend/docs completion:** responsive/accessibility, metadata/icons, all real links and footer, no inert controls, docs and verified Documentation/GitHub URLs only.
- **Phase 8 — Demo video:** Playwright real behavior, <=180 sec; check Google AI TTS current free availability/terms/quota/credentials; licensed free fallback if unavailable; synchronize, caption, redact, render and review.
- **Phase 9 — Final regression/security/release:** full tests, secret/dependency/image scans, network/TLS/storage/backup restore checks; production only with explicit exact authority; otherwise staging and release steps.

Internal checkpoint loop at every phase: **IMPLEMENT → TEST → INSPECT → FIX → COMMIT → UPDATE `AI_HANDOFF.md` + `docs/BUILD_LOG.md` → CONTINUE.** No routine user approval stops. Stop only for a genuine blocker or action beyond authority; continue unaffected work.

# 25. `PROJECT_SPEC.md`

Authoritative detailed product definition, actors/roles, scope, all core user workflows, functional requirements, field-level acceptance criteria, business success measures and product boundaries. It is the source of truth for intended product behavior. The coding agent must not contradict it for convenience.

# 26. `ARCHITECTURE.md`

Authoritative fixed topology, component responsibilities, network boundaries, service selection, deployment model, inference integration, job design and explicitly rejected alternatives. Implementation details may be chosen only within the fixed architecture and marked safe boundaries.

# 27. `IMPLEMENTATION_PLAN.md`

Authoritative phase-by-phase execution tasks, ordering, tests, expected checkpoints and continuation rules. This sequence implements the workflow; it does not create approval gates.

# 28. `AGENTS.md`

Persistent implementation contract: read source-of-truth docs, complete one consolidated intake, no design/architecture drift, execute phases continuously, test/commit/update handoff, deploy shell early, do not start visual refinement before functional gate, use reference images directly and attempt stageShow, complete docs/video, and respect exact cost/security/production authorization boundaries.

# 29. `AI_HANDOFF.md`

Current status document. At blueprint creation: no application code, repo not inspected, no preview URL/commit, tests not run, reference image missing, stageShow not installed, production not authorized, Phase 0 pending. Exact next task is inspect actual repo without changes and complete intake. Update after every checkpoint with URL/commit/test evidence, reference/skill status, docs/demo progress, known issues and next exact task.

# 30. Final pre-implementation audit

| Audit item | Current result |
|---|---|
| Product definition and target market fixed | PASS |
| MVP scope and explicit non-goals fixed | PASS |
| Users/roles/workflows/functional acceptance fixed | PASS |
| Covenant business logic/state machines specified | PASS |
| Data model and tenant relationships specified | PASS |
| System architecture and stack selected | PASS |
| API contracts and safe error semantics specified | PASS |
| Transactions/idempotency/concurrency specified | PASS |
| Authentication/authorization/security controls specified | PASS |
| UI routes/states/behavior specified | PASS |
| Actual reference image identified | **PENDING — not supplied** |
| One-time intake with all required access/cost/authority questions | PASS — template provided; not yet completed |
| Vultr keys/model/catalog/quotas validated | **PENDING — intake** |
| Repository and Git access inspected | **PENDING — intake** |
| Domain/DNS/TLS/preview access validated | **PENDING — intake** |
| Numeric cost ceiling and provisioning permission | **PENDING — no spend authorized** |
| StageShow and optional UI skills | Required Phase 6; not installed yet |
| Early skeleton deployment | Planned; no deployment yet |
| Core flow/E2E/security tests | Specified; no app tests exist yet |
| Documentation and frontend completeness | Files/specs planned and included |
| <=180-second reviewed demo | Script/capture requirements included; not produced |
| Production authority | **NOT GRANTED**; staging-only default |

## Coding agent start point

**The exact first task is:**

> Read the complete handoff package and the repository's existing `AGENTS.md`/instructions. Inspect the repository, Git status, current architecture, manifests, source, migrations, tests and deployment configuration without modifying anything and without printing secret values. Then complete the single consolidated Operator Intake/Readiness Check in `OPERATOR_INTAKE.md`. Collect all genuinely missing required product inputs, supplied reference image(s) or explicit authorization to generate one, repository write access, Vultr Compute/Object Storage/Inference access, credentials, region, model/catalog/quota validation, domain/DNS/TLS, SSH/firewall permissions, numeric budget ceiling, data-handling limits, preview authority, production-release authority, demo audience, redactions and output location in that one intake. Validate each critical input. Do not begin implementation while a critical input is missing. After readiness passes, execute Phase 1 onward autonomously, deploying the labeled skeletal frontend early, implementing core functionality, passing the E2E gate before final reference-led UI, completing documentation/footer, producing the reviewed <=180-second demo and performing final regression/security checks. At each internal checkpoint, test, inspect, fix, commit, update `AI_HANDOFF.md` and `docs/BUILD_LOG.md`, then continue without routine operator approval. Stop only for a genuine blocker or an action outside explicit authority.

**No application code should be written as part of this blueprint handoff.**
