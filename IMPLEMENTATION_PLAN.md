# Assay — Autonomous Implementation Plan

The phases below are internal engineering checkpoints, not human approval gates. After each checkpoint: test, inspect, fix, commit, update `AI_HANDOFF.md` and `docs/BUILD_LOG.md`, then continue automatically.

## Mandatory sequence

**Complete operator intake → early skeletal frontend deployment → core functionality → end-to-end verification → reference-image-led UI implementation → frontend/docs/footer completeness → demo video → final regression and authorized release.**

### Phase 0 — Consolidated Operator Intake / Readiness

Read all handoff files and inspect repository/Git metadata without editing. Fill `OPERATOR_INTAKE.md` in one pass. Apply the authoritative provider revision: Dolphin removed; NEAR AI Cloud for Layer 2 extraction; OpenRouter for structured judgement/generation; SERV orchestration; `REDUCED_PII_MODE` Presidio on the Render free tier. Verify product inputs, missing image references, repository access, accounts, deployment, provider credentials, external permissions, costs, data restrictions, production authority and demo output. Verify endpoint/model and privacy terms for each activated provider. Do not begin implementation while a critical input or required reference image is missing. Optional integrations may remain disabled.

**Commit:** `docs: complete operator intake and readiness`.

### Phase 1 — Repository/platform foundation + early skeletal UI

Create clean pnpm monorepo, route-complete Next.js shell, responsive nav, login and role placeholder screens, Fastify health route, env validation, CI lint/typecheck/build, Vercel frontend preview and Render API placeholder. All unfinished areas must be visibly labelled. Record exact URL and deployed commit.

**Acceptance:** navigable preview, safe test configuration, no production data/secrets.  
**Commit:** `feat: establish app shell and preview deployment`.

### Phase 2 — Backend/data/auth foundation

Create Drizzle schema/migrations, Neon Auth verification, profile roles, private bucket, encryption envelope service, signed audit chain, Postgres job queue/worker, `REDUCED_PII_MODE` Presidio-equivalent service/custom recognizers and readiness health checks.

**Acceptance:** auth/RBAC tests pass; sample file stored as ciphertext; queue survives service restart; audit tamper tests pass.  
**Commit:** `feat: add auth data and security foundations`.

### Phase 3 — Core domain and APIs

Implement borrower/facility, upload/parse/redaction, bounded SERV graph, NEAR AI extraction adapter with TEE attestation verification, OpenRouter judgement/generation routing, covenant term schema/review, financial inputs, deterministic engine/scenarios, Circom/SnarkJS proof, manager approval, audit APIs, Arc Testnet/Circle Gateway payment policy and external financial-evidence linkage. Add Reppo and paid data providers only behind feature flags and only with authorized credentials.

**Acceptance:** API-level MUST HAVE requirements pass; no pretend integration state.  
**Commit:** `feat: implement covenant analysis workflow`.

### Phase 4 — Functional frontend integration

Connect upload, redaction, extraction, terms review, financial entry, calculation, proof, manager review, audit and provider states. Use a consistent temporary visual system. Build every relevant loading/empty/error/denied/success state.

**Acceptance:** primary user journey works through real APIs; no inert controls.  
**Commit:** `feat: connect analyst and manager workflows`.

### Phase 5 — End-to-end functionality gate

Seed deterministic synthetic demo data. Execute analyst and manager journeys, breach/proof failure, role denial, audit verification, provider outage and concurrency tests on the deployed preview. Review logs for raw data/secret leakage. Fix failures and rerun.

**Acceptance:** unit/integration/E2E pass, no unresolved critical/high issue, deployed commit and test evidence recorded. Final UI refinement is blocked until this passes.  
**Commit:** `test: verify primary covenant analysis journeys`.

### Phase 6 — Reference-image-led final UI

Run `npx skills add benjitaylor/skills --skill stageshow`; inspect instructions; inspect supplied reference image(s); implement the actual product UI directly. No mockups or approval cycle. Optional additional UI skills may be used if trustworthy and relevant.

**Acceptance:** visual implementation reflects reference principles, preserves app behavior and accessibility; `docs/DESIGN_NOTES.md` updated.  
**Commit:** `feat: implement reference-led product interface`.

### Phase 7 — Frontend and documentation completeness

Finish responsive behavior, navigation/footer, accessibility, metadata/icons, error/empty/not-found states, real verified links, comprehensive README, setup/configuration/testing/deployment/troubleshooting/operator/API/data/security docs, build log and final link checks.

**Acceptance:** no dead links/inert controls; docs verified against the built app; private repo never linked publicly.  
**Commit:** `docs: complete user and developer documentation`.

### Phase 8 — Required demo video

Record real app behavior through Playwright with deterministic synthetic data in a clean browser profile. Generate a concise 90–150 second script. Verify current free Google Gemini TTS model/availability/quota/terms; if unavailable or unsuitable, use a genuinely free permitted local TTS. Edit and synchronize, caption where feasible, redact sensitive information, render and review.

**Outputs:** `artifacts/demo/assay-demo.mp4`, `assay-demo-script.md`, `assay-demo.srt`, `production-notes.md`.  
**Acceptance:** final video <=180 seconds; no clipping, unexplained long gaps or mismatched narration; audio/video plays end-to-end.  
**Commit:** `docs: add reviewed product demo`.

### Phase 9 — Final regression/security/authorized release

Run full tests, dependency/security scans, final preview smoke and production checks. Deploy production only when explicitly authorized in intake. Otherwise leave verified staging preview and write exact release instructions.

**Acceptance:** no critical/high issues; final commit and environment evidence recorded; production boundary honored.  
**Commit:** `chore: prepare verified release`.

## Stop conditions

Stop only for missing indispensable access/credentials with no safe fallback, serious security/data-loss risk, unavailable dependency with no safe fallback, budget/scope limit, or action beyond explicit authority. State exact blocker/evidence/completed work/minimum operator action. Continue unaffected work. Do not stop for a routine phase boundary, mockup approval or preference check.

## Checkpoint record

Every phase updates: current phase; completed work; test commands/results; preview URL; deployed commit; references/skill status; docs status; demo status; known issues; authority boundaries; next task; blocker (if any).
