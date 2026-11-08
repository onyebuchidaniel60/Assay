# API.md — REST contract

Base: `/api/v1`. Better Auth endpoints under `/api/auth/*`. All business APIs require session + active organization membership, except the explicitly rate-limited `POST /api/v1/invitations/accept` endpoint. Server derives organization from session membership; never trust `organizationId` submitted by client.

## Envelope
Success: `{"data":{...},"meta":{"requestId":"req_..."}}`.
Error: `{"error":{"code":"VALIDATION_ERROR","message":"The request could not be processed.","details":[{"field":"testDate","reason":"Required"}],"requestId":"req_..."}}`.

Codes: 401 `UNAUTHENTICATED`; 403 `FORBIDDEN`; 404 `NOT_FOUND` (avoid cross-tenant existence leaks); 409 `CONFLICT`; 413 `TOO_LARGE`; 415 `UNSUPPORTED_MEDIA_TYPE`; 422 `VALIDATION_ERROR`; 429 `RATE_LIMITED`; 503 `DEPENDENCY_UNAVAILABLE`; 500 `INTERNAL_ERROR`. No stack traces, SQL, credentials or other-tenant IDs.

Headers: session cookie; optional validated `X-Request-Id`; `Idempotency-Key` required for jobs/assessments/cases/memos/approvals; `If-Match` or `expectedVersion` for versioned writes. Mutations enforce CSRF/Origin. All schemas are Zod; financial values are decimal strings, dates ISO `YYYY-MM-DD`, currency uppercase 3-letter.

## Endpoint catalogue

### Health/workspace
- `GET /api/health/live` — public liveness only.
- `GET /api/health/ready` — public generic readiness; no secrets/connection details.
- `GET /api/v1/me` — authenticated user safe profile, active org role/permissions.
- `GET /api/v1/workspace` — org display and user capabilities.
- `GET /api/v1/members` — ORG_ADMIN.
- `POST /api/v1/members/invitations` — ORG_ADMIN; creates a 256-bit one-time invite token (hash stored, plaintext returned once for manual sharing); no email delivery integration.
- `POST /api/v1/invitations/accept` — public, rate-limited; accepts `{token,email,name,password}` only when token hash is valid, unexpired/unrevoked, email matches and no account/membership conflict; create account via Better Auth server API and consume token/create membership in a guarded transaction/compensation flow.
- `PATCH /api/v1/members/:membershipId` — ORG_ADMIN; role/status/version; cannot remove last active admin or self-escalate.

### Dashboard
- `GET /api/v1/dashboard/summary?from=&to=&facilityId=` — org-scoped counts; actual vs forecast clearly distinct.

### Borrowers/facilities
- `GET /api/v1/borrowers?search=&status=&cursor=` — member, max page 50.
- `POST /api/v1/borrowers` — analyst/manager/admin; `{legalName,referenceCode,classification}`.
- `GET /api/v1/borrowers/:id` — member.
- `PATCH /api/v1/borrowers/:id` — analyst/manager/admin + expectedVersion.
- `GET /api/v1/borrowers/:id/facilities` — member.
- `POST /api/v1/borrowers/:id/facilities` — analyst/manager/admin; name/ref/type/currency/amount/dates.
- `GET /api/v1/facilities?status=&borrowerId=&cursor=`; `GET /api/v1/facilities/:id`; `PATCH /api/v1/facilities/:id` with expectedVersion.

### Documents/jobs
- `POST /api/v1/facilities/:facilityId/documents` — multipart `file`, `category`, optional period/asOfDate/displayName; PDF <=25MB; Idempotency-Key; returns 202 with documentId, versionId, SHA-256, status and jobId.
- `GET /api/v1/facilities/:facilityId/documents` — member, metadata only.
- `GET /api/v1/documents/:documentId` — versions/status.
- `GET /api/v1/documents/:documentId/versions/:versionId/download` — member; stream or signed private GET <=60 seconds; auth every time; never log URL.
- `GET /api/v1/jobs/:jobId` — authorized member; sanitized stage/error.

### Extraction/covenants
- `GET /api/v1/facilities/:facilityId/extractions`; `GET /api/v1/extractions/:runId`.
- `GET /api/v1/facilities/:facilityId/covenants`.
- `POST /api/v1/facilities/:facilityId/covenants/drafts` — analyst/manager; extraction candidate and corrections; DRAFT only.
- `GET /api/v1/covenants/:id`; `GET /api/v1/covenants/:id/versions`.
- `PATCH /api/v1/covenants/:id/versions/:versionId` — analyst; only draft, allowed formula AST/threshold/operator/source refs/effective date + expectedVersion.
- `POST /api/v1/covenants/:id/versions/:versionId/submit-approval` — analyst; Idempotency-Key.
- `POST /api/v1/approvals/:approvalId/decision` — credit manager permission; `APPROVE|REJECT|CHANGES_REQUESTED`, reason; exact payload revalidation and maker-checker.

### Financial evidence
- `GET /api/v1/facilities/:facilityId/evidence?metric=&status=&periodEnd=`.
- `POST /api/v1/facilities/:facilityId/evidence/manual` — analyst/manager; metric/value/currency/unit/date/period/reason; never silently mark confirmed unless explicit policy.
- `POST /api/v1/evidence/:id/decision` — CONFIRM/REJECT + expectedVersion.
- `POST /api/v1/evidence/:id/supersede` — new value/source/reason; new row and dependency invalidation.

### Assessments/scenarios
- `POST /api/v1/covenants/:id/assessments` — analyst/manager; testDate and metricKey->evidenceId map; idempotency. Server ensures exact tenant/facility and confirmed evidence.
- `GET /api/v1/assessments/:id`; `GET /api/v1/covenants/:id/assessments`.
- `POST /api/v1/covenants/:id/scenarios` — analyst/manager/authorized portfolio manager; horizon, forecast inputs and assumptions; idempotency.
- `GET /api/v1/scenarios/:id`.

### Cases/memos/approvals
- `POST /api/v1/assessments/:id/cases` — current VERIFIED BREACHED or permitted potential-risk assessment; case type/severity/title/owner/due date; idempotency; duplicate returns existing active case.
- `GET /api/v1/cases?status=&owner=&severity=&cursor=`; `GET /api/v1/cases/:id`.
- `PATCH /api/v1/cases/:id` — allowlisted transition + expectedVersion.
- `POST /api/v1/cases/:id/notes` — append-only note.
- `POST /api/v1/cases/:id/memos` — memo draft from current verified assessment; idempotency.
- `GET /api/v1/memos/:id`; `POST /api/v1/memos/:id/submit-approval`.
- `GET /api/v1/approvals?status=PENDING`; `GET /api/v1/approvals/:id`; shared `POST /api/v1/approvals/:id/decision`.
- `GET /api/v1/cases/:id/timeline`.

### Audit/export
- `GET /api/v1/audit/events?facilityId=&entityId=&from=&to=&cursor=` — manager/admin/auditor.
- `POST /api/v1/audit/verify` — manager/admin/auditor; optional facility/sequence range; VALID/INVALID/UNAVAILABLE + first failed sequence.
- `POST /api/v1/exports/assessment` — generate PDF; async job + idempotency.
- `GET /api/v1/exports/:id` — authorized download.

## Common validation/security
- Max page size 50; cursor pagination; allowlist sortable/filter fields.
- Unknown fields rejected on sensitive mutation schemas.
- `sourceExcerpt` and page references are server-derived/validated against stored parsed page text; client cannot assert authoritative source.
- No arbitrary object keys, paths or URLs accepted.
- Rate limit login, upload, extraction, assessments and memo generation.
- No signed URLs or secrets in API logs.

## Transaction and side-effect contract
Business mutation + audit event commit before success response. For object-store upload then DB commit, use staging object key and compensating cleanup/reconciliation. AI/PDF work is asynchronous; no long calls in request path. Idempotency key reuse with different body is 409; same body returns original result.


## Route-level contract details

The catalogue above defines the complete MVP route surface. The following contracts make mutation semantics explicit; all paths remain organization-scoped except the stated invitation acceptance route.

### `POST /api/v1/borrowers`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER, ORG_ADMIN.
- **Request:** `{"legalName":"Acme Holdings Ltd","referenceCode":"BRW-001","classification":"CORPORATE"}`.
- **Validation:** trimmed non-empty legal name <=240 chars; normalized reference <=80 chars; allow-listed classification; server derives `organizationId` and `createdBy`.
- **Processing:** insert borrower and audit event atomically; unique normalized ref per org.
- **Success:** `201 {data:{id,legalName,referenceCode,status,version,createdAt},meta:{requestId}}`.
- **Errors:** 401/403/409/422/500. Duplicate ref returns generic 409 conflict.
- **Side effects:** audit `BORROWER_CREATED`.

### `POST /api/v1/borrowers/:id/facilities`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER, ORG_ADMIN.
- **Request:** `{"name":"Term Loan A","referenceCode":"FAC-001","facilityType":"TERM_LOAN","currency":"USD","committedAmount":"50000000.00","outstandingAmount":"32000000.00","agreementDate":"2026-01-01","maturityDate":"2030-12-31"}`.
- **Validation:** borrower must exist in active org; currency uppercase ISO-like 3-letter; amounts nonnegative decimal strings; maturity >= agreement; amount precision <=8; server validates borrower and facility tenant match.
- **Processing:** insert facility + audit in transaction.
- **Success:** `201` with facility fields/version.
- **Errors:** 403/404/409/422.
- **Side effects:** `FACILITY_CREATED` audit event.

### `POST /api/v1/facilities/:facilityId/documents`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER, ORG_ADMIN.
- **Request:** multipart `file`, `category`, optional `periodStart`, `periodEnd`, `asOfDate`, `displayName`; `Idempotency-Key` required.
- **Validation:** PDF signature and MIME, <=25 MiB, <=200 pages (page cap checked after isolated parse), not encrypted; file stream size enforced while streaming; exact facility permission; sanitized display name.
- **Processing:** stream/hash → private staging object → transaction inserts document/version/job/idempotency/audit. Scanner/parser operate asynchronously.
- **Success:** `202 {data:{documentId,versionId,sha256,processingStatus:"QUARANTINED",jobId},meta:{requestId}}`.
- **Errors:** 401/403/404/409/413/415/422/429/503. Object/DB partial failure uses compensating delete or orphan reconciliation.
- **Side effects:** private object, pg-boss job, `DOCUMENT_VERSION_RECEIVED` event.

### `POST /api/v1/members/invitations`
- **Actor:** ORG_ADMIN only.
- **Request:** `{"email":"analyst@example.test","role":"CREDIT_ANALYST"}`.
- **Validation:** normalized email, allow-listed role, no existing active membership, no active pending invite; rate limited. `ORG_ADMIN` role grant requires existing admin.
- **Processing:** create cryptographically random 32-byte token; store SHA-256 token hash only and 72-hour expiry; create audit event. Return invite URL once with token in URL fragment; never log token.
- **Success:** `201 {data:{invitationId,email,role,expiresAt,inviteUrl},meta:{requestId}}`. Plain token/link is not retrievable again.
- **Errors:** 401/403/409/422/429.
- **Side effects:** `INVITATION_CREATED`; no email sent.

### `POST /api/v1/invitations/accept`
- **Actor:** public but strongly rate-limited; no session required. This is the only public business exception.
- **Request:** `{"token":"<one-time-token>","email":"analyst@example.test","name":"Alex Analyst","password":"<new-password>"}`.
- **Validation:** token hash valid, unexpired, pending and unrevoked; normalized email matches; password policy enforced; account conflict handled generically. Token must come from URL fragment and be removed from browser history before POST. No third-party scripts/analytics on invite page.
- **Processing:** validate invitation, create account using Better Auth password handling via guarded server-side signup, then transactionally consume invitation and create membership. Direct Better Auth signup without invitation must be rejected. If account creation succeeds but membership transaction fails, account has no organization access; safe retry may complete invite.
- **Success:** `201 {data:{accepted:true,organizationName,role},meta:{requestId}}`; redirect to login.
- **Errors:** generic 400/409 for invalid/expired/used/mismatched token or account conflict; 422 password/format; 429 rate limited. Do not reveal whether an email is registered.
- **Side effects:** membership insert, one-time token consumption, `INVITATION_ACCEPTED`; no email sent. Token never included in logs.

### `POST /api/v1/facilities/:facilityId/covenants/drafts`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER.
- **Request:** `{"extractionRunId":"uuid","name":"Maximum Leverage","threshold":"3.50","operator":"LTE","formulaAst":{...},"testFrequency":"QUARTERLY","effectiveFrom":"2026-01-01","sourceRefs":[{"documentVersionId":"uuid","page":12,"quote":"..."}]}`.
- **Validation:** strict AST schema and bounds; only supported metrics/operators; referenced document/page/quote exists in current parsed text; source document is facility-linked; threshold decimal string; unsupported adjustments rejected to review.
- **Processing:** create DRAFT version only; no activation on extraction or create.
- **Success:** `201` with covenant and version `DRAFT`.
- **Errors:** 403/404/409/422/503.
- **Side effects:** `COVENANT_DRAFT_CREATED`.

### `POST /api/v1/covenants/:id/versions/:versionId/submit-approval`
- **Actor:** CREDIT_ANALYST or CREDIT_MANAGER (requester).
- **Request:** `{}` plus `Idempotency-Key`.
- **Validation:** version DRAFT, exact version current, required source refs/formula present, requester cannot be later approver.
- **Processing:** immutable payload/dependency hash; create PENDING approval request + audit event.
- **Success:** `202` with approval request ID/status.
- **Errors:** 403/404/409/422.
- **Side effects:** `APPROVAL_REQUESTED`.

### `POST /api/v1/approvals/:approvalId/decision`
- **Actor:** CREDIT_MANAGER permission; requester cannot approve own critical request.
- **Request:** `{"decision":"APPROVE","reason":"Reviewed against clause and evidence."}`.
- **Validation:** approval PENDING, manager authorized, payload hash/dependency versions still current, evidence/formula not stale, `If-Match` version current; reason required for reject/change.
- **Processing:** row lock/CAS; insert immutable `approval_decisions` row, update request projection, execute only the action type authorized by that exact payload (e.g. activate covenant version), append audit event in same transaction.
- **Success:** `200` with current approval status and decision ID.
- **Errors:** 403/404/409/422. Concurrent second decision returns 409. Stale dependency returns `409 APPROVAL_INVALIDATED`.
- **Side effects:** `APPROVAL_DECIDED`; exact approved action only.

### `POST /api/v1/covenants/:id/assessments`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER.
- **Request:** `{"testDate":"2026-09-30","evidenceMap":{"gross_debt":"evidence-uuid-1","ltm_ebitda":"evidence-uuid-2"}}` with `Idempotency-Key`.
- **Validation:** active covenant version effective on test date; evidence IDs belong to same org/facility, are CONFIRMED/MANUAL_CONFIRMED, and satisfy period/currency/unit rules; client cannot submit calculated ratio/status.
- **Processing:** freeze canonical formula/evidence snapshot; primary calculator evaluates; separate reference verifier independently recomputes; status only assigned from verified result; transaction persists assessment and audit.
- **Success:** `201` with completed result for the MVP synchronous calculator; response returns assessment ID, calculated ratio as string, actual status, verification state, snapshot hash and reason codes. If a measured workload later requires async assessment, that is a separately versioned product decision, not an unannounced implementation shortcut.
- **Errors:** 403/404/409/422/503. Missing/ambiguous evidence returns persisted INDETERMINATE/INCOMPLETE result where possible rather than fabricated output.
- **Side effects:** assessment row, verification run, idempotency result and audit event.

### `POST /api/v1/covenants/:id/scenarios`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER; PORTFOLIO_MANAGER only if explicit permission.
- **Request:** `{"name":"Downside Q4","horizonStart":"2026-10-01","horizonEnd":"2026-12-31","assumptions":{"gross_debt":"34500000","ltm_ebitda":"9500000","currency":"USD","source":"USER_ASSUMPTION"}}` with `Idempotency-Key`.
- **Validation:** supported formula version, bounded horizon, explicit forecast source/assumptions, currency matches, decimal strings; no false label as actual evidence.
- **Processing:** store immutable versioned assumptions and deterministic scenario assessment; classify only scenario status.
- **Success:** `201` with scenario and separate `AT_RISK`/`NO_PROJECTED_BREACH` status.
- **Errors:** 403/404/409/422.
- **Side effects:** scenario and `SCENARIO_CREATED`; actual assessment unchanged.

### `POST /api/v1/assessments/:id/cases`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER.
- **Request:** `{"caseType":"BREACH","severity":"HIGH","title":"Maximum leverage threshold exceeded","ownerUserId":"uuid","dueDate":"2026-11-12"}` with `Idempotency-Key`.
- **Validation:** assessment is current and VERIFIED; BREACH requires actual BREACHED; POTENTIAL_BREACH requires explicit forecast assessment; owner must be active member; case type must match assessment kind.
- **Processing:** partial unique active case and transaction with audit.
- **Success:** `201` new case or `200` existing active case on same idempotency/business key.
- **Errors:** 403/404/409/422.
- **Side effects:** `CASE_CREATED`.

### `POST /api/v1/cases/:id/memos`
- **Actor:** CREDIT_ANALYST, CREDIT_MANAGER.
- **Request:** `{"memoType":"INTERNAL_ESCALATION"}` with `Idempotency-Key`.
- **Validation:** case open, assessment current and verified, fact packet available; no free-form model facts.
- **Processing:** server builds immutable fact packet; AI drafts prose; server verifies every material number/reference against packet; invalid claim rejected/needs review.
- **Success:** `201` memo DRAFT with facts hash and version.
- **Errors:** 403/404/409/422/503.
- **Side effects:** memo draft and audit event; no external communication.

### `POST /api/v1/audit/verify`
- **Actor:** CREDIT_MANAGER, ORG_ADMIN or AUDITOR.
- **Request:** optional `{"facilityId":"uuid","fromSequence":"1","toSequence":"500"}`.
- **Validation:** requested entities belong to active org; bounded sequence range.
- **Processing:** recompute canonical hashes/sequences from persisted events and current head.
- **Success:** `200 {data:{result:"VALID"|"INVALID"|"UNAVAILABLE",firstFailedSequence,checkedCount}}`.
- **Errors:** 401/403/404/422/503.
- **Side effects:** verification run/audit query event if policy requires; never rewrite history.

Other read/patch/list endpoints follow the same auth, tenant-scope, cursor pagination (max 50), Zod schema, sanitized error and audit rules described above. They must not accept caller-supplied status/calculated values or arbitrary storage paths/URLs.
