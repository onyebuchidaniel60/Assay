# Testing strategy

Tests are part of implementation, not a final polish activity. The exact package scripts are defined when the repository is inspected; do not claim commands that do not exist.

## Unit tests — `packages/domain`

- Decimal arithmetic: exact numerator/denominator, supported precision, rounding display vs decision precision.
- Boundary: max Debt/EBITDA at 3.50x is compliant; 3.500... above is breached according to contractual precision.
- Formula AST: allowed node types/operators only; reject unknown identifiers, unsupported functions, excessive depth/length and divide-by-zero.
- Input dimensions: units, currencies and reporting periods must match or be explicitly and safely converted under an approved rule.
- Covenant state transitions and amendment effective dates.
- Forecast scenario remains distinct from actual compliance.
- Assessment dependency snapshot hash and stale detection.
- Approval invalidation on source/formula/document change.
- Hash-chain event canonicalization and tamper detection.
- Case transition and closure reasons.

## Integration tests

- Auth/session + organization membership + role permission matrix; invite token single-use/expiry/email match and concurrent acceptance.
- Every repository query is organization-scoped; cross-tenant access denied.
- Document upload: type/size/signature validation, hashing, private storage, DB transaction, job enqueue and orphan compensation.
- ClamAV fail-closed behavior; scanner unavailable does not proceed to parser.
- PDF parser: page-indexed quote references, page caps, timeout, malformed/encrypted/scanned document handling.
- Vultr inference adapter: network timeout, 429/5xx, malformed JSON, schema mismatch, fabricated page, missing quote, returned model mismatch and retry limits.
- Calculation and verifier recompute from immutable approved versions through separate evaluation implementations; deliberately mutate the primary evaluator in a test and prove the verifier detects disagreement.
- Case/memo/approval transaction and append-only audit event are atomic.
- Idempotency key returns same result and does not duplicate records/jobs.
- Concurrent approval and concurrent evidence update: only one valid compare-and-set transition; stale dependency blocks old approval.
- S3 pre-signed GET is short-lived/private and generated only after authorization.

## E2E acceptance journeys (Playwright)

1. Analyst logs in and creates borrower/facility.
2. Upload synthetic credit agreement; processing status and source extraction shown.
3. Analyst reviews a max Debt/EBITDA covenant; manager approves/activates it.
4. Upload synthetic statement; inspect traceable debt and EBITDA inputs.
5. Run deterministic 3.20x result; independent verification passes; result COMPLIANT.
6. Run separate 3.63x forecast; result AT_RISK; actual assessment remains COMPLIANT.
7. Change evidence debt to 37m; previous assessment becomes STALE; new verified 3.70x result is BREACHED.
8. Exception case created; memo drafted from verified fact packet; manager approves exact memo/action version.
9. Change an underlying dependency before action; pending approval is invalidated and cannot execute.
10. Audit UI verifies chain and shows document/formula/evidence/assessment/approval references.

## Security tests

- IDOR and cross-tenant read/write attempts on every resource route.
- Role escalation, analyst self-approval and forged actor IDs.
- CSRF/origin validation, session fixation/expiry and cookie flags.
- XSS payloads in names, document text and memo fields.
- SQL injection via search/filter/IDs; parameterized query confirmation.
- Oversized, wrong MIME, malformed, encrypted, polyglot and malicious PDF fixtures.
- Prompt-injection content in a document; no tool execution or policy override.
- SSRF attempts through model/document metadata; only allowlisted provider/storage hosts.
- Replay/duplicate requests and concurrent same-action races.
- Hash-chain event modification, reorder, delete and fork detection.
- Secret scanning, dependency audit and container image review.

## Evidence

At each phase, store exact command, exit status, test count, failures and relevant commit in `docs/BUILD_LOG.md`. E2E screenshots/video must use synthetic records only. A skipped or unavailable test must be recorded with reason; never mark as passed.
