# DATABASE_OPERATIONS.md — Transaction, concurrency and side-effect contract

## 1. Global persistence rules

- PostgreSQL is authoritative for business state, permissions, workflow state, approvals, idempotency and audit events.
- Every tenant-owned query includes the organization scope derived from the authenticated membership. Never use a client-supplied organization ID as authority.
- Monetary/ratio values use PostgreSQL `NUMERIC(24,8)` and decimal-string API representations. No JavaScript floating-point arithmetic for financial decisions.
- UUID IDs are generated server-side. Time values are UTC `timestamptz`; contract test dates/periods are `date`.
- Every mutable aggregate uses optimistic `version`/`If-Match` semantics. Stale writes return 409.
- Documents, financial evidence versions, formula versions, assessments, approval decisions and audit events are immutable or append-only. Corrections create successor versions/rows.
- Every material mutation and its audit event/head update commit in one database transaction. If audit append fails, the material operation rolls back.

## 2. Core transaction patterns

### Create borrower

```text
BEGIN
  derive active organization from session membership
  validate borrower fields and normalized reference code
  INSERT borrower (organization_id, normalized_reference_code, ...)
  INSERT audit_event + update audit_head under row lock
COMMIT
return created borrower
```

Unique constraint `(organization_id, normalized_reference_code)` prevents duplicate references. A conflict returns 409 without revealing another tenant's record.

### Upload document (object storage + database)

Object storage and PostgreSQL cannot share one ACID transaction. Use a staged saga:

1. Authenticate and authorize access to target facility; validate multipart size, signature and declared type.
2. Stream to private staging object key while calculating SHA-256. Do not buffer the entire file in application memory.
3. Write staged object to private Vultr Object Storage.
4. In one DB transaction insert document/version metadata, idempotency record, audit event and pg-boss job.
5. On DB failure, attempt compensating delete of staged object; record cleanup failure and queue orphan reconciliation.
6. Worker scans object; only clean files move to parse state. Never expose quarantined content.
7. Finalize immutable metadata/status with version compare-and-set and audit event.

A duplicate Idempotency-Key with same canonical request hash returns original accepted result. Same key with a different hash returns 409. Duplicate content hash within same facility can return the existing version or ask user to associate it; the product decision is idempotent deduplication by file hash+facility+category, while never silently treating a new reporting period as duplicate if metadata differs.

### Activate covenant definition

```text
BEGIN
  SELECT approval_request FOR UPDATE
  check membership, CREDIT_MANAGER permission and requester != approver
  verify request PENDING, payload hash and dependency versions current
  SELECT covenant definition/version FOR UPDATE
  validate source refs, AST, threshold, operator, effective interval
  mark version APPROVED/ACTIVE; mark previous active version superseded at effective boundary
  append immutable approval/audit event and update audit head
COMMIT
```

An approval must not activate a version whose source/document/formula hash changed after submission.

### Create assessment

```text
BEGIN
  lock/validate covenant version and test date
  resolve exact confirmed evidence versions from same org/facility
  validate period/currency/unit/required metrics
  build canonical immutable input snapshot and snapshot hash
  enforce assessment uniqueness/idempotency
  INSERT assessment as CALCULATED / VERIFYING
COMMIT

run deterministic calculator and independent verifier

BEGIN
  SELECT assessment FOR UPDATE
  ensure it is still current and snapshot hash matches
  save calculation/verification/classification
  append audit event + update head
COMMIT
```

If verification fails or becomes stale, do not write COMPLIANT/BREACHED as a verified determination. Persist `INDETERMINATE` or non-verified lifecycle/status with explicit failure codes.

### Approve action

Use transaction + row lock/compare-and-set. Check current status, exact payload hash, dependency version list, current permission, maker-checker and no stale/expired action. A second concurrent decision returns 409. Approval event and audit append are atomic. The approved request may only authorize the exact immutable action snapshot.

### Change/supersede evidence

1. Insert a new evidence row with `supersedes_evidence_id`; do not update old value.
2. Within the same transaction, discover dependent current assessments/approvals using stored dependency IDs.
3. Mark affected assessments STALE and pending approval requests INVALIDATED.
4. Preserve approved historical decisions but mark them no-longer-current in projections; no new action can use them.
5. Append audit event and commit.

For large dependency fanout, use a transactionally enqueued invalidation job with a durable `INVALIDATION_PENDING` blocker; affected critical actions are denied immediately until dependency recalculation completes. For MVP, bounded per-facility fanout may be synchronous.

## 3. Concurrency and race controls

| Race | Control |
|---|---|
| Two users create same borrower reference | Unique constraint and normalized key |
| Same upload retried | Idempotency key + request hash; immutable content hash |
| Same document job delivered twice | pg-boss job ID/idempotent processing key + compare-and-set status |
| Two assessments submitted simultaneously | Unique assessment key + idempotency |
| Same exception case created twice | Partial unique active-case constraint `(assessment_id, case_type)` |
| Two managers decide same approval | `SELECT FOR UPDATE` or CAS on PENDING + version; second gets 409 |
| Evidence changes during calculation | Snapshot frozen; verifier compares current dependency versions before finalization |
| Evidence changes during approval | Dependency version check in same transaction as decision |
| Two audit events append at once | Lock `audit_heads` row per organization and increment sequence atomically |
| Worker crashes mid-job | Job retry with idempotency, durable stage state, bounded attempts |
| Object uploaded but DB commit fails | Compensating object cleanup + orphan reconciliation |

## 4. Idempotency contract

For critical POST operations, require `Idempotency-Key`:

- Document upload acceptance.
- Extraction/processing trigger.
- Assessment creation.
- Forecast scenario creation.
- Exception case creation.
- Memo draft creation.
- Approval request creation/decision where appropriate.
- Export job creation.

Key scope: `(organization_id, user_id, route_key, idempotency_key)`. Store canonical request hash and original response. Reuse with identical request returns the original status/body; reuse with different request returns 409. Expiration must exceed realistic client retry windows; keep audit/business entity records after idempotency row expiration.

## 5. Job processing

- Queue payload contains tenant/entity/version IDs and idempotency token only—never raw file bytes, bearer secrets or arbitrary commands.
- Workers acquire job lease through pg-boss; processing stages use compare-and-set.
- Retry transient network/429/5xx failures up to 3 times with exponential backoff and jitter, respecting Retry-After.
- Do not retry malformed PDFs, unsupported scanned PDFs, invalid schema output or deterministic validation failures indefinitely.
- Dead/failed jobs remain inspectable by authorized users with sanitized failure codes.
- A worker crash must not cause duplicate extraction, formula activation, approval or case creation.

## 6. Deletion and retention

MVP has no hard-delete path for source documents, financial evidence, assessments, approval history or audit events. Archive/deactivate and retention policy apply. Any future deletion/retention workflow requires a separate policy and cryptographically auditable tombstone; it must not break chain verification or legal retention obligations.

## 7. Backup/restore

Encrypted PostgreSQL backups and object retention must use private storage. Restore tests run in an isolated environment. Document backup time, checksum, restore duration and validation. Never claim successful backup recovery merely because a backup command completed.


## 8. Invitation acceptance transaction

- Admin creates a 32-byte cryptographically random base64url token, stores only `SHA256(token)` and an expiry (default 72 hours), and receives the invite link once for manual sharing. Never log the token. The link uses a URL fragment, not query/path; the acceptance page strips the fragment from browser history before POST.
- Public acceptance endpoint is rate limited and receives token/email/name/password in the POST body. It validates token hash, expiry, revocation, normalized email match and invitation status.
- The Better Auth signup route must be guarded so direct unauthenticated signup without a valid invite is rejected. Account creation uses Better Auth password handling, not custom password hashing.
- After user creation, one DB transaction locks/rechecks the invitation, marks it accepted and inserts the membership. A concurrent/second request cannot consume it. If user creation succeeded but membership transaction failed, the account remains unprivileged with no org membership; a safe idempotent retry may finish acceptance. Do not grant organization access until membership insert and token consumption commit.
- No email sender is integrated. The organization admin manually shares the link through its approved channel. The token only proves possession of the invitation link, not independent email ownership; production deployments requiring verified institutional email must add an approved verification mechanism before real customer use.
