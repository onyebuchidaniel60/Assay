# Testing Strategy and Verified Evidence

## Current automated suites

| Suite | Command | Result (15 Nov 2026) |
|---|---|---|
| Root typecheck | `pnpm typecheck` | Passed (8 packages + apps) |
| Root unit tests | `pnpm test` | domain 18/18, crypto 4/4, contracts 6/6, document 8/8, proof 3/3, AI 10/10, API 4/4 |
| Root build | `pnpm build` | Passed |
| Playwright shell + authenticated workspace | `pnpm --filter @assay/web exec playwright test` | 18/18 desktop + mobile |

The Playwright suite needs the web app on `http://localhost:3000`, the API on `http://localhost:3001`, and demo credentials in the environment:

```bash
set -a
. /root/assay-secrets/demo-users.env
set +a
pnpm --filter @assay/web exec playwright test
```

It signs in through Neon Auth and covers:

- landing and login form;
- analyst dashboard, borrower/facility registers and covenant register;
- analyst opening an approved run, proof public signals and manager decision;
- manager restricted queue (raw amounts absent);
- auditor chain verification (`VALID`) and signed `ANALYSIS APPROVED` event;
- settings showing the current role and sign-out boundary.

## Unit coverage

- Deterministic Decimal engine: exact predicate, headroom, floor/ceil stress rules, ineligible add-back rejection, zero/negative EBITDA rejection, currency mismatch.
- Independent BigInt verifier: rounded 8-dp ratio match, classification match, dependency/formula staleness.
- Approval policy: role, maker-checker, payload/dependency invalidation, expiry and reason rules.
- Kite policy: expiry, asset, per-tx cap, total cap, idempotency and invalid amount.
- Contracts: normative covenant-terms schema, minor-unit financial inputs, redaction spans, approval/terms review.
- Crypto: DEK wrap/unwrap, AES-GCM tamper failure, Ed25519 sign/verify.
- Document: magic bytes, 10 MiB cap, PDF text/page extraction, scanned/no-text rejection, tokenization stability, overlap priority.
- AI adapters: exact model mismatch, HTTP/invalid envelope errors, NEAR AI `max_completion_tokens`, SERV system-prompt requirement, attestation report hash.
- API health: safe liveness/readiness envelope, unauthenticated 401, not-found envelope.

## Integration evidence (live, synthetic)

Recorded in `docs/BUILD_LOG.md`:

- PostgreSQL 18.7, Neon Auth `/ok`, private S3 bucket.
- NEAR AI model metadata and a live attested extraction: Intel TDX `UpToDate`, NVIDIA NRAS true, signer/nonce binding, response ECDSA signature and request/response hashes verified.
- OpenRouter exact judgement model; SERV exact `serv-standard`.
- Four-page synthetic PDF parsed and redacted; covenant clause preserved with 7 tokenized identifiers.
- Full run: 3.0660x baseline compliant → independent verification `VERIFIED` → proof public signals `["1","35000"]` → manager `APPROVED`; analyst approval 403; duplicate approval 409.
- Stressed run: baseline 3.475x compliant; EBITDA-down 3.861x and debt-up 3.823x breached; approval without acknowledgement 422; acknowledged approval 201.
- Per-borrower audit chain `VALID`, 13 events, Ed25519 signatures verified.
- Public sign-up probe: `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`.

## Still required before production release (Phase 5/9 gate)

- IDOR matrix across every route and every role.
- Role forgery and client-supplied authoritative-field probes.
- XSS and HTML-injection review of rendered evidence/terms.
- SQL-injection probes and malformed-input fuzzing.
- Prompt-injection fixtures that attempt to force covenant/approval changes.
- CORS denial and expired/revoked session tests on the deployed stack.
- Secret scanning in CI and log-redaction review.
- Concurrent approval stress (two managers, same run).
- Audit-tamper fixture (altered payload, metadata, hash, signature).
- Proof-mutation fixture (changed threshold, changed witness, swapped artifact).
- Production-mode shred denial and demo-mode shred/chain-verify test.
- Kite duplicate-payment and reconciliation policy test; no live payment without exact authority.
- Render/Vercel deployed preview E2E with the exact URLs and commit recorded.

## Gate

All unit/integration tests pass, critical E2E flows pass on the deployed preview, no unresolved critical/high security issue, no secrets or real data exposed, and all provider statuses are accurate. Final visual refinement starts only after the gate.

Do not document an unrun test as passing. Record exact commands and outcomes in this file and `docs/BUILD_LOG.md`.
