# EDGE_CASE_MATRIX.md — MVP error and edge-case behavior

| Feature | Failure/edge case | Required behavior | Retry/recovery | Test |
|---|---|---|---|---|
| Authentication | Invalid credentials/brute force | Generic failure, rate limit, no account enumeration | Backoff; admin invite/reset path | Auth integration/security |
| Authorization | Cross-tenant or wrong role | 404 for inaccessible resource where existence leaks; otherwise 403 | No retry; audit denial safely | IDOR matrix |
| Borrower | Duplicate normalized reference | 409 conflict | User edits reference | Unique constraint |
| Facility | Borrower belongs to another org | Reject | No retry | Tenant integrity |
| Upload | Wrong extension/MIME/signature | Reject before storage | User supplies supported PDF | Upload validation |
| Upload | File >25 MiB | 413 | Compress/split out of scope; do not accept partial file | Size limit |
| Upload | PDF >200 pages | `REJECTED`/unsupported with clear reason | User submits relevant supported document | Page limit |
| Upload | Encrypted/password PDF | Unsupported/manual review | Request unencrypted authorized copy | PDF fixture |
| Upload | Scanned/no extractable text | `UNSUPPORTED_SCANNED_PDF` / `NEEDS_REVIEW`; no silent OCR | Human review, no automatic assessment | Parser fixture |
| Upload | Malware scanner unavailable | Keep quarantined; fail closed | Retry after scanner health restored | Scanner outage |
| Upload | Storage succeeds, DB fails | Compensating delete or orphan record | Reconciliation job | Fault injection |
| Processing | Duplicate job delivery | Idempotent stage; no duplicate artifacts | pg-boss retry | Job replay |
| PDF parser | Malformed file / parser timeout | Bounded failure; parser isolated; no public error detail | Limited transient retry only | Parser tests |
| AI extraction | Malformed JSON/schema | `NEEDS_REVIEW`; no business record activation | Re-run only after bounded repair or manual review | Schema fuzz |
| AI extraction | Fake page/quote citation | Reject unless quote validated against page text | Human review | Citation validation |
| AI provider | Wrong model returned/fallback | Reject output, record provider request metadata | Revalidate catalog/config | Model mismatch |
| AI provider | Timeout / 429 / 5xx | Bounded retry with backoff; queue status visible | Retry max 3; then failed/review | Resilience test |
| AI prompt | Embedded prompt injection | Treat as document content; no tool/action execution | Continue extraction only under fixed system rules | Adversarial PDF |
| Covenant | Undefined EBITDA adjustments | `NEEDS_REVIEW`; do not assume standard accounting formula | Human clarifies supported contract formula | Formula rules |
| Covenant | Unsupported formula AST | Reject / needs manual handling | No dynamic evaluator fallback | AST validator |
| Covenant | Effective date not applicable | No activation for test date | Correct effective dates | Date boundary |
| Evidence | Missing metric | INDETERMINATE; no final breach/compliance | Request/add evidence | Missing-input test |
| Evidence | Mixed period or currency | Block unless explicitly supported conversion policy exists; MVP has no FX | Correct evidence | Dimension checks |
| Evidence | Conflicting values | Mark conflict, request reviewer | Human selects supported value with reason | Conflict test |
| Calculation | Zero/negative EBITDA | INDETERMINATE; no divide-by-zero | Resolve inputs / review contractual interpretation | Decimal tests |
| Calculation | Exactly 3.50x max covenant | COMPLIANT (for <=3.50x) | None | Boundary golden test |
| Calculation | 3.50000001x | BREACHED if verified at full precision | None | Boundary golden test |
| Forecast | Forecast above limit | AT_RISK scenario, actual remains separate | Update assumptions/inputs | Forecast separation |
| Verification | Recompute mismatch | FAILED, critical action blocked | Investigate discrepancy; new assessment | Independent verifier |
| Versioning | Input superseded after assessment | Assessment STALE; previous decision historical only | Recalculate and reapprove | Invalidation test |
| Approval | Requester tries self-approval | Reject, record denial | Different authorized manager | Maker-checker test |
| Approval | Two concurrent decisions | One succeeds; second gets 409 | Read current state | Race test |
| Approval | Evidence changes before decision | INVALIDATED; no action | New assessment/approval request | Dependency test |
| Cases | Duplicate active case | Return existing case or 409 consistently; never duplicate | Open existing case | Unique index |
| Cases | Invalid state transition | 409; no audit mutation except security event where appropriate | Use valid next state | State machine test |
| Memo | AI introduces unsupported number/legal conclusion | Reject/flag; memo remains draft | Regenerate from fact packet or manual edit | Fact verifier |
| Audit | Event append fails | Rollback related critical business mutation | Retry safe transaction | Fault injection |
| Audit | Hash mismatch or event deletion | Integrity failure; do not repair destructively | Preserve evidence and investigate | Tamper test |
| Storage | Presigned URL expires | 403/expired; reauthorize then mint new short-lived URL | Request new download URL | Storage integration |
| Network | DB unavailable | Readiness fails; no false success | Recover DB and retry idempotently | Health test |
| UI | API returns 401/403/404/409/422/429/503 | Clear state-specific message; preserve safe form data; no sensitive diagnostics | Login/permission/reload/edit/retry as appropriate | E2E states |
| Release | Production authority absent | Production deployment blocked | Staging preview + exact release instructions | Release policy test |

## Global error response

Use the standard error envelope in `API.md`. Messages are actionable but do not reveal SQL, stack traces, secrets, storage keys, cross-tenant IDs or provider credentials. All mutation failures must leave state consistent and auditable.
