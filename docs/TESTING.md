# Testing Strategy and Verified Evidence

## Current automated suites

| Suite | Command | Result (20 Nov 2026) |
|---|---|---|
| Lint | `pnpm lint` | Passed |
| Root typecheck | `pnpm typecheck` | Passed (10 packages + apps) |
| Root unit tests | `pnpm test` | 100 passed, 1 skipped: domain 28, crypto 4, contracts 6, document 8, proof 3, reppo 8, AI 10, financial-data 8, payments 16, API 9 |
| Root build | `pnpm build` | Passed (all 10 packages + API + web) |
| Playwright shell + authenticated workspace | `pnpm test:e2e` | 20/20 desktop + mobile (previous release); Arc evidence flows exercised separately with the demo analyst |
| Dependency audit | `pnpm audit` | 0 critical/high; 1 moderate dev-only esbuild; 1 low elliptic |
| Secret scan | Gitleaks + `scripts/check-secrets.sh` | Clean of real secrets |

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
- settings showing the current role and sign-out boundary;
- logo/favicon and the real Reppo evaluation verdict (COMPLETED, score 98, accept, low, review).

## Unit coverage

- Deterministic Decimal engine: exact predicate, headroom, floor/ceil stress rules, ineligible add-back rejection, zero/negative EBITDA rejection, currency mismatch.
- Independent BigInt verifier: rounded 8-dp ratio match, classification match, dependency/formula staleness.
- Approval policy: role, maker-checker, payload/dependency invalidation, expiry and reason rules.
- Arc spending policy: provider, endpoint, network, asset, recipient, per-tx cap, total budget, expiry, scheme, idempotency conflict, duplicate payment, duplicate nonce and invalid amount.
- Arc provider: SDK/config verification, safe serialisation (no key), quote parsing, resource mismatch, signing/header shape against a local mock x402 server, receipt confirmation, missing receipt, timeout/no blind retry, duplicate-payment and insufficient-balance handling.
- Financial data: SEC EDGAR annual fact selection, provenance/content hash, unknown ticker, missing fiscal period, malformed response, rate limit, unavailable provider; Financial Datasets Base-mainnet incompatibility; LoneStar Oracle Arc-mainnet policy restriction; deterministic private-company/public-company evidence planning.
- Payment runtime config: default-disabled, complete bounded session, wrong network/token fail-closed, empty optional values.
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

## Final Phase 9 verification

- Cross-tenant IDOR matrix: second organization/user; borrower, facility, document, preview, run, report, redaction, proof, audit events and audit verify all `404`; approval `404`; shred `403`.
- Session tests: malformed cookie `401`, expired token `401`, disabled profile `401`, expired full cookie `401`.
- Prompt-injection fixture: injected instruction to set 9999 bps ignored; extracted `32500` with page-2 quote evidence; SERV `ANALYST_REVIEW_REQUIRED`.
- Proof mutation: stored `pi_a[0]` changed to `1`; `/proof/verify` `422`, run `PROOF_FAILED`, approval `409`.
- Log redaction: forced `ATTESTATION_FAILED`; grep for marker/email/account/figure/reference/borrower name/token-map was clean.
- Dependency/secret scans: `pnpm audit` 0 high/critical (1 moderate dev-only esbuild, 1 low elliptic); Gitleaks worktree/history clean of real secrets; `scripts/check-secrets.sh` passes.
- XSS/SQL-injection probes, audit-tamper fixture, concurrent approval, CORS denial and demo-shred tests passed in earlier phases.
- Arc live payment and SEC live retrieval suites are **skipped** unless credentials/funding and a compatible merchant are supplied. The mock-x402 tests are explicitly mocks and do not claim settlement. No live-payment success or live SEC result is claimed from this host.
- Deployed production smoke: `/`, `/login`, logo/favicon/OG/manifest, authenticated workspace routes, `/v1/me`, `/v1/integrations/status` and API health all pass at `https://assay-omega-gray.vercel.app` / `https://assay-api-7hy0.onrender.com`.

## Gate

All unit/integration tests pass (100 passed, 1 skipped live-payment suite), the production build passes, the deployed payment-update smoke test passes, no unresolved critical/high security issue remains, and no secret or real data is exposed. The payment update is deployed with execution disabled and was verified with analyst sign-in, the Arc status page and a real policy rejection. Playwright 20/20 was the previous release gate; the local and deployed Arc evidence flows were exercised with the demo analyst. The live Arc payment and live SEC suites remain skipped/blocked as documented; they are not claimed passing.

Do not document an unrun test as passing. Record exact commands and outcomes in this file and `docs/BUILD_LOG.md`.
