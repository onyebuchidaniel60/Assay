# BUSINESS_LOGIC.md — Formula engine, workflow states and rules

## 1. Authority hierarchy
1. Applicable signed agreement/effective amendment as source text (system does not determine legal validity).
2. Human-approved covenant definition version with exact source clause.
3. Human-confirmed financial evidence versions.
4. Deterministic calculation engine.
5. Independent verifier.
6. AI explanation/memo wording.

LLM output cannot override items 1–5.

## 2. MVP covenant contract
P0 supports one covenant family: maximum Debt/EBITDA (leverage). It is contract-configurable using a restricted JSON AST; it is not a universal covenant interpreter.

Canonical metrics: `gross_debt` (amount at test date), `ltm_ebitda` (amount over agreed TTM period), optional `unrestricted_cash`, `eligible_ebitda_addback`, or `other_contractual_adjustment` only where the approved agreement explicitly provides them. Each metric carries currency, unit, period/as-of date, document version, page, exact source excerpt, extraction provenance, review status and reviewer.

Example formula (illustrative only):
```json
{
  "schema_version": 1,
  "kind": "divide",
  "numerator": {"kind": "metric", "key": "gross_debt"},
  "denominator": {"kind": "metric", "key": "ltm_ebitda"}
}
```

Allowed AST nodes: `metric`, `sum`, `subtract`, `min`, `max`, `divide`, and contract-cited numeric `constant`. Max depth 8, max 50 nodes; allowlisted metric keys; typed currency/unit validation. No loops, function calls, property access, dynamic code, arbitrary SQL or `eval`. Formula includes schema version, AST, metric list, period/currency policy and source references. Unsupported shapes -> NEEDS_REVIEW.

## 3. Calculation rules
- Store as `NUMERIC(24,8)` and accept numeric values as strings. Use Decimal.js (or equivalent), never JS `number` for money or ratio comparison.
- Monetary leaves must share currency. No FX in MVP.
- Debt measured at test date; EBITDA period must follow approved rule (MVP: LTM ending on test date).
- No default cash netting, addbacks, pro forma adjustments or exclusions. Apply only if encoded in an approved formula version and backed by contract source.
- Zero/negative EBITDA, division by zero, missing metric, incompatible currency/period, unsupported node or invalid dimension -> no conclusion; return INDETERMINATE with reason.
- Compute/store >=8 decimal places; display to 2 decimals; display rounding never determines threshold.
- For maximum covenant `<=3.50x`, exactly 3.50x is COMPLIANT; 3.50000001x is BREACHED.
- No invented tolerance.

### Golden synthetic fixture
- Limit 3.50x.
- Actual: debt $32m / LTM EBITDA $10m = 3.20x => COMPLIANT.
- Updated actual: debt $37m / EBITDA $10m = 3.70x => BREACHED.
- Forecast scenario: debt $34.5m / forecast EBITDA $9.5m = 3.63157895x => scenario AT RISK; current actual remains COMPLIANT.
- Boundary: $35m / $10m = 3.50x => COMPLIANT.

## 4. Separate classification dimensions
**Actual compliance:** COMPLIANT, BREACHED, INDETERMINATE, NOT_ASSESSED.  
**Verification:** VERIFIED, FAILED, INCOMPLETE, STALE.  
**Forecast scenario:** AT_RISK, NO_PROJECTED_BREACH, INDETERMINATE.

Only VERIFIED actual calculation can assert COMPLIANT or BREACHED. A forecast never changes actual status. If current actual is indeterminate, show scenario separately with warning rather than implying current compliance.

## 5. State machines

### Document
`RECEIVED → QUARANTINED → SCANNING → EXTRACTING_TEXT → AI_EXTRACTION → NEEDS_REVIEW | PROCESSED`. Terminal/error: `REJECTED`, `FAILED`, `UNSUPPORTED_SCANNED_PDF`, `STORAGE_ERROR`.

### Evidence
`SUGGESTED → CONFIRMED | REJECTED → SUPERSEDED`. Confirmed values are immutable. Corrections create new record and `supersedes_evidence_id`.

### Covenant version
`DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → SUPERSEDED`; alternate `REJECTED`, `NEEDS_REVIEW`. Only CREDIT_MANAGER permission activates. Amendment creates new effective-dated version; history keeps old formula.

### Assessment lifecycle
`CREATED → CALCULATED → VERIFYING → VERIFIED`; other outcomes `INCOMPLETE`, `FAILED`, `STALE`, `SUPERSEDED`. Reassessment creates new assessment, never overwrites prior.

### Case
`OPEN → ASSIGNED → INVESTIGATING → AWAITING_INFORMATION | AWAITING_APPROVAL → ESCALATED → RESOLUTION_IN_PROGRESS → RESOLVED → CLOSED`. Only allowlisted transitions. Close requires reason code, explanation, actor and timestamp; manager required for high/critical.

### Approval
`PENDING → APPROVED | REJECTED | CHANGES_REQUESTED | INVALIDATED | EXPIRED`. Immutable action snapshot, payload hash and dependency version list.

## 6. Approval rules
- Manager with specific action permission only.
- Requester cannot approve same critical action.
- Approval binds to exact action payload hash + referenced formula/evidence/assessment/memo versions.
- Material dependency change invalidates pending approval. Prior approved record remains historical but no longer authorizes new output.
- Decision uses transaction/compare-and-set; concurrent second decision returns 409.
- Reject/change request requires reason.
- No external send operation in MVP.

## 7. Verification checklist
1. Covenant version approved/active/applicable on test date.
2. Formula AST valid and hash matches.
3. All required evidence is confirmed/manual-confirmed and same org/facility.
4. Period, currency and units are compatible.
5. Snapshot contains precisely required metric versions.
6. A separately implemented reference evaluator independently recomputes the exact Decimal result from the frozen evidence/formula snapshot; it must not call the primary calculator evaluation function.
7. Threshold operator/classification correct.
8. Input snapshot hash valid.
9. Dependencies not superseded.
10. Required audit event persisted.

Missing/failing check blocks critical action.

## 8. Version invalidation
When evidence/formula version changes, identify all dependent assessment snapshots and mark STALE. Mark pending approvals INVALIDATED. Approved previous action remains in history but is `no_longer_current`; it cannot authorize new action/export. Reassessment and new approval required where applicable. Perform state updates and audit append in one transaction.

## 9. Idempotency, concurrency and limits
- PDF max 25MB and 200 pages; PDF only; reject encrypted/password protected; scanned PDFs manual review.
- `Idempotency-Key` required for uploads/jobs, assessments, cases, memos, approvals. Same key+same body returns original result; same key+different body returns 409.
- One active case per `(assessment_id, case_type)`; repeated create returns existing active case.
- Assessment key uses covenant version + test date + evidence snapshot hash + kind.
- Versioned writes require expectedVersion/If-Match; stale write 409.
- Approval decision and audit sequence use row lock/compare-and-set.
- No hard deletion of financial documents, assessments, approval decisions or audit events via UI.

## 10. Audit hash chain
Per organization, contiguous `sequence_no`. Canonicalize JSON with sorted keys and stable number/string representation. `event_hash = SHA256(org_id || sequence_no || previous_hash || canonical_payload_hash)`. Append event + update audit head + critical business mutation in same DB transaction. If audit append fails, rollback critical mutation. This provides tamper evidence against partial modification; it does **not** by itself prove identity, trusted timestamp, legal non-repudiation or immutable external custody. Do not call it blockchain. Signed external checkpoints are P1 only.

## 11. No payments / irreversible actions
No payments, balances, transfer, escrow, payouts or processor. Loan principal/debt is informational data. Deadline expiry creates overdue indicator, not automatic legal default. No legal notice, waiver, payment, enforcement or external communication may be executed autonomously.
