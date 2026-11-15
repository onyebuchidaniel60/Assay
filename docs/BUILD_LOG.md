# Assay — Build Log

## 15 November 2026 — Blueprint handoff initialized

- **Status:** No application code implemented in this package.
- **Current phase:** Phase 0 — Operator Intake / Readiness pending.
- **Preview URL:** None.
- **Commit:** None.
- **Reference image:** Not supplied; critical blocker.
- **Provider access:** SERV, NEAR AI, OpenRouter, Reppo and Kite credentials/terms require intake verification. Kite/Reppo remain optional until authorized.
- **Hosting:** target Vercel frontend, Render API/Presidio, Supabase Postgres/Auth/Storage. No Railway.
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
- **Critical blockers:** Tier A scope not confirmed; UI reference missing with no generation authorization; NEAR AI/OpenRouter/SERV keys, credits and live validation absent; Supabase project/keys/bucket absent; Render access absent; Vercel preview permission absent; budget remains `$0` new spend.
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
- **Release boundary:** an automatically triggered Production build appeared in Vercel after a push; it was removed with `vercel remove` to honor the Phase 5/9 release gate. No production deployment is claimed.
- **Blocker:** Phase 2 provider/database credentials are absent from `.env.local` (only Kite keys present). See `OPERATOR_INTAKE.md` §0.7 and `AI_HANDOFF.md`. No live provider/database/auth work can be honestly completed until they are restored.
- **Next exact task:** restore credentials and confirm auth/storage provider; run Phase 2 migrations/auth/storage/audit/PII foundations; then Phase 3 adapters.

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
