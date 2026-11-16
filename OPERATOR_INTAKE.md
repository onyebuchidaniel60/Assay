# Assay — Consolidated Operator Intake / Readiness Check

**Phase:** 0 — readiness  
**Intake completed:** 2026-11-15 (UTC)  
**Repository:** `https://github.com/onyebuchidaniel60/Assay`  
**Scope tier:** **CONFIRMED — Tier A (full blueprint).**  
**Overall readiness:** **AUTHORIZED — credential presence mismatch.** The operator authorized Phases 1–9 and production, but the provider/database credentials asserted to be in `.env.local` are not present there. See §0.7. No application code, monorepo scaffold or deployment has been performed yet.

This file records the single consolidated intake, the authoritative provider revision of 15 November 2026, the evidence gathered during the read-only inspection, and the exact operator actions still required before Phase 1.

---

## 0. Authoritative operator overrides — 15 November 2026

These decisions override conflicting text in `MASTER_BLUEPRINT.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `AGENTS.md`, `DEMO_VIDEO_PLAN.md` and the historical handoff documents.

### 0.1 Dolphin — evaluated and rejected

- **Status:** `REJECTED / REMOVED`.
- Dolphin was evaluated and rejected because its confidentiality mechanism is unverified: no TEE, no MPC and unverified zero-retention claims.
- No Dolphin adapter will be built.
- No Dolphin endpoint, model, key or privacy-verification environment variable will be added to `.env.example`, application config or code.
- Historical blueprint references to Dolphin are superseded by this section and must not be implemented.

### 0.2 NEAR AI Cloud — Layer 2 confidential inference

- **Provider:** NEAR AI Cloud.
- **Base URL:** `https://cloud-api.near.ai/v1` (OpenAI-compatible gateway).
- **Authentication:** Bearer token via `NEARAI_API_KEY`.
- **Confidential compute:** Intel TDX confidential VMs and NVIDIA H200 GPUs in confidential-computing mode.
- **Attestation:** request fresh evidence with a client-supplied nonce; verify against Intel TDX and NVIDIA NRAS. Public deployment manifests: `github.com/nearai/cvm-compose-files`.
- **Model catalog:** `GET https://cloud-api.near.ai/v1/model/list`; select only models whose metadata reports both `verifiable: true` and `attestationSupported: true` for Layer 2 extraction.
- **Starter credit:** advertised as covering first requests; the exact amount must be verified in the NEAR AI dashboard before Phase 3. It is **not verified** here.
- **Routing rule:** only tokenized credit-agreement text and structured financial figures may be sent to NEAR AI. Token maps, borrower identities and raw documents must not be sent.

### 0.3 OpenRouter — general model inference

- **Provider:** OpenRouter.
- **Base URL:** `https://openrouter.ai/api/v1` (OpenAI-compatible).
- **Authentication:** Bearer token via `OPENROUTER_API_KEY`.
- **Routing rule:** SERV judgement and generation nodes (branch selection, breach justification and report drafting) route to OpenRouter. They receive only structured, already-extracted data — never raw documents.
- **Model variables:** `OPENROUTER_MODEL_JUDGEMENT` and `OPENROUTER_MODEL_GENERATION`.

### 0.4 SERV Reasoning — orchestration, not inference

- SERV's BRAID graph is the orchestration layer. Its nodes call either NEAR AI or OpenRouter according to the routing rules above.
- SERV does not itself perform inference. It structures, validates and audits calls.
- Do not claim that Shadow Agent, PromptGuard or graph-versioning features were executed unless the OpenServ account and runtime confirm it.

### 0.5 Layer 2 wording

Allowed:

> Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request can be verified against Intel TDX and NVIDIA NRAS attestation evidence.

Prohibited:

- “zero retention guaranteed”
- “TEE protected” without attestation evidence
- “cryptographically proves the data was never logged”

### 0.6 Presidio deployment decision — resolved

**Selected resolution:** reduced Presidio-equivalent mode.

- Deploy a lightweight Python PII service using Presidio Analyzer with the small spaCy model and deterministic custom financial recognizers.
- The service and UI/API status must be labelled `REDUCED_PII_MODE`; it is not full-strength Presidio and must not be described as such.
- Analyst redaction review remains mandatory. Unresolved redaction blocks all model calls.
- Full `en_core_web_lg` Presidio is not deployed on Render's free 512 MB web service.
- No paid Render upgrade, disk or add-on is authorized.
- Phase 2 must measure the service RSS. If the reduced Presidio configuration still exceeds 512 MB, use the deterministic custom-recognizer-only fallback under the same `REDUCED_PII_MODE` label. No paid upgrade is permitted without operator budget approval.

### 0.7 Execution authorization and credential-presence audit — 15 November 2026

The operator authorized Phases 1–9, Tier A, Vercel preview and production, Render free API + Presidio, synthetic data and production release after the full test/security gate. Budget: `$0` new spend beyond existing NEAR AI and SERV credits.

**Credential-presence audit after that authorization:** `.env.local` currently contains only these eight Kite keys:

`KITE_ENABLED`, `KITE_MAX_PER_PAYMENT_MINOR`, `KITE_MAX_TOTAL_MINOR`, `KITE_PASSPORT_API`, `KITE_SESSION_EXPIRY`, `KITE_SESSION_ID`, `KITE_TESTNET_ASSET`, `KITE_TEST_X402_ENDPOINT`.

It does **not** contain any of the following authorized-provider or database variables:

`NEARAI_API_KEY`, `NEARAI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_JUDGEMENT`, `OPENROUTER_MODEL_GENERATION`, `SERV_REASONING_API_KEY`, `SERV_MODEL`, `DATABASE_URL`/`NEON_DATABASE_URL`, `REPPO_API_KEY`, `RENDER_API_KEY`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_API_KEY`, `NEON_AUTH_COOKIE_SECRET`, `NEON_STORAGE_BUCKET`.

Process-environment checks also show none of these names. The `.env.local` file was last written during the Kite setup; if provider values were added before that write, they may have been overwritten. Re-add them out-of-band; do not paste values into chat.

**Consequence:** Phase 1 local scaffolding may proceed, but Phase 2/3 live database, auth, storage and provider integration and any full preview cannot be honestly completed until the credentials are present. The production authorization remains recorded, but release is gated by the full test/security matrix.

---

## 1. Repository, Git and environment state

| Item | Required? | Evidence / status | Validation |
|---|---:|---|---|
| Repository URL | Yes | `https://github.com/onyebuchidaniel60/Assay` | `VALIDATED` |
| Visibility | Yes | Public GitHub repository | `VALIDATED` |
| Default branch | Yes | `main`; `origin/HEAD -> origin/main` | `VALIDATED` |
| Current branch | Yes | `main`, tracking `origin/main` | `VALIDATED` |
| HEAD SHA | Yes | `6a90b02eb9c7363bddd22238ce2689de94f2aafd` — `source docs` | `VALIDATED` |
| Working tree | Yes | Clean; no modified or untracked files before this intake edit | `VALIDATED` |
| Remote | Yes | `origin` fetch/push `https://github.com/onyebuchidaniel60/Assay` | `VALIDATED` |
| Write access | Yes | GitHub CLI account has `repo` and `workflow` scopes; repository permissions include admin/push; `git push --dry-run origin main` → `Everything up-to-date` | `VALIDATED` |
| Branch protection | Informational | No protection on `main` | `VALIDATED` |
| GitHub Actions | Informational | No workflows currently present | `VALIDATED` |
| Clean-start state | Yes | 24 tracked documentation files; no application source, monorepo manifests, migrations, tests, Docker/CI/deploy configuration or old product code | `VALIDATED` |
| Environment files | Yes | No `.env` or `.env.*` files in the repository | `VALIDATED` |
| Application code | Yes | None written or scaffolded | `VALIDATED` |

### Environment variable presence

The following names were checked in the process environment and relevant local configuration; **no values were printed**:

`NEARAI_API_KEY`, `OPENROUTER_API_KEY`, `SERV_REASONING_API_KEY`, `OPENSERV_API_KEY`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_API_KEY`, `NEON_AUTH_COOKIE_SECRET`, `DATABASE_URL`, `RENDER_API_KEY`, `PRESIDIO_SERVICE_TOKEN`, `REPPO_API_KEY`, `KITE_*`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64`.

**Result:** none of these Assay-scoped variables is present in the process environment.

Additional observations:

- An unrelated local project configuration contains an `OPENROUTER_API_KEY` name. It is not Assay-scoped, was not loaded, and was not used.
- `/root/.near-credentials` contains NEAR blockchain testnet account keys for unrelated projects; these are not NEAR AI Cloud API keys and were not used.
- No Vultr or Render credentials are present.
- Vercel CLI is authenticated; see §3.6.

---

## 2. Critical provider intake

### 2.1 NEAR AI Cloud — Layer 2 extraction

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Provider selection | Yes | `VALIDATED` | NEAR AI replaces Dolphin for sensitive extraction |
| Base URL | Yes | `VALIDATED` | `https://cloud-api.near.ai/v1`; public model-list endpoint returned HTTP 200 |
| API key presence | Yes | `ABSENT` | `NEARAI_API_KEY` not present in the Assay environment |
| Starter credit amount | Yes before Phase 3 | `UNVERIFIED` | Must be read from the NEAR AI dashboard; advertised credit is not treated as confirmed |
| Model catalog | Yes | `VALIDATED (public metadata only)` | `GET /v1/model/list` returned 64 models; 14 text-output models report both `verifiable: true` and `attestationSupported: true` |
| Selected extraction model | Yes | `PROPOSED — operator confirmation and live validation required` | `z-ai/glm-5.3-flash` — verifiable and attestation-supported metadata; 1,048,576-token context; structured outputs/JSON mode; approximately $0.08/M input and $0.50/M output tokens |
| Alternative extraction model | Optional | `DOCUMENTED` | `deepseek-ai/DeepSeek-V4.1-Flash-1017` — verifiable/attestation-supported, 1,048,576-token context, approximately $0.30/M input and $1.20/M output; structured-output support is not listed |
| Live inference test | Yes | `BLOCKED` | No API key; no request made |
| Fresh attestation test | Yes | `BLOCKED` | Requires API key and client-supplied nonce; must verify Intel TDX and NVIDIA NRAS evidence |
| Quotas and rate limits | Yes | `UNKNOWN` | Must be verified in the account/dashboard |
| Data routing | Yes | `DEFINED` | Tokenized agreement text and structured financial figures only; no token map, borrower identity or raw document |
| Layer 2 wording | Yes | `DEFINED` | Allowed/prohibited wording recorded in §0.5 |

### 2.2 OpenRouter — general inference

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Provider selection | Yes | `VALIDATED` | OpenRouter is the general model provider |
| Base URL | Yes | `VALIDATED` | `https://openrouter.ai/api/v1`; public model list returned HTTP 200 |
| API key presence | Yes | `ABSENT` | No Assay-scoped `OPENROUTER_API_KEY`; unrelated key not used |
| Model catalog | Yes | `VALIDATED (public metadata only)` | 470 models returned by the public catalog |
| Judgement model | Yes | `PROPOSED — operator confirmation required` | `openai/gpt-5.4-mini` — 400,000-token context; approximately $0.75/M input and $4.50/M output tokens |
| Generation model | Yes | `PROPOSED — operator confirmation required` | `deepseek/deepseek-v3.2` — 163,840-token context; approximately $0.26/M input and $0.38/M output tokens |
| Live inference test | Yes | `BLOCKED` | No Assay-scoped key; no request made |
| Credits / quota | Yes | `UNKNOWN` | Must be verified in the OpenRouter account |
| Data routing | Yes | `DEFINED` | Structured, already-extracted data only; never raw documents |

### 2.3 SERV / OpenServ

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Provider selection | Yes | `VALIDATED` | SERV is the bounded reasoning/orchestration layer |
| Base URL | Yes | `VALIDATED` | `https://inference-api.openserv.ai/v1`; unauthenticated probe returned `401 {"error":"Missing or invalid API key"}`, confirming the endpoint responds |
| API key presence | Yes | `ABSENT` | `SERV_REASONING_API_KEY` not present |
| Confirmed model catalog entry | Yes | `BLOCKED` | No key/account access; catalog not verified |
| Credit balance | Yes | `BLOCKED` | No account access; credit balance not verified |
| Live graph/node call | Yes | `BLOCKED` | No key; no SERV call made |
| Capability claims | Yes | `RESTRICTED` | Do not claim Shadow Agent, PromptGuard or graph versioning unless the account/runtime confirms execution |
| Orchestration role | Yes | `DEFINED` | Nodes call NEAR AI or OpenRouter; SERV itself does not infer |

### 2.4 Dolphin

| Item | Required? | Status | Evidence |
|---|---:|---|---|
| Adapter / integration | No | `REJECTED / REMOVED` | Confidentiality mechanism unverified: no TEE, no MPC, zero-retention unverified |
| Environment variables | No | `REMOVED` | No Dolphin variables in Assay config; `.env.example` will not include them |
| Historical references | No | `SUPERSEDED` | Old blueprint text is historical; this intake is authoritative |

### 2.5 Neon

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Auth base URL | Yes | `PRESENT` | `NEON_AUTH_BASE_URL` non-empty; `/ok` returned HTTP 200 |
| Auth API key | Yes | `PRESENT` | `NEON_AUTH_API_KEY` non-empty; server-only |
| Auth cookie secret | Yes | `GENERATED` | `NEON_AUTH_COOKIE_SECRET` generated locally and stored outside Git |
| Database URL | Yes | `VALIDATED` | `DATABASE_URL` non-empty; `select version()` returned PostgreSQL 18.7 |
| Private bucket | Yes | `VALIDATED` | S3 listing returned `assay-private-documents` |
| Project access | Yes | `VALIDATED` | Connection string, auth endpoint and S3 bucket all reachable |
| Plan / quota | Yes | `UNKNOWN` | Verify Neon plan limits/pause behavior; no paid upgrade authorized |
| S3 credentials | Yes | `PRESENT` | AWS endpoint/region/key names non-empty; secret values not printed |

### 2.6 Vercel

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Account access | Yes | `VALIDATED (CLI)` | Vercel CLI 65.8.0 authenticated as `onyebuchidaniel60-1034`; team `uhhh2`, Hobby plan |
| Assay project | Yes | `ABSENT` | No Assay project listed |
| Preview deployment permission | Yes | `BLOCKED` | CLI access does not equal explicit deployment authorization; operator must grant exact preview permission |
| Production deployment permission | Yes | `NO` | Not authorized |
| Paid upgrade | No | `PROHIBITED` | Hobby/free only unless budget authority is added |

### 2.7 Render

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Account/service access | Yes | `BLOCKED` | No Render CLI, API key or account session |
| Free web-service limits | Yes | `DOCUMENTED` | 512 MB RAM; free instances may sleep; no persistent local disk |
| Free Postgres | No | `REJECTED` | Free databases expire after 30 days; Neon Postgres is the persistent store |
| API service | Yes | `BLOCKED` | Must be created/verified after authorization |
| Presidio service | Yes | `RESOLUTION RECORDED` | See §0.6; reduced Presidio-equivalent mode selected |
| Paid upgrade | No | `NOT AUTHORIZED` | No paid Render plan, disk or add-on |

### 2.8 Presidio deployment resolution

| Item | Status | Decision |
|---|---|---|
| Memory blocker | `RESOLVED (design decision)` | Render free 512 MB cannot reliably host full Presidio with `en_core_web_lg` |
| Selected mode | `REDUCED_PII_MODE` | Presidio Analyzer + small spaCy model + deterministic custom financial recognizers |
| Full Presidio | `NOT DEPLOYED` | Full `en_core_web_lg` remains a local/paid-environment option only |
| Analyst review | `MANDATORY` | No model call until redaction is confirmed |
| Validation gate | `REQUIRED` | Phase 2 measures RSS < 512 MB; if exceeded, deterministic recognizer-only fallback under the same label |
| Cost | `$0` new spend | No paid Render upgrade |

### 2.9 Optional integrations

| Integration | Required? | Status | Authorization boundary |
|---|---:|---|---|
| Reppo Evaluation API | Yes | `LIVE` | Real synthetic evaluation completed: `cmwikqtsn000f08l4y73d9a8m`, score 98, accept, low confidence, route review, 440 credits; 409-byte safe trace |
| Kite Passport / x402 | No | `ENABLED (TESTNET) — payment provider-blocked` | Testnet user `user_01a1dfab-06b7-7b42-b03c-111a2805c175`; session `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`; 5 PIEUSD per tx, 20 PIEUSD total, expiry `2026-11-16T15:11:32.17177Z`; wallet funded 100 PIEUSD. Same-key payment retry returned provider `internal error`; no receipt. Over-cap test returned `session_rule_exceeded` (exit 6) with no payment. |
| Google Gemini TTS | No | `NOT CONFIGURED` | Check current free tier in Phase 8; no billing activation; local licensed fallback permitted |
| Custom domain | No | `NOT SUPPLIED` | Use provider preview URLs; exact CORS after deployment |

### 2.10 UI reference asset

| Item | Required? | Status | Evidence |
|---|---:|---|---|
| UI reference image | **Yes** | **VALIDATED (LICENSED)** | Four operator-supplied AVIF files at `design/reference/assayref1.avif`–`assayref4.avif`; inspected |
| Agent-generated reference authorization | **Yes if no image** | `NOT NEEDED` | Operator-supplied assets exist |
| Reference provenance/usage rights | Yes when supplied | `LICENSED — operator assertion` | Option A recorded in `REFERENCE_ASSETS.md`; exact license text still to be attached before external redistribution |
| Responsive expectations | Yes | `DEFAULT` | Desktop-first operations UI; responsive to tablet/mobile; final composition from reference |

The reference asset gate is **PASSED** for implementation. Do not copy the source template's branding, proprietary copy, logo or trade dress.

### 2.11 Scope, budget and authority

| Item | Required? | Status | Boundary |
|---|---:|---|---|
| Scope tier | **Yes** | **CONFIRMED** | Tier A / full blueprint authorized by operator |
| Budget ceiling | **Yes** | `$0 new spend` | Existing NEAR AI ($1) and SERV ($1) credits only; no paid plan, top-up, wallet funding or unexpected charge |
| Production authority | **Yes** | **AUTHORIZED** | Production deploy authorized after full regression/security pass and no unresolved critical/high issue |
| Preview authority | Yes | **AUTHORIZED** | Vercel preview authorized; Render free API/Presidio authorized. Access credentials still required. |
| Data policy | Yes | `SYNTHETIC ONLY` | No real borrower, lender, customer, employee or production data |
| Secret storage | Yes | `SERVER-SIDE ONLY` | Provider environment settings/local process env; never in Git, logs or `NEXT_PUBLIC_*` |
| Destructive actions | Yes | `PROHIBITED` | No deletion of repositories, buckets, credentials or existing resources without exact authority |
| External communications | Yes | `PROHIBITED` | No emails, borrower notices, legal notices, payments or public signup |
| CORS origins | Yes | `DERIVED AFTER DEPLOYMENT` | Exact preview origin only; no wildcard with credentials |
| Demo audience | Yes | `DEFAULT` | Hackathon judges and technically informed product reviewers |
| Pronunciation | Yes | `RESOLVED` | Assay = “ASS-ay” |
| Demo output | Yes | `DEFAULT` | `artifacts/demo/`; MP4 <=180 seconds, target 90–150 seconds |
| Demo redactions | Yes | `DEFAULT` | Synthetic names only; no secrets, private URLs, personal data or real financial values |

---

## 3. Readiness result

| Gate | Pass condition | Result |
|---|---|---|
| Repository | Correct repo/branch accessible; clean-start state confirmed; write access verified | **PASS** |
| Reference asset | Image inspected and license assertion recorded | **PASS (license text to attach)** |
| Scope tier | Tier A full blueprint explicitly confirmed | **PASS** |
| NEAR AI | Key, TEE-verifiable model and fresh TDX/NRAS attestation validated | **PASS — live** |
| OpenRouter | Key, model IDs and live exact-model test validated | **PASS — live** |
| SERV / OpenServ | Key, `serv-standard` exact model and live call validated | **PASS — live** |
| Database/Neon | Connection string, auth/storage configuration and migrations verified | **PASS — 22 tables migrated** |
| Vercel | Project access and preview deployment permission verified | **PASS (CLI access + authorization)** |
| Render | API key present; deployment intentionally deferred to Phase 5 | **AUTHORIZED — deployment pending** |
| Presidio | Deployment blocker resolved and recorded | **RESOLVED** |
| Reppo | Live synthetic feedback evaluation with real provider verdict | **PASS — LIVE** |
| Kite | Disabled or enabled with exact spend cap/asset/session | **ENABLED (TESTNET) — payment provider-blocked** |
| Budget | Numeric ceiling and billing boundary recorded | **PASS — $0 new spend** |
| Production | Explicit authority recorded or staging-only constraint honored | **AUTHORIZED — release gate applies** |
| Demo | Audience, pronunciation, redactions and output location set | **DEFAULTS RECORDED** |

**Phases 1–4 are complete locally. The remaining gate is Phase 5 deployment/preview verification, the full regression/security matrix and the operator follow-ups below.**

---

## 4. Current readiness and operator follow-up

Credentials are now present in `.env.local`. Verified on 15 November 2026:

- PostgreSQL 18.7 via `DATABASE_URL`.
- `NEON_AUTH_BASE_URL/ok` returns HTTP 200.
- Private S3 bucket `assay-private-documents` lists successfully.
- OpenRouter judgement `openai/gpt-4o-mini` and generation `deepseek/deepseek-v3.2` exist in the catalog.
- NEAR AI `z-ai/glm-5.3-flash` is present, `verifiable=true`, `attestationSupported=true`; a model attestation passed Intel TDX and NVIDIA NRAS checks.
- Internal secrets generated locally: `NEON_AUTH_COOKIE_SECRET`, `BETTER_AUTH_SECRET`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64`, `AUDIT_SIGNING_PUBLIC_KEY_BASE64`, `PRESIDIO_SERVICE_TOKEN`.
- Public sign-up is disabled (`disableSignUp=true`); a direct probe returned `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`.
- Full synthetic workflow, proof verification, manager approval, role restrictions and per-borrower audit verification passed; Playwright 18/18 desktop/mobile.

**Render decision:** Option B — defer Render to Phase 5. Phases 2–4 run the API locally against Neon. No Render deployment is claimed yet.

**Remaining operator follow-up:** confirm the Neon plan/quota and attach the exact reference-image license text; no paid upgrade is authorized.
