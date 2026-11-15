# Testing Strategy

## Unit

Test calculation functions, rounding, add-back eligibility/caps, state transitions, role matrix, redaction tokenization, encryption/decryption, audit hashing/signing, proof input bounds, prompt schemas, Reppo payload scrubber and Kite spend policy.

## Integration

Test migrations, Auth JWT validation, private Storage, Postgres job claiming/leases/retries, Presidio custom recognizers, SERV/Dolphin adapters using sandbox or contract fixtures, Circom compile and SnarkJS proof generation/verification, and optional Reppo/Kite APIs only when authorized credentials exist.

## End-to-end

1. Analyst creates borrower/facility, uploads synthetic agreement, confirms redaction, confirms terms, enters values, calculates and generates proof.
2. Manager accesses restricted queue, inspects proof/risk summary and approves eligible run.
3. Breach run has no compliance proof and cannot be approved.
4. Auditor verifies event chronology and hash chain.
5. Admin demo-shreds synthetic fixture and verifies chain remains intact.
6. Provider outages render honest pending/failed/disabled states.
7. Responsive keyboard navigation covers login, upload/review, results and manager approval.

## Security tests

Test IDOR across users, forged roles, XSS in text/evidence, SQL injection, oversized/malformed PDFs, prompt injection, secret/PII log leakage, expired JWT, CORS denial, concurrent approval, duplicate payment simulation, audit tampering and altered proof inputs.

## Gate

All unit/integration tests pass, critical E2E flows pass on deployed preview, no unresolved critical/high security issue, no secrets or real data exposed, and all provider statuses are accurate. Final visual refinement starts only after the gate.

The implementation agent must record exact commands and outcomes here and in `docs/BUILD_LOG.md`; do not document an unrun test as passing.
