# Assay — AI Handoff / Build State

**Status:** Phases 1–6 implemented; authenticated preview deployed to Vercel with Render API/Presidio and Neon; demo video rendered and inspected. Residual Phase 9 checks are documented before any production release claim.  
**Repository:** `https://github.com/onyebuchidaniel60/Assay` — public, default branch `main`.  
**Preview URL:** `https://assay-uhhh2.vercel.app` — protected, authenticated Phase 5 preview backed by the Render API. Legacy `https://assay-guyo5yh6z-uhhh2.vercel.app` points to the earlier deployment.
**Render API:** `https://assay-api-7hy0.onrender.com`. **Render Presidio:** `https://assay-presidio.onrender.com`.  
**Production release authority:** Authorized by the operator, but release remains gated on the full Phase 5/9 test and security matrix. No production deployment is claimed.  
**Data boundary:** Synthetic data only; no real borrower, lender or production records.  
**New spend authority:** `$0` beyond existing NEAR AI and SERV credits.

## Phase 1 — complete

- pnpm workspace with apps/web, apps/api, packages/domain, contracts, proof, plus Phase 2/3 packages crypto, storage, db, document, ai.
- Next.js 16.4.6 / React 19 / Tailwind 4 responsive shell; Fastify health foundation; CI; Vercel protected preview; shell Playwright tests.

## Phase 2 — complete

- Neon PostgreSQL 18.7, managed Better Auth, private S3-compatible bucket `assay-private-documents`.
- Envelope encryption, per-borrower wrapped DEK, keyed document HMAC.
- Per-borrower Ed25519-signed audit chain with row-locked sequence.
- Postgres jobs queue with `FOR UPDATE SKIP LOCKED`, leases, retry/dead-letter.
- `REDUCED_PII_MODE` Presidio service (`en_core_web_sm` + custom financial recognizers, ~176 MB RSS).
- Supabase fully removed. Render deferred to Phase 5 (Option B). Live provider connectivity and model/attestation checks recorded.

## Phase 3 — complete

- Canonical schema realigned to `MASTER_BLUEPRINT.md` §7: borrowers, borrower keys, facilities, documents, analysis runs, covenant terms, sealed financial inputs, scenario results, proof artifacts, approvals, redaction revisions, extraction runs, feedback/Reppo evaluations, per-borrower audit events/heads, jobs, idempotency records. Roles are `ANALYST | MANAGER | AUDITOR | ADMIN`.
- Full Fastify domain/API surface: borrower/facility CRUD; encrypted upload with PDF/TXT magic-byte, 10 MiB, 40-page and scanned-PDF rejection; in-memory preview; run create/list/detail; redaction read/review; asynchronous extraction; terms review; financial inputs with deterministic add-back caps; calculation + independent BigInt verifier + SERV gate; fixed-circuit proof; role-shaped reports; manager approval queue/decision; cancellation; audit read/verify/payload; feedback; integration status; Reppo disabled; Kite local policy → provider-blocked; demo shred.
- NEAR AI extraction is attested per request: exact model, `verifiable`/`attestationSupported`, fresh 32-byte nonce, Intel TDX via `@phala/dcap-qvl`, NVIDIA NRAS, signer/nonce binding, response ECDSA signature, request/response hashes, compose-manager quote. Failure blocks terms.
- Extraction runs as a background Postgres job (`analysis.extract`), returning `202`; parse also runs as `analysis.parse`.
- Proof generation runs in a one-shot child process; witness is passed over stdin and never persisted. Server checks public signals `["1","35000"]` before storing a verified artifact.

## Phase 4 — complete

- Authenticated API-backed UI: dashboard, borrowers list/detail/new, facilities list/detail, document preview, analysis run list/detail, approvals queue/decision, audit timeline/verify, covenant register, exception cases derived from immutable run state, integrations, settings/sign-out.
- Role-shaped analyst/manager/auditor views; manager view excludes raw amounts, names, agreement text and token map.
- Loading/empty/error/forbidden states, auto-refresh during background jobs, responsive desktop/mobile layouts, keyboard-focus styles, no fake provider success.
- Document preview, redaction review, terms confirmation, financial attestation, calculation, proof, approval and cancellation all call real APIs.

## Verified evidence

| Check | Result |
|---|---|
| `psql "$DATABASE_URL" -c "select version();"` | PostgreSQL 18.7 |
| `curl "$NEON_AUTH_BASE_URL/ok"` | HTTP 200 |
| `aws s3 ls --endpoint-url "$AWS_ENDPOINT_URL_S3"` | `assay-private-documents` |
| NEAR AI model list | `z-ai/glm-5.3-flash`, `verifiable=true`, `attestationSupported=true` |
| NEAR AI attested live call | TDX `UpToDate`, NRAS true, signature + nonce + hashes verified |
| OpenRouter live call | exact `openai/gpt-4o-mini` |
| SERV live call | exact `serv-standard` |
| Storage healthcheck | put/read/head/presign/delete pass |
| Audit chain | `VALID`, 13 events, signatures verified |
| Parse/redaction | 4-page PDF, 7 entities, covenant clause preserved |
| Full workflow BOR-004 | 3.0660x compliant → proof `VERIFIED` → manager `APPROVED` |
| Stressed BOR-005 | baseline 3.475x; stress 3.861x/3.823x breached; no-ack 422; acknowledged approve 201 |
| Root typecheck/build | Passed |
| Unit tests | domain 18/18, crypto 4/4, contracts 6/6, document 8/8, proof 3/3, AI 10/10, API 4/4 |
| Playwright | 18/18 desktop + mobile |
| Kite | Testnet session active; payment path provider-blocked; no retry; no receipt claimed |
| Public signup | Disabled at the auth service; direct probe returned `400 EMAIL_PASSWORD_SIGN_UP_DISABLED` |
| Reppo | Disabled; no synthetic-feedback contract enabled |

## Current data state (synthetic demo)

- Organizations: `Assay Demo Credit Partners` (`00000000-0000-4000-8000-000000000001`).
- Demo staff: `analyst@assay.test` (Maya Chen, ANALYST), `manager@assay.test` (Jon Bell, MANAGER), `auditor@assay.test` (Priya Raman, AUDITOR). Credentials live only in `/root/assay-secrets/demo-users.env`.
- Borrowers BOR-004 and BOR-005 exist. Both runs are manager-approved; BOR-004 baseline and stress cases compliant; BOR-005 baseline compliant with two acknowledged stress breaches.
- Old BOR-001/2/3 test runs were deleted before the final schema/workflow checks. No real data was involved.

## Phase 5 — deployed preview verified

- Render API and Presidio are live; exact URLs are above. Environment-variable names are recorded in `docs/BUILD_LOG.md`; values remain in the Render secret store and `.env.local`.
- Vercel preview `https://assay-uhhh2.vercel.app` is protected and authenticated; it reads the Render API server-side with the Neon Auth cookie.
- Deployed checks passed: sign-in/session, real runs in the UI, 401/403 role boundaries, manager DTO without raw amounts, upload magic-byte rejection, Kite over-cap/provider-blocked, demo-shred denial, CORS denial, audit tamper `VALID → INVALID → VALID`, concurrent approval `201 + 409`.
- Public sign-up is disabled at Neon Auth.
- Known latency: attested extraction is background and can take 75 s–4.5 min under provider load; the UI auto-refreshes.

## Phase 6 — complete

- `stageshow` installed successfully but applied only as craft guidance; faux UI/mock cursor compositions were rejected because they conflict with the real-action rule. Deviation recorded.
- UI refined: live status, attestation panel, correct audit actor names, role-shaped screens, accessible empty/error/denied states, no inert primary controls.
- Demo video: `artifacts/demo/assay-demo.mp4` — 113.5 s, 1080p/30 fps, real Playwright capture, local free `espeak-ng` narration, burned captions. Script, narration, captions and production notes are under `artifacts/demo/`. The real manager approval of BOR-013 is captured.
- Final demo data: BOR-004/005/006/013 approved; failed test borrowers removed. No real data.

## Verified hardening

- Unauthenticated 401; analyst/auditor/manager role boundaries; manager DTO excludes raw amounts.
- Upload magic-byte, page, scan and size validation; Kite over-cap 422 and provider-blocked 503; demo-shred denial.
- Audit tamper `VALID → INVALID → VALID`; concurrent approval one `201`, one `409`.
- XSS probe escaped; SQL-injection probe rejected 422; secret scan clean; CI secret-hygiene step added.
- Public signup disabled (`400 EMAIL_PASSWORD_SIGN_UP_DISABLED`).

## Residual Phase 9 checks before production

1. Proof-mutation test on a fresh pending run (altered threshold/witness/artifact must block approval).
2. Full cross-tenant IDOR matrix with a second organization/membership.
3. Token expiry/revocation and CORS/browser matrix on the final deployed commit.
4. Prompt-injection fixture against extraction (document text must not alter schema/policy).
5. Log-redaction review under provider failures.
6. Kite duplicate-payment/reconciliation policy test; no live payment without exact authority.
7. Production-mode shred denial and final secret scan on the release commit.

## Next exact task

Re-run the full typecheck/test/build and Playwright suites on the final commit; push; redeploy the protected preview; record the final commit/URL here and in `docs/DEPLOYMENT.md`. Do not claim production release until the residual Phase 9 checks above pass.

## Authorization boundaries

- Synthetic data only; no public signup.
- No Kite wallet spend beyond the approved testnet session; payment path is provider-blocked and must not be retried.
- No production deployment claim until the full gate passes.
- Never fabricate provider output, receipts, attestation or verification results.
- Do not expose secrets. `.env.local`, `.kite-passport/` and `/root/assay-secrets/` are outside Git.
