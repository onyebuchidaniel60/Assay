# IMPLEMENTATION_PLAN.md — Autonomous implementation sequence

Phases are internal checkpoints. At each: implement, test, inspect, fix, commit, update `AI_HANDOFF.md` and `docs/BUILD_LOG.md`, then continue. No routine approval pauses.

## Phase 0 — One consolidated intake/readiness
1. Read all handoff files and inspect repository without modifying code.
2. Record Git status, remotes, stack, manifests, migrations, tests, CI/deploy configuration and environment presence without printing secret values.
3. Complete all applicable inputs in `OPERATOR_INTAKE.md` in one conversation; do not ask already-answered questions.
4. Inspect exact supplied UI reference image(s), update `REFERENCE_ASSETS.md`; if missing, request them or obtain express generation authorization.
5. Verify repository write access, Vultr Compute/Object Storage/Inference access, DNS/domain, deploy method, cost limits and scope.
6. Query live `/v1/models`, make safe inference request and verify returned `model` exactly matches configured ID. Mismatch is a readiness failure for AI mode.
7. Confirm protected preview HTTPS domain and preview deployment authority; record production authority separately.
8. No code changes until critical inputs pass. Safe planning/docs may continue if independent.

Critical inputs: repo write access; reference image or express generated-image authorization; Vultr/compute/storage/inference access; domain/HTTPS preview path; cost cap; secrets/data policy; deploy permission. Outputs: completed intake, repo baseline, service validation, asset inventory.

## Phase 1 — Foundation + skeletal frontend + early preview
Create/preserve pnpm workspace; Next app shell; real route/nav structure; responsive placeholders explicitly labelled unfinished; health endpoints; Docker/Compose/Caddy files; `.env.example`, ignore/secrets rules. Provision only within cap. Secure VM/firewall and domain TLS. Deploy safe synthetic preview. Record exact URL and commit. Test install/lint/typecheck/build, route smoke, responsive shell, TLS and exposed ports. Commit `feat: establish app shell and Vultr preview deployment`.

## Phase 2 — Backend/data/auth foundation
Drizzle schema/migrations; Better Auth; seeded/invite access; session/membership/permission middleware; tenant repositories; Object Storage adapter; pg-boss boot; Pino redaction/request IDs; audit append/head; health readiness. Test migrations, auth, role matrix, IDOR, health, secrets absent in bundle/logs and atomic audit. Commit after passing.

## Phase 3 — Domain/API behavior
Build in order: borrower/facility CRUD; document upload/version/hash/scan/parser/queue; covenant extraction and source quote validation; formula AST validation + manager activation; financial extraction/review/conflict handling; Decimal calculator/golden tests; independent verifier/classification; forecast scenario; case lifecycle/idempotency; memo drafting/approval; stale invalidation/audit verify; dashboard/export. Each route gets Zod contract, permission test, sanitised errors and audit behavior.

## Phase 4 — Functional frontend integration
Connect all P0 screens to working APIs; use consistent temporary design system. Implement loading/empty/error/denied states. Test forms, permission behavior, API wiring and keyboard navigation.

## Phase 5 — E2E functionality gate (before final styling)
Critical demo E2E: analyst login → create borrower/facility → upload agreement/statement → extract covenant/metrics → submit covenant → manager approves → confirm evidence → actual 3.20x compliant and verified → forecast 3.63x at-risk but actual unchanged → update debt to 37m → verified 3.70x breached → create case → draft memo → manager approves → supersede evidence → mark dependent assessment stale/pending approval invalidated → reassess → inspect audit chain.

Failure suite: scanned/malformed/encrypted PDF; oversized/wrong MIME; parser timeout; invalid extraction schema/citation; wrong model fallback; missing metric; wrong period/currency; divide by zero; unauthorized/self/concurrent approval; duplicate case/assessment; cross-tenant IDOR; prompt injection; audit tamper. Gate: unit/integration/E2E pass; no unresolved critical/high issue; preview URL+commit+evidence recorded. Diagnose/fix/retest automatically.

## Phase 6 — Reference-image UI + skill
Attempt `npx skills add benjitaylor/skills --skill stageshow`; inspect instructions and apply relevant guidance. Optional additional relevant trustworthy skills. Directly implement actual UI from supplied images; no mockup or approval gate. Record design decisions/deviations. If install fails, record and continue with strong accessibility/design-system practices.

## Phase 7 — Frontend/docs/footer completeness
Finish responsive and accessibility checks at 1440/1280/768/390/360 and 200% zoom; metadata/icons; loading/empty/error/success/denied/not-found/stale; no inert links/actions; README and docs; footer links to actual public Documentation and GitHub destinations only (never expose private repo). Commit.

## Phase 8 — Demo video <=180 sec
Capture real deterministic app interactions with Playwright. Check Google AI voice/TTS current free tier, terms, quota, region and credentials; no paid use without authority. If unavailable, use genuinely free licensed local TTS (e.g. Piper only after voice model license check) and document. Script narration tied to visible actions, synchronize naturally, captions where feasible, redact sensitive details, render and review full playback/audio/duration. Save video, script, capture steps and production notes in approved directory.

## Phase 9 — Final regression/security/authorized release
Run all regression/security tests, dependency/secret scans, TLS/firewall/bucket checks, backup/restore check and demo smoke tests. Deploy production only with explicit authority for exact environment/domain/actions; otherwise leave verified preview and exact release steps. Update final handoff/build log and docs.

## Checkpoint record
At each checkpoint record phase, completed work, exact test commands/results, preview URL, deployed commit, migration state, reference/skill state, docs/demo state, issues/severity, authorization boundaries, next task and blocker/minimum operator action. Resume from Git + handoff + build log; do not redo completed work. Never claim a test passed without evidence.
