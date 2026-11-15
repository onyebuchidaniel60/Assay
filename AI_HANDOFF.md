# Assay — AI Handoff / Build State

**Status:** Phase 0 intake completed; implementation not started; critical blockers remain.  
**Current phase:** Phase 0 — Operator Intake / Readiness.  
**Repository:** `https://github.com/onyebuchidaniel60/Assay` — public, default branch `main`; Phase 0 inspection baseline `6a90b02eb9c7363bddd22238ce2689de94f2aafd`; this Phase 0 documentation checkpoint is recorded below.  
**Preview URL:** None — no deployment performed.  
**Deployed commit:** None.  
**Production release authority:** Not granted.  
**Data boundary:** Synthetic data only; no real borrower, lender or production records.  
**New spend authority:** `$0`; free tiers and preloaded credits only.

## Phase 0 completed

- Read `AGENTS.md`, `MASTER_BLUEPRINT.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `DEMO_VIDEO_PLAN.md`, `AI_HANDOFF.md` and all files under `docs/`.
- Inspected repository and Git metadata without modifying application files.
- Confirmed the repository is a documentation-only clean-start state: 24 tracked documentation files, no application code, manifests, migrations, tests, CI, deploy configuration or `.env` files.
- Confirmed default branch `main`, clean working tree, remote reachability and write access (`git push --dry-run` succeeded).
- Confirmed Vercel CLI access: account `onyebuchidaniel60-1034`, team `uhhh2` (Hobby); no Assay project exists.
- Checked provider endpoints and public model catalogs without using secrets:
  - NEAR AI model list reachable; 64 models returned.
  - OpenRouter model catalog reachable; 470 models returned.
  - OpenServ endpoint reachable and returns `401` without a key.
- Applied the operator's provider overrides:
  - Dolphin removed and rejected; no adapter, endpoint, model or environment variable will be implemented.
  - NEAR AI Cloud is Layer 2 confidential extraction.
  - OpenRouter is general inference for SERV judgement/generation.
  - SERV is the orchestration layer and does not itself infer.
  - Layer 2 wording restrictions recorded.
- Resolved the Presidio/Render memory blocker by selecting `REDUCED_PII_MODE`: Presidio Analyzer with the small spaCy model plus deterministic custom financial recognizers; full `en_core_web_lg` is not deployed on the Render free 512 MB tier. No paid upgrade.
- Updated `OPERATOR_INTAKE.md` with the complete consolidated intake and statuses.

## Critical blockers

1. **Scope tier:** Tier A (full blueprint) has not been explicitly confirmed.
2. **UI reference:** no image supplied and no express authorization to generate one; `REFERENCE_ASSETS.md` remains unfulfilled.
3. **NEAR AI:** `NEARAI_API_KEY` absent; starter-credit amount unverified; live extraction model and fresh Intel TDX/NVIDIA NRAS attestation test not performed. Proposed model: `z-ai/glm-5.3-flash`.
4. **OpenRouter:** `OPENROUTER_API_KEY` absent; model IDs and credits unverified. Proposed: `openai/gpt-5.4-mini` (judgement), `deepseek/deepseek-v3.2` (generation).
5. **SERV / OpenServ:** `SERV_REASONING_API_KEY` absent; catalog entry, credits and a harmless graph/model test unverified.
6. **Supabase:** project URL, anon key, service-role key, database URL and private bucket are absent.
7. **Vercel:** CLI access exists, but no Assay project and no explicit preview deployment permission.
8. **Render:** no service/account access; API and Presidio services cannot be created or verified.
9. **Budget:** `$0` new spend; no paid tier, top-up, wallet funding or unexpected charge is authorized.

## Provider and integration status

| Provider | Status | Evidence / boundary |
|---|---|---|
| NEAR AI Cloud | `BLOCKED` | Base URL/model catalog reachable; no key/credit/attestation test |
| OpenRouter | `BLOCKED` | Base URL/model catalog reachable; no Assay-scoped key |
| SERV / OpenServ | `BLOCKED` | Endpoint reachable; no key/catalog/credit verification |
| Dolphin | `REJECTED` | Removed; confidentiality mechanism unverified; no adapter/env |
| Supabase | `BLOCKED` | No project URL/keys/database/bucket |
| Vercel | `PARTIAL` | CLI authenticated; preview permission not granted |
| Render | `BLOCKED` | No account/service access; free-tier limits documented |
| Presidio | `RESOLVED (DESIGN)` | `REDUCED_PII_MODE` selected; Phase 2 RSS validation required |
| Reppo | `DISABLED` | Optional; no key/authorization; synthetic-only if enabled |
| Kite | `SETUP BLOCKED` | Production Passport login succeeded; testnet login codes expired twice; no wallet funding, session or payment. Spend cap remains `$0`. |
| Google TTS | `NOT CONFIGURED` | Free-tier check deferred to Phase 8; no billing |

## Authority and defaults

- Synthetic data only; no real borrower or production data.
- No public signup; invite-only staff accounts.
- No Kite wallet spend or paid-service top-up.
- Preview deployment only after exact access and permission are verified.
- Production deployment is not authorized.
- `ENABLE_DEMO_SHRED=false` except during an explicitly authorized synthetic demo.
- No raw documents, token maps, borrower identities or full prompts in logs or external provider calls beyond the recorded routing rules.
- Manager approval is separate from any Kite spending authorization.
- Audit chain is tamper-evident and signed; do not call it immutable.

## Verification evidence

- Repository state: `git status --short --branch` → `## main...origin/main`; `git rev-parse HEAD` → `6a90b02eb9c7363bddd22238ce2689de94f2aafd`.
- Write access: `git push --dry-run origin main` → `Everything up-to-date`.
- GitHub permissions: admin/push enabled; `main` has no branch protection.
- Vercel: `vercel whoami` → `onyebuchidaniel60-1034`; `vercel teams ls` → team `uhhh2`, Hobby; no Assay project.
- NEAR AI: `GET https://cloud-api.near.ai/v1/model/list` → HTTP 200, 64 models.
- OpenRouter: `GET https://openrouter.ai/api/v1/models` → HTTP 200, 470 models.
- OpenServ: `GET https://inference-api.openserv.ai/v1/models` without key → HTTP 401.
- No application tests exist; no test pass is claimed.
- No preview URL or deployed commit exists.

## Next exact task

**Operator action:** resolve the critical blockers in `OPERATOR_INTAKE.md` §4 — scope tier, UI reference, NEAR AI/OpenRouter/SERV credentials and validation, Supabase, Vercel preview permission, Render access and budget.

**After authorization:** begin Phase 1 only: create the clean pnpm monorepo, navigable Next.js shell with labelled placeholders, Fastify health route, environment validation, CI basics, and a protected synthetic preview. No Phase 1 work before the operator confirms the blockers are resolved.

## Blocked by

Scope-tier confirmation; UI reference or generation authorization; NEAR AI, OpenRouter and SERV credentials/credits; Supabase and Render access; Vercel preview permission; paid-spend authority if any paid resource is required.
