# Assay — Build Log

## 15 November 2026 — Blueprint handoff initialized

- **Status:** No application code implemented in this package.
- **Current phase:** Phase 0 — Operator Intake / Readiness pending.
- **Preview URL:** None.
- **Commit:** None.
- **Reference image:** Not supplied; critical blocker.
- **Provider access:** SERV, NEAR AI, OpenRouter, Reppo and Kite credentials/terms require intake verification. Kite/Reppo remain optional until authorized.
- **Hosting:** target Vercel frontend, Render API/Presidio, Neon Postgres/Auth/Storage. No Railway.
- **Production authority:** not granted.
- **Budget:** no new spend by default; stop before any paid tier/top-up/payment.
- **Tests:** none yet; do not claim passes.
- **Next:** complete consolidated operator intake, verify reference image and credentials/access, then execute Phase 1.

## 15 November 2026 — Phase 0 intake and readiness inspection

- **Phase:** 0 — Operator Intake / Readiness.
- **Baseline commit:** `6a90b02eb9c7363bddd22238ce2689de94f2aafd` (`source docs`), branch `main`, clean working tree.
- **Repository state:** public repo; `origin` reachable; write access verified with `git push --dry-run origin main` → `Everything up-to-date`; no branch protection; no application code, manifests, migrations, tests, CI, deploy configuration, `.env` files or old product files.
- **Read:** `AGENTS.md`, `MASTER_BLUEPRINT.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `DEMO_VIDEO_PLAN.md`, `AI_HANDOFF.md` and all files under `docs/`.
- **Provider revision applied:** Dolphin removed/rejected because its confidentiality mechanism is unverified (no TEE, no MPC, zero-retention unverified). NEAR AI Cloud is Layer 2 extraction; OpenRouter is general inference; SERV orchestrates both. No Dolphin adapter, endpoint, model or environment variable will be implemented.
- **Catalog probes:**
  - `GET https://cloud-api.near.ai/v1/model/list` → HTTP 200; 64 models; 14 text-output models report both `verifiable: true` and `attestationSupported: true`.
  - `GET https://openrouter.ai/api/v1/models` → HTTP 200; 470 models.
  - `GET https://inference-api.openserv.ai/v1/models` without a key → HTTP 401 `Missing or invalid API key`, confirming the endpoint responds.
- **Proposed provider configuration (pending operator confirmation):**
  - NEAR AI extraction: `z-ai/glm-5.3-flash` (TEE-verifiable metadata, structured outputs, 1M context).
  - OpenRouter judgement: `openai/gpt-5.4-mini`; generation: `deepseek/deepseek-v3.2`.
- **Vercel:** CLI 65.8.0 authenticated as `onyebuchidaniel60-1034`; team `uhhh2` (Hobby); no Assay project; preview permission not explicitly granted.
- **Presidio blocker:** resolved by design. `REDUCED_PII_MODE` uses Presidio Analyzer with the small spaCy model plus deterministic custom financial recognizers; full `en_core_web_lg` is not deployed on Render free 512 MB; no paid upgrade. Phase 2 must validate RSS and use the deterministic recognizer-only fallback under the same label if needed.
- **Critical blockers:** Tier A scope not confirmed; UI reference missing with no generation authorization; NEAR AI/OpenRouter/SERV keys, credits and live validation absent; Neon project/keys/bucket absent; Render access absent; Vercel preview permission absent; budget remains `$0` new spend.
- **Optional integrations:** Reppo disabled; Kite disabled with `$0` spend cap; Google TTS not configured.
- **Tests:** no application tests exist; no pass claimed. The only executed checks are read-only Git, CLI, DNS/HTTP and environment-name checks.
- **Preview URL:** none. **Deployed commit:** none.
- **Reference/skill status:** no reference image; `stageshow` skill not attempted (Phase 6 only).
- **Docs updated:** `OPERATOR_INTAKE.md`, `AI_HANDOFF.md`, `docs/BUILD_LOG.md`, `docs/RESEARCH_NOTES.md`, `docs/INTEGRATIONS.md`, `docs/CONFIGURATION.md`, and provider references in the source-of-truth docs.
- **Authorization boundary:** no application code, monorepo scaffold, deployment, paid provisioning or production action. Stop before Phase 1.
- **Next exact task:** operator resolves `OPERATOR_INTAKE.md` §4; then Phase 1 shell and safe preview.

## 15 November 2026 — Kite Passport CLI and skills setup

- **Phase:** Phase 0 extension — Kite Passport / x402 setup (operator-authorized).
- **kpass:** `6.13.5` (minimum required `6.8.9`; passed).
- **Bundle:** `114`; **skills package:** `3.6.11`.
- **Installed paths:** `~/.kpass/bin/kpass`, `~/.kpass/bin/ksearch`.
- **Skills installed for OpenCode:** `authenticate-user`, `request-session`, `form-session-delegation`, `x402-execute`, `wallet-send`, `manage-agents` under `~/.agents/skills/`.
- **Account state:** no Kite account created yet; no funds moved; no session created; no payment made.
- **Browser login probe:** `kpass login --output json` returned exit `9` — `No browser can be opened here (ssh)`. The CLI documents the email-code fallback. Awaiting operator email address for `kpass login init`.
- **Next:** human gate #1 — operator supplies the Passport email; complete the email-code login, then verify authentication before faucet/session steps.
- **Safety:** no secret values, codes, wallet material or session credentials recorded.

### Kite setup pause — testnet authentication gate

- **Production Passport authentication:** success for `onyebuchidaniel60@gmail.com`; user ID `user_01a1df77-dc2c-7901-8f21-a9b3942578fc`; production session active.
- **Production faucet:** `kpass faucet drop --token PIEUSD` returned exit 2: `Faucet is only available on staging/testnet environments. It is disabled on production.`
- **Testnet backend:** `https://passport.dev.gokite.ai` is healthy (`backend_env: dev`) but has no valid user session; the production JWT is rejected there.
- **Testnet email-code attempts:** two codes were requested; both returned `code_expired` because the operator gate exceeded the code TTL before verification. No code values were recorded.
- **Wallet:** not funded. **Session:** not created. **Payment:** none.
- **Decision:** stopped at the human gate per the 10-minute rule; no alternative faucet, asset substitution or bypass attempted.
- **Next exact action:** operator must be available to complete a fresh testnet email code within its 10-minute TTL, or provide an authorized browser/passkey path for the testnet login.

### Kite testnet session and smoke-test outcome

- **Testnet user_id:** `user_01a1dfab-06b7-7b42-b03c-111a2805c175` (separate from production user `user_01a1df77-dc2c-7901-8f21-a9b3942578fc`).
- **Wallet before faucet:** `0 PIEUSD` on Kite testnet; after faucet: `100 PIEUSD` (tx `0xdc7b6c16bd67bc84c4f524d6c169d9d5ff69328a29a681b4e8c0fb9ceb708d71`).
- **Session ID:** `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`.
- **Session policy:** `5 PIEUSD` per transaction, `20 PIEUSD` total, `24h` TTL; asset `PIEUSD`; expiry `2026-11-16T15:11:32.17177Z`; status `active`.
- **First approved session:** `agent_session_01a1dfbc-d772-7e39-bf11-2ca1c9f9ebd3` also exists remotely but was not usable locally because the runtime key/agent state was created afterwards. It was not used for a payment.
- **Test x402 call (first attempt):** one POST to `https://passport.dev.gokite.ai/x402/test` with idempotency key `assay-kite-smoke-1457e791-3c4f-45f9-ade5-16e0749b117c` returned exit `1` with `internal error` / `status: error`. No receipt was returned.
- **Reconciliation before retry:** `kpass activity --limit 20` showed only the session approvals and agent registration; no payment event. Both sessions showed `spent_total: 0`. No charge was evidenced.
- **Bounded retry:** the exact same call with the same idempotency key was retried once at `2026-11-15T15:29:37Z` and returned the same `internal error` / exit `1`. No third retry was attempted. The payment path is recorded as **provider-blocked**.
- **Over-cap policy test:** the test merchant is fixed at `0.1 PIEUSD`, so a temporary `0.05 PIEUSD` per-transaction session was approved solely to exercise the deterministic cap:
  - Session: `agent_session_01a1dfdd-9882-72d5-8a12-2f98a11e9a14` (0.05 per tx / 0.05 total, 1h).
  - Request: POST `https://passport.dev.gokite.ai/x402/test` with idempotency key `assay-kite-overcap-3bf8d944-88dd-4bdd-9f5b-288a3bbd05b3`.
  - Result: exit `6`, `error_code: "session_rule_exceeded"`, `error: "payment amount exceeds max_amount_per_tx"`.
  - `activity` showed no payment event and the test session remained at `spent_total: 0`; rejection occurred before payment.
- **Primary session restored:** `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf` is current again with 5 PIEUSD per tx / 20 PIEUSD total / 24h; the 0.05 test session is not to be used by the adapter.
- **Decision:** the payment smoke test is provider-blocked, but the session, funding, cap enforcement and policy rejection are verified. Do not retry the payment again without a provider change or new operator instruction.
- **Phase 3 adapter statement:** when the Phase 3 adapter is built, it will use the active session `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf` and enforce the 5 PIEUSD per-tx / 20 PIEUSD total caps in Assay's deterministic policy engine before any payment call. The adapter is not built yet because the monorepo/Phase 1 foundation does not exist; the provider-blocked test does not authorize bypassing the Phase 0/Phase 1 gates.
- **Next exact action:** proceed with Phase 0/Phase 1 foundation when the outstanding critical inputs are resolved; then implement the Kite adapter against the active session with policy checks and honest provider failure states.

## 15 November 2026 — Phase 1 foundation and Vercel shell preview

- **Phase:** 1 — repository/platform foundation + early skeletal UI.
- **Commit:** `5deaa51491e322f5f5fe82b389a7b66206aad126` — `feat: establish app shell and preview deployment`.
- **Preview URL:** `https://assay-guyo5yh6z-uhhh2.vercel.app` (Vercel Authentication protected).
- **Deployment evidence:** `vercel curl` returned the expected titles for `/`, `/dashboard`, `/facilities/demo`, `/integrations` and `/audit`.
- **Workspace:** pnpm 10.34.5; Node.js 24.22.1; Next.js 16.4.6 + React 19.3.1 + Tailwind CSS 4.3.5; Fastify 5.12.8 + Zod 4.6.7.
- **Implemented:** landing, login preview, dashboard, borrowers, borrower creation shell, facilities, facility detail, covenants, covenant detail, analysis queue, assessment detail, cases, case detail, approvals, audit fixture, integrations, settings, forbidden and not-found routes.
- **UI behavior:** responsive sidebar/mobile drawer, skip link, semantic headings, visible focus, actual/forecast status separation, synthetic-data labels and labelled Phase 1 placeholders. No inert control is presented as live.
- **API behavior:** `/health/live` 200; `/health/ready` 503/degraded without `DATABASE_URL`; safe 401/404 envelopes; CORS allowlist; Pino redaction.
- **Commands and results:**
  - `pnpm install` → passed.
  - `pnpm typecheck` → passed.
  - `pnpm test` → passed; API 4/4 tests; web no test files.
  - `pnpm build` → passed; Next.js built 16 routes.
  - `pnpm --filter @assay/web exec playwright test` → 10/10 passed (desktop + mobile).
- **Reference:** operator-supplied `design/reference/assayref1–4.avif`; inspected and recorded in `REFERENCE_ASSETS.md`. Images remain untracked pending license text; not copied into UI.
- **Release boundary:** unverified Production deployments appeared in Vercel during Phase 1 (CLI/Git trigger). They were removed with `vercel remove` to honor the Phase 5/9 gate. The Vercel Git link was disconnected to prevent further automatic production deploys; manual CLI preview deployments remain possible. The remaining deployment is the protected Preview `https://assay-guyo5yh6z-uhhh2.vercel.app`. No production deployment is claimed.
- **Blocker:** Phase 2 provider/database credentials are absent from `.env.local` (only Kite keys present). See `OPERATOR_INTAKE.md` §0.7 and `AI_HANDOFF.md`. No live provider/database/auth work can be honestly completed until they are restored.
- **Next exact task:** restore credentials and confirm auth/storage provider; run Phase 2 migrations/auth/storage/audit/PII foundations; then Phase 3 adapters.

## 15 November 2026 — Phase 3 unblocked domain core

- **Phase:** 3 partial — deterministic domain core and shared contracts (independent of absent database/auth/provider credentials).
- **Packages added:** `packages/domain`, `packages/contracts`.
- **Domain engine:** Decimal.js leverage calculation; exact boundary comparison; eligible add-back enforcement; zero/negative EBITDA rejection; currency/period checks; two sensitivity scenarios; forecast/actual classification separation.
- **Restricted formula AST:** metric/sum/subtract/min/max/divide/cited-constant nodes; depth/node limits; unknown metric and executable-node rejection; division-by-zero rejection.
- **Independent verification:** a separate BigInt reference evaluator recomputes debt/EBITDA/add-backs and the predicate; detects tampered primary results, stale snapshot or formula hashes.
- **Controls:** maker-checker approval with self-approval denial, payload/dependency hash binding, expiry/version checks; append-only canonical audit events with SHA-256 chain and tamper detection.
- **Kite policy:** deterministic per-tx/total/asset/expiry/idempotency checks; 6 PIEUSD over a 5 PIEUSD cap returns `session_rule_exceeded`; total/asset/expiry violations covered.
- **Shared contracts:** strict Zod schemas for borrowers, facilities, recursive formula AST, covenant drafts, financial inputs, assessment/idempotency, approval decisions and Kite session/payment shapes.
- **Proof package:** `packages/proof` adds a self-contained Circom fixed predicate for `debt * 10000 <= adjustedEbitda * thresholdBps`, with 64/32/96-bit range and comparison constraints.
  - `pnpm --filter @assay/proof run compile` → 258 non-linear constraints, 7 linear constraints, 1 public input, 2 private inputs, 1 public output; `leverage.r1cs` and WASM generated.
  - `pnpm --filter @assay/proof run setup` → local development ptau/Groth16 verification key generated (not a production trusted setup).
  - `pnpm --filter @assay/proof run prove` → proof generated and verified; public signals `["1","35000"]` for the 3.20x compliant witness.
  - The build artifacts are ignored under `packages/proof/build/`; the circuit source, scripts and JS predicate are committed.
- **Tests:**
  - `pnpm --filter @assay/domain test` → 18/18 passed.
  - `pnpm --filter @assay/contracts test` → 6/6 passed.
  - `pnpm --filter @assay/proof test` → 3/3 passed.
  - Root `pnpm typecheck` → passed.
  - Root `pnpm test` → passed (domain 18, contracts 6, proof 3, API 4).
  - Root `pnpm build` → passed.
- **Not implemented / not claimed:** database migrations, Neon/Neon auth, private storage, job queue, live NEAR AI/OpenRouter/SERV adapters, Presidio service, ZK proof generation, API route integration and E2E application flows. These require the missing credentials and Phase 2 foundation.
- **Blocker:** `.env.local` still contains only Kite variables; see `OPERATOR_INTAKE.md` §0.7. No live provider/database call was made.
- **Next exact task:** restore credentials and auth/storage choice; implement Phase 2 schema/auth/storage/audit/jobs/PII; then verify NEAR AI attestation and OpenRouter model IDs before adapters.

## 15 November 2026 — Phase 2 data/auth/storage foundation

- **Phase:** 2 — backend/data/auth foundation. Neon is the sole data/auth layer; Supabase references and dependencies are removed.
- **Environment presence (names only):** `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_API_KEY`, `NEON_AUTH_COOKIE_SECRET`, `NEON_STORAGE_BUCKET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEARAI_API_KEY`, `NEARAI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_JUDGEMENT`, `OPENROUTER_MODEL_GENERATION`, `SERV_REASONING_API_KEY`, `SERV_MODEL`, `REPPO_API_KEY`, `RENDER_API_KEY`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64`, `AUDIT_SIGNING_PUBLIC_KEY_BASE64`, `PRESIDIO_SERVICE_TOKEN`, Kite variables. All non-empty; no values printed.
- **Neon connectivity:**
  - `select version()` via `DATABASE_URL` → PostgreSQL 18.7.
  - `NEON_AUTH_BASE_URL/ok` → HTTP 200 `{"ok":true}`.
  - `aws s3 ls --endpoint-url "$AWS_ENDPOINT_URL_S3"` → private bucket `assay-private-documents` listed.
- **Provider checks:**
  - OpenRouter `openai/gpt-4o-mini` and `deepseek/deepseek-v3.2` both found in the catalog; live small request returned the exact judgement model ID.
  - NEAR AI `z-ai/glm-5.3-flash` present with `verifiable=true` and `attestationSupported=true`; live extraction returned the exact model ID and valid JSON.
  - NEAR AI official verifier: Intel TDX quote verified, NVIDIA NRAS verdict true, nonce binding true, gateway/model compose hashes matched; evidence report SHA-256 `ccbcd0be6d83bd688f8b58559275fd117101fcda50daa356a0650066fd71536c` (client nonce `ed9047ec…51e6`). Chat verifier also verified provider TEE attestation.
  - SERV `gpt-5.4-mini` returned a versioned alias (`gpt-5.4-mini-2026-03-17`) and was not accepted; switched to catalog model `serv-standard`, which returns the exact configured ID and completed a live call.
- **Database:** Drizzle schema with 24 tables and enums; migration `0000_melted_sabretooth.sql` applied. Tables include organizations, profiles, memberships, invitations, borrowers, facilities, documents/versions, extraction runs, covenant definitions/versions, financial evidence, assessments, verification runs, scenarios, cases/notes, memo drafts, approvals/decisions, signed audit events/heads, idempotency and jobs.
- **Auth:** `@neon/auth` managed Better Auth wired in the Next.js app (`/api/auth/[...path]`, login server action, proxy protection) and Fastify session validation (`/v1/me`, role/org resolution). Verified analyst sign-in and session; unauth `/v1/me` 401; analyst audit verify 403; manager audit verify `VALID`.
- **Storage:** `packages/storage` uses AWS SDK with `forcePathStyle=true` and `requestChecksumCalculation="WHEN_REQUIRED"`. Real private bucket put/read/head/presign/delete healthcheck passed.
- **Encryption:** `packages/crypto` implements per-borrower AES-256-GCM DEK wrapping under `DATA_KEK_BASE64`, document byte encryption and Ed25519 audit signing. 4/4 tests pass, including tamper failure.
- **Audit:** DB-backed append-only audit events with row-locked per-org sequence, SHA-256 chain and Ed25519 signature. Appended and verified a synthetic event; chain `VALID`.
- **Jobs:** Postgres `jobs` table, idempotent enqueue, `FOR UPDATE SKIP LOCKED` claim, lease/reclaim, retry/dead-letter fields. Worker loop in the API completed a `healthcheck` job (status `SUCCEEDED`).
- **Presidio:** Python FastAPI `REDUCED_PII_MODE` service with `en_core_web_sm` + custom reference/account/email recognizers. `/health` and `/tokenize` verified; Organization, reference, account and full email tokenized. Measured RSS ≈ 176 MB, below the 512 MB Render free-tier limit.
- **Supabase removal:** no `SUPABASE_*` variables in `.env.example`/config, no `@supabase/*` dependency, no Supabase references in code or docs. Neon is the sole data layer; private object storage is S3-compatible.
- **Render decision:** Option B recorded — defer Render deployment to Phase 5; Phases 2–4 run the API locally against Neon.
- **Invite-only signup:** `neon_auth.project_config.email_and_password.disableSignUp` is now `true`; a direct sign-up probe returned HTTP `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`. Demo identities were provisioned before this change. Public registration is absent.
- **Tests:** root typecheck/build pass; domain 18/18, contracts 6/6, proof 3/3, API 4/4; Playwright shell 10/10 with authenticated demo users.
- **Preview:** Phase 1 preview remains the protected shell; it is not yet the Phase 2 authenticated preview. Production remains gated.
- **Next exact task:** implement Phase 3 domain/API routes: borrower/facility CRUD, document upload/parse/redaction, NEAR AI extraction with attestation, OpenRouter/SERV reasoning, covenant review, evidence confirmation, assessment/verification, case/memo/approval and audit APIs; then Phase 4 UI wiring.

## 15 November 2026 — Phase 3 canonical schema, domain/API and Phase 4 authenticated UI

- **Phase:** 3 — domain/API workflow, followed by Phase 4 — authenticated UI integration.
- **Schema realignment:** the provisional Phase 2 schema was superseded before further routes were built. The canonical `MASTER_BLUEPRINT.md` §7 model is now applied in migration `0000_windy_fat_cobra.sql`: borrowers, borrower keys, facilities, documents, analysis runs, covenant terms, sealed financial inputs, scenario results, proof artifacts, approvals, redaction revisions, extraction runs, feedback/Reppo evaluations, per-borrower audit events/heads, jobs and idempotency records. Roles aligned to `ANALYST | MANAGER | AUDITOR | ADMIN`. No real or production data was present or lost.
- **Provider adapters:** `packages/ai` now wraps NEAR AI, OpenRouter and SERV with exact-model checks. `NearAIClient.attestedExtraction()` asserts `verifiable=true` + `attestationSupported=true`, fetches a fresh report with a 32-byte nonce, verifies Intel TDX via `@phala/dcap-qvl`, verifies NVIDIA NRAS, binds the report data to the response signer + nonce, verifies the response ECDSA signature and the signed request/response hashes, and checks the compose-manager quote. 10/10 mocked tests pass; a live call returned `verified=true`, TDX `UpToDate`, NRAS true, 7.6 s.
- **Document/redaction layer:** `packages/document` validates PDF/TXT magic bytes, 10 MiB and 40-page caps, rejects scanned/no-text and encrypted PDFs, parses page text, and implements reduced-PII Presidio analysis with generic-word filtering. 8/8 tests pass. A synthetic 4-page PDF produced 7 stable redaction entities while preserving the covenant clause.
- **Encryption/audit:** per-borrower AES-256-GCM DEK, wrapped by `DATA_KEK_BASE64`; keyed document HMAC; sealed financial/scenario/redaction/audit payloads; Ed25519 signatures over a per-borrower SHA-256 chain with row locking. Audit verification recomputes the chain and every signature without decrypting payloads.
- **Jobs:** `analysis.parse` and `analysis.extract` run through the Postgres `FOR UPDATE SKIP LOCKED` worker. Extraction returns `202`; the worker performs the provider/attestation/SERV gate and transitions `TERMS_REVIEW` or a visible `FAILED`. Live background extraction completed in ~75 s.
- **Workflow verification (synthetic BOR-004):** borrower → facility → encrypted upload → parse/redaction → redaction confirm → attested extraction (threshold 35,000 bps; 6 verified evidence quotes; SERV `ANALYST_REVIEW_REQUIRED`) → terms confirm → attested financial inputs ($32.5m debt, $10m EBITDA, $600k add-backs; hash `801596dc…`) → deterministic calculation (3.0660x, compliant; both stress cases compliant; SERV `CONFIRMED`) → proof `VERIFIED` with public signals `["1","35000"]` → manager approval at analysis version 11 → `APPROVED`. Analyst approval was rejected 403; duplicate approval 409; manager and auditor reports were role-shaped; per-borrower audit chain verified `VALID` with 13 events.
- **Stressed-breach verification (synthetic BOR-005):** baseline 3.475x compliant; EBITDA-down 3.861x and debt-up 3.823x breached. Manager approval without acknowledgement returned `422 RISK_ACKNOWLEDGEMENT_REQUIRED`; with acknowledgement + rationale it returned `201 APPROVE`.
- **API surface:** borrower/facility CRUD, document upload/preview, run create/list/detail, redaction read/review, extraction enqueue, terms review, financial inputs, calculation, proof request/read, role-shaped report, approval queue/decision, cancel, audit events/verify/payload, feedback, integration status, Reppo disabled, Kite local policy check → provider-blocked, demo shred. Tenant scoping, typed Zod contracts, row locks, state-version checks and idempotency are enforced server-side.
- **UI:** replaced static pages with authenticated API-backed pages for dashboard, borrowers list/detail/new, facilities list/detail, document preview, analysis run list/detail, approvals, audit, covenants, cases (derived from immutable run state), integrations and settings. Loading/empty/error/forbidden states, automatic refresh for background jobs, role-shaped views, responsive layouts and keyboard-focus styles are present. No fake provider success or inert primary controls.
- **Invite-only signup:** `neon_auth.project_config.email_and_password.disableSignUp` is now `true`; a direct sign-up probe returned HTTP `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`. Demo identities were provisioned before this change. Public registration is absent.
- **Tests:** root typecheck/build pass; domain 18/18, crypto 4/4, contracts 6/6, document 8/8, proof 3/3, AI 10/10, API 4/4; Playwright 18/18 across desktop and mobile, including real analyst/manager/auditor journeys and audit-chain verification.
- **Preview:** the protected Vercel Phase 1 shell remains online but is not the Phase 4 authenticated preview. Render deployment is deferred to Phase 5 (Option B); the local API runs against Neon.
- **Next exact task:** Phase 5 — deploy the API and Presidio to Render, point the Vercel preview at the API, record the exact URLs/commit, then run the full Phase 5/9 regression and security matrix before Phase 6 visual refinement and the demo video.

## Build log entry template

For every checkpoint add:

- Date/time and phase.
- Commit SHA and commit message.
- Completed work and files changed.
- Exact tests/commands and pass/fail output summary.
- Preview URL and deployed commit.
- Integration statuses (live / sandbox / disabled / fixture) and evidence.
- Security/privacy checks and unresolved issues.
- Reference asset and stageshow status.
- README/docs/demo status.
- Authorization boundary and any blocked work.
- Next exact task.
