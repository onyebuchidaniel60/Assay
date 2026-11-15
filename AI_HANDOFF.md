# Assay — AI Handoff / Build State

**Status:** Phase 1 complete (local shell + Vercel preview). Phase 3 domain core implemented as unblocked work. Phase 2/live integration is blocked by absent provider/database credentials.  
**Current phase:** Phase 1 checkpoint complete; Phase 2 not started.  
**Repository:** `https://github.com/onyebuchidaniel60/Assay` — public, default branch `main`, Phase 1 commit `5deaa51491e322f5f5fe82b389a7b66206aad126`.  
**Preview URL:** `https://assay-guyo5yh6z-uhhh2.vercel.app` (Vercel Authentication protected).  
**Deployed commit:** `5deaa51` — `feat: establish app shell and preview deployment`.  
**Production release authority:** Authorized by operator, but production release remains gated on the full Phase 5/9 test and security matrix. Three unverified Production deployments created during Phase 1 were removed; only the protected Preview remains. No production deployment is claimed.  
**Data boundary:** Synthetic data only; no real borrower, lender or production records.  
**New spend authority:** `$0` beyond existing NEAR AI ($1) and SERV ($1) credits.

## Phase 1 completed

- Created a pnpm workspace with `apps/web` (Next.js 16.4.6, React 19.3.1, Tailwind 4) and `apps/api` (Fastify 5.12.8, Zod).
- Built a responsive, route-complete Next.js shell with:
  - `/` landing page; `/login` preview form; `/dashboard`; `/borrowers`; `/borrowers/new`; `/facilities`; `/facilities/[id]`; `/covenants`; `/covenants/[id]`; `/analysis-runs`; `/analysis-runs/[id]`; `/cases`; `/cases/[id]`; `/approvals`; `/audit`; `/integrations`; `/settings`; `/forbidden`; `/not-found`.
  - Actual and forecast status dimensions visually and textually separated.
  - Labelled Phase 1 placeholders; no inert controls without a disabled reason.
  - Responsive sidebar/mobile drawer, skip link, semantic headings, visible focus and synthetic-data labels.
  - Public GitHub/Documentation footer links only (repository is public).
- Added Fastify health routes:
  - `GET /health/live` → 200.
  - `GET /health/ready` → 503/degraded when `DATABASE_URL` is absent; no false ready claim.
  - Safe 401 and 404 envelopes; CORS allowlist; Pino redaction; no secrets in responses.
- Added `.env.example`, `.gitignore` coverage for `.env*`, `.kite-passport`, and `.vercel`; no secrets committed.
- Added CI for install, typecheck, tests, build and a non-blocking production dependency audit.
- Deployed the shell to Vercel: `https://assay-guyo5yh6z-uhhh2.vercel.app`.
- Verified the deployment with `vercel curl` for `/`, `/dashboard`, `/facilities/demo`, `/integrations` and `/audit`.

## Unblocked Phase 3 domain core completed

- `packages/domain` implements Decimal.js leverage calculation, exact boundary comparison (3.20x/3.50x/3.50000010x/3.70x), eligible add-back enforcement, zero/negative EBITDA rejection, currency/period validation and two sensitivity scenarios.
- Restricted formula AST rejects executable/unknown nodes, uncited constants, depth/node overflow and divide-by-zero.
- A separate BigInt-based reference evaluator recomputes the exact predicate and detects tampered ratios/classifications or stale snapshot/formula hashes.
- Maker-checker approval binds payload and dependency hashes, blocks self-approval, and invalidates on material dependency change.
- Append-only canonical audit events use SHA-256 chaining; tamper detection is tested.
- Kite policy rejects per-tx over-cap (`session_rule_exceeded`), total-budget, asset, expiry and missing-idempotency cases deterministically.
- `packages/contracts` provides strict Zod schemas for borrower/facility, formula AST, covenant drafts, financial inputs, assessments, approvals and Kite sessions/payments.
- `packages/proof` contains the fixed Circom leverage circuit, compile/setup/prove scripts and a JS predicate. The circuit compiled to 258 non-linear and 7 linear constraints; a local development-only Groth16 proof was generated and verified with public signals `["1","35000"]` for 3.20x. This is not a production trusted setup.
- Tests: domain 18/18, contracts 6/6, proof 3/3, API 4/4; root typecheck/build pass.

## Verification evidence

| Command | Result |
|---|---|
| `pnpm install` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed — domain 18/18, contracts 6/6, proof 3/3, API 4/4; web no unit tests (passWithNoTests) |
| `pnpm build` | Passed — Next.js 16 production build, 16 routes; API, domain, contracts and proof checks |
| `pnpm --filter @assay/proof run prove` | Proof generated and verified; public signals `["1","35000"]` (development-only setup) |
| `pnpm --filter @assay/web exec playwright test` | Passed — 10/10 desktop + mobile shell tests |
| `vercel --yes` | Preview deployment ready; URL recorded above |
| `vercel curl <preview>/...` | 200 with expected titles for five routes |

## Critical blocker

`OPERATOR_INTAKE.md` §0.7 records the authorization/credential mismatch. `.env.local` currently contains only the eight Kite variables. The following authorized credentials are absent:

`NEARAI_API_KEY`, `NEARAI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_JUDGEMENT`, `OPENROUTER_MODEL_GENERATION`, `SERV_REASONING_API_KEY`, `SERV_MODEL`, `DATABASE_URL`/`NEON_DATABASE_URL`, `REPPO_API_KEY`, `RENDER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.

Process-environment checks show none of these names. The `.env.local` file was last written during Kite setup; if values were added before that write, they may have been overwritten. Re-add them out-of-band.

**Impact:** Phase 2 database/auth/storage, Phase 3 live provider adapters, the full E2E gate and release cannot be honestly completed. No fixture success is being presented as live.

## Provider and integration status

| Provider | Status | Evidence / boundary |
|---|---|---|
| NEAR AI Cloud | `AUTHORIZED — credential absent` | Public catalog reachable; no key/attestation test |
| OpenRouter | `AUTHORIZED — credential absent` | Public catalog reachable; no Assay-scoped key |
| SERV / OpenServ | `AUTHORIZED — credential absent` | Endpoint reachable; no key/catalog/credit verification |
| Database/Neon | `AUTHORIZED — credential absent` | No connection string; readiness correctly degraded |
| Vercel | `PREVIEW READY` | `https://assay-guyo5yh6z-uhhh2.vercel.app`; protected |
| Render | `AUTHORIZED — credential absent` | No service/account access |
| Presidio | `RESOLVED (DESIGN)` | `REDUCED_PII_MODE`; Phase 2 RSS validation required |
| Reppo | `DISABLED` | Optional; no key; synthetic-only if enabled |
| Kite | `ENABLED (TESTNET) — payment provider-blocked` | Active 5/20 PIEUSD session; over-cap rejection verified; payment endpoint internal error twice |
| Google TTS | `NOT CONFIGURED` | Free-tier check deferred to Phase 8 |

## Authority and defaults

- Synthetic data only; no real borrower or production data.
- No public signup; invite-only staff accounts.
- No Kite wallet spend beyond the approved testnet session; no paid top-up.
- Production release is authorized in principle but blocked until the full test/security matrix passes.
- `ENABLE_DEMO_SHRED=false` except during an explicitly authorized synthetic demo.
- Provider failure must be visible; never fabricate output, receipts or verification.

## Next exact task

1. Re-add the authorized provider/database credentials to `.env.local` out-of-band and confirm the auth/storage choice (Supabase vs Neon).
2. Run Phase 2: Drizzle schema/migrations, auth/RBAC, tenant repositories, private storage, encryption envelope, signed audit chain, job queue, `REDUCED_PII_MODE` PII service and readiness.
3. Verify one NEAR AI attestation call and the OpenRouter model IDs before building adapters.
4. Continue Phase 3–9 autonomously after Phase 2; Phase 5 gate must pass before Phase 6 UI refinement.

## Blocked by

Missing `NEARAI_API_KEY`, `OPENROUTER_API_KEY`, `SERV_REASONING_API_KEY`, database/auth/storage credentials and `RENDER_API_KEY`; architecture confirmation for Supabase vs Neon. No application code was written after the Phase 1 shell because these Phase 2 inputs are indispensable.
