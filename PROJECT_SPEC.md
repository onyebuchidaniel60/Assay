# PROJECT_SPEC.md — CovenantOps

## 1. Product definition

**Working product name:** CovenantOps (pronounced “COV-uh-nənt ops”); trademark, repository and domain availability have not yet been checked.  
**Description:** Evidence-driven financial covenant monitoring and operations for commercial lenders and private credit firms.  
**Category:** Enterprise Finance / Credit Risk Operations.  
**Challenge:** Vultr Agent Rush — Powering the Future of Work (Path 2).

### Problem
Credit teams interpret facility-specific covenant definitions, collect borrower evidence, calculate compliance and manage exceptions across agreements, amendments, PDFs, spreadsheets and email. Definitions differ; manual extraction/calculation create errors; periodic review delays risk identification; approvals can become stale when evidence changes; investigations are fragmented.

### Existing alternatives
Spreadsheets, manual PDF/email workflows, shared drives, generic document extraction and loan/portfolio systems. CovenantOps complements, rather than replaces, core loan systems.

### Users and roles
- **Credit Analyst:** upload documents; review extracted data; map/confirm evidence; propose covenant rules; run assessments; investigate cases; draft memos.
- **Credit Manager:** approve covenant configuration and critical memos/actions; assign cases; review portfolio risk. Maker-checker applies.
- **Portfolio Manager:** portfolio/facility/case visibility; may create scenarios if granted; no critical approvals by default.
- **Auditor:** authorized read-only access to evidence, assessments, decisions and audit chain.
- **Organization Admin:** manage memberships and roles; administrative role does not automatically grant credit approval authority.
- **Platform operator:** infrastructure maintenance only; no default borrower-data access. Any support access must be granted, time-bounded and audited.

### Value proposition and differentiator
Turn covenant monitoring into a controlled evidence-to-resolution workflow. Each result is bound to the exact approved contract formula and financial evidence versions used. Deterministic computation is independently verified; material changes invalidate dependent assessments and pending approvals. AI assists extraction and wording, never authoritative arithmetic or approval.

### Primary use case
Onboard a facility, extract/approve a maximum Debt/EBITDA covenant, ingest financial evidence, assess actual compliance and a separate forward scenario, manage a verified breach, prepare an escalation memo, obtain manager approval, then change evidence and show prior dependent decisions become stale.

### Secondary use cases
1. Identify a future covenant risk without declaring an actual breach.
2. Reconcile missing/conflicting financial evidence.
3. Track upcoming tests and unresolved investigations.
4. Review an amendment while retaining historical assessment definitions.

### Explicit non-goals
No loan origination, servicing, payment collection, ledger, automated underwriting, legal opinion/enforceability conclusion, live bank/accounting integrations, autonomous borrower notices, automated waiver execution, arbitrary document-code execution, universal covenant support or production-grade continuous data feeds in the MVP.

## 2. MVP scope

### MUST HAVE (P0)
1. Invite-only account creation/login, organization membership and seeded demo roles. Admin creates a one-time tokenized invite link for manual sharing; no email provider is required.
2. Borrower/facility create, view and edit with tenant scoping.
3. PDF upload (max 25MB/200 pages), signature/type validation, SHA-256, private storage, immutable document versions and processing status.
4. Text extraction for selectable-text PDFs; scanned/image-only PDFs go to manual review (no OCR in MVP).
5. Vultr Serverless Inference extraction of covenant clauses and financial metrics into validated structured output, with exact page/quote references and uncertainty flags.
6. Human review and manager approval of one **contract-configurable maximum Debt/EBITDA** covenant.
7. Financial evidence mapping/confirmation, with source lineage, currency, units and period.
8. Decimal-based formula engine using restricted JSON expression DSL; no `eval` or executable formulas.
9. Actual result classifications COMPLIANT, BREACHED or INDETERMINATE; verification status separately VERIFIED, FAILED, INCOMPLETE or STALE.
10. Deterministic forecast scenario using explicit user-supplied values/assumptions; display AT RISK separately from actual status.
11. Independent verification of formula, evidence, versions, period/currency, recomputed result and threshold.
12. Breach/at-risk exception creation, assignment, notes, investigation and reasoned resolution.
13. Evidence-backed escalation memo; manager approval bound to exact assessment/evidence snapshot. No send integration.
14. Changed evidence/formula invalidates dependent assessment and pending approval; historical decisions remain visible as historical.
15. Append-only application audit events linked by SHA-256 hash chain; inspect/verify chain.
16. Portfolio dashboard and borrower/facility/covenant/case/approval/audit screens.
17. Server-side RBAC and cross-organization isolation.
18. Deployment on Vultr Cloud Compute; Vultr Object Storage for private documents; Vultr Serverless Inference for AI.
19. Unit/integration/E2E/security tests, documentation, protected public demo URL with limited/resettable synthetic reviewer access, and reviewed demo video <=180 seconds.

### SHOULD HAVE (P1, only after P0)
- Effective-dated amendment/waiver records with manager review.
- Upcoming test reminders in the dashboard.
- Interest Coverage Ratio using same DSL, only after P0 tests/UI pass.
- CSV export; signed daily audit-root checkpoint.

### NICE TO HAVE (P2)
More covenant types (DSCR, liquidity, LTV), advanced stress scenarios, SSO, configurable approval matrix, external notifications/integrations, OCR, multilingual/table extraction.

### FUTURE
Borrower portal, live accounting/core banking feeds, continuous monitoring, multi-region DR, regulatory reports, benchmarking and institutional retention/legal-hold controls.

### OUT OF SCOPE
Real borrower/customer data in hackathon demo; banking integrations; external notices; payments; legal determinations; automated enforcement; unrestricted agent autonomy; arbitrary user-coded formulas.

**Scope rule:** one fully validated contract-configurable leverage covenant is better than multiple shallow covenant templates. Do not claim support for formulas not covered by tests.

## 3. User flows

All mutation paths require authenticated session + org membership + permission. Resource UUID is never authorization.

### A. Invitation and sign-in
ORG_ADMIN creates a one-time invitation for a target email/role; server stores only token hash and returns the link once for the admin to share manually. Recipient opens invite, submits matching email/name/password; server validates token/expiry/email, creates account through Better Auth, consumes token once and creates organization membership. Existing invited/seeded user signs in at `/login`; Better Auth establishes secure session and app resolves membership/role. No public self-signup without valid invitation. Generic errors/rate limits; token never logged or persisted in browser storage.

### B. Create borrower/facility
Analyst/manager/admin enters legal name/reference and facility name/type/currency/amount/dates. Server normalizes unique reference within org, validates amount and date order, inserts related rows and audit events transactionally. Duplicate ref => 409; invalid values => 422; cross-org reference/borrower => denied.

### C. Upload/process documents
Authorized user selects facility, category, PDF and period/as-of date. API streams file, enforces max bytes/signature, calculates SHA-256, scans, stores under opaque private key, inserts immutable version and queue job, returns 202/job ID. Storage/DB partial failure uses compensating cleanup; duplicate bytes prompt reuse/link decision. Parser timeout/malformed/encrypted/scanned document becomes visible review/failure, never false success.

### D. Extract/approve covenant
Worker parses page-indexed text and calls Vultr Inference for strict structured candidate. Zod validates; page/quote must exist in stored parsed text. Candidate creates DRAFT only. Analyst reviews/edits and submits; manager approves; only then becomes ACTIVE. Ambiguous/unsupported terms remain NEEDS_REVIEW. Requester cannot approve own critical action.

### E. Extract/confirm evidence
AI proposes allowed metric keys/value/currency/period/source page/excerpt. Analyst confirms or rejects. Conflicts require explicit source selection and reason. Manual correction creates new evidence; original extraction retained. Missing/period-incompatible values block assessment.

### F. Actual assessment
Analyst selects test date and exact confirmed evidence versions. Server snapshots approved formula + evidence IDs/values, computes with Decimal, verifier independently recomputes, then classifies only if VERIFIED. Missing/invalid evidence => INDETERMINATE/INCOMPLETE; changed dependency => STALE.

### G. Forecast scenario
User enters forecast debt/EBITDA values, period and assumptions. Same formula engine calculates with source kind FORECAST. Scenario may show AT RISK or NO PROJECTED BREACH but never changes actual assessment status or creates an actual breach.

### H. Breach case/memo approval
Only a current VERIFIED BREACHED assessment can create a breach case. Analyst assigns/records investigation and drafts memo from verified facts. Manager reviews immutable snapshot and approves/rejects/returns. No external send. Case remains open until resolution reason is recorded and authorized user closes it.

### I. Stale invalidation
When material evidence/formula changes, transaction marks dependent assessments STALE and pending approvals INVALIDATED; approved historical decision remains visible but no longer authorizes current output. Reassessment creates new record and new approval if required.

### J. Audit verification
Manager/admin/auditor requests chain verification. Service recalculates sequence/hash chain and returns VALID/INVALID/UNAVAILABLE plus first bad event. Audit verification is not a legal non-repudiation claim.

## 4. Functional requirements and acceptance criteria

### FR-01 Workspace/access
Authenticated membership resolves active org and permissions. Every route/service/repository enforces org scope. **Acceptance:** changing tenant/resource IDs cannot reveal another org's data through UI or API.

### FR-02 Borrower/facility
Create/view/edit borrower and facility; enforce unique normalized refs, correct parent relationship, nonnegative amounts and valid date order. **Acceptance:** create borrower+facility; duplicate ref 409; maturity before agreement rejected; cross-tenant relation rejected.

### FR-03 Documents
PDF-only, <=25MB/200 pages, magic-byte validation, malware scan, SHA-256, immutable versions, private object store, asynchronous queue. **Acceptance:** invalid type/oversize/malformed/virus fails; private object not public; upload retry idempotent; DB failure compensates object.

### FR-04 Covenant extraction/review
AI proposes clause/threshold/operator/period/adjustments and source references; Zod schema and page/quote verification; no auto-activation. **Acceptance:** no activation without manager approval; unsupported/ambiguous extraction requires review; model cannot supply executable code.

### FR-05 Evidence extraction/reconciliation
AI extracts approved canonical metrics and provenance; user confirms; period/currency/conflicts validated. **Acceptance:** each calculation input has exactly one selected confirmed source version; conflict never silently resolves.

### FR-06 Deterministic calculation
Approved formula DSL; Decimal arithmetic; full result and trace; exact threshold comparison; no floating-point. **Acceptance:** golden tests include 3.20x compliant, 3.50x boundary compliant and 3.70x breach; repeated snapshot gives same result/hash.

### FR-07 Independent verification
Verifier independently reloads exact immutable versions and recomputes result/classification through a separate reference evaluator implementation, not the primary calculator function. **Acceptance:** tampered output, formula hash, input or stale dependency fails verification and blocks memo approval.

### FR-08 Scenario
Explicit assumptions, horizon and FORECAST source type; independent scenario version. **Acceptance:** forecast > threshold while current actual compliant shows AT RISK in scenario view, never actual BREACHED.

### FR-09 Cases
Controlled case states, owner, due date, append-only notes and reasoned close. **Acceptance:** duplicate active case prevented; invalid transition rejected; case cannot close without resolution reason/role.

### FR-10 Memo/approval
Facts packet from verified calculation; AI prose only; snapshot and dependency hash; manager maker-checker. **Acceptance:** analyst cannot approve; self-approval denied; evidence change invalidates pending approval; rejection reason retained.

### FR-11 Audit
Append-only events, per-org sequence and SHA-256 chain. **Acceptance:** payload alteration is detected; audit write failure rolls back critical mutation; no update/delete endpoint.

### FR-12 Dashboard
Org-scoped metrics; actual and forecast counts separated; loading/empty/error states. **Acceptance:** counts reconcile to stored rows and filters; API failure is not shown as zero.

## 5. Success measures
Use synthetic gold corpus. Measure extraction accepted/corrected/rejected, metric exact-match and citation validity, calculation reproducibility, false-positive/negative classification, percent evidence traceable, stale-approval test pass and E2E elapsed time. Publish only measured results; no invented accuracy claims.
