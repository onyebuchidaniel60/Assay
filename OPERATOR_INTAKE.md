# Assay — Consolidated Operator Intake / Readiness Check

**Phase:** 0 — readiness  
**Intake completed:** 2026-11-15 (UTC)  
**Repository:** `https://github.com/onyebuchidaniel60/Assay`  
**Scope tier:** **BLOCKED — Tier A (full blueprint) has not been explicitly confirmed by the operator.**  
**Overall readiness:** **NOT READY — critical blockers remain.** No application code, monorepo scaffold, deployment or paid provisioning has been performed.

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

`NEARAI_API_KEY`, `OPENROUTER_API_KEY`, `SERV_REASONING_API_KEY`, `OPENSERV_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `RENDER_API_KEY`, `PRESIDIO_SERVICE_TOKEN`, `REPPO_API_KEY`, `KITE_*`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64`.

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

### 2.5 Supabase

| Item | Required? | Status | Evidence / action |
|---|---:|---|---|
| Project URL | Yes | `ABSENT` | No Supabase project URL in environment or repo |
| Anon key | Yes | `ABSENT` | No `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Service role key | Yes | `ABSENT` | No server-side service-role key |
| Database URL | Yes | `ABSENT` | No Postgres connection string |
| Private bucket | Yes | `NOT PROVISIONED` | Target name `assay-private-documents`; no bucket verified |
| Project access | Yes | `BLOCKED` | No Supabase CLI/config/access token; free plan only |
| Plan / quota | Yes | `UNKNOWN` | Must verify free-tier limits and pause behavior |

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
| Free Postgres | No | `REJECTED` | Free databases expire after 30 days; Supabase Postgres is the persistent store |
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
| Reppo Evaluation API | No | `DISABLED` | No key/quota/terms; enable only with synthetic/de-identified data and verified access |
| Kite Passport / x402 | No | `ENABLED (TESTNET)` | Testnet user `user_01a1dfab-06b7-7b42-b03c-111a2805c175`; session `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`; 5 PIEUSD per tx, 20 PIEUSD total, expiry `2026-11-16T15:11:32.17177Z`; wallet funded 100 PIEUSD. Payment smoke test blocked by provider internal error; no receipt. |
| Google Gemini TTS | No | `NOT CONFIGURED` | Check current free tier in Phase 8; no billing activation; local licensed fallback permitted |
| Custom domain | No | `NOT SUPPLIED` | Use provider preview URLs; exact CORS after deployment |

### 2.10 UI reference asset

| Item | Required? | Status | Evidence |
|---|---:|---|---|
| UI reference image | **Yes** | **BLOCKED** | No image in the repository or supplied location; `REFERENCE_ASSETS.md` records none |
| Agent-generated reference authorization | **Yes if no image** | **NOT GRANTED** | No explicit authorization in the Phase 0 instruction |
| Reference provenance/usage rights | Yes when supplied | `PENDING` | Must be recorded before Phase 6 |
| Responsive expectations | Yes | `DEFAULT` | Desktop-first operations UI; responsive to tablet/mobile; final composition from reference |

**This is a hard blocker under the operator's stop conditions.**

### 2.11 Scope, budget and authority

| Item | Required? | Status | Boundary |
|---|---:|---|---|
| Scope tier | **Yes** | **BLOCKED** | Tier A / full blueprint has not been explicitly confirmed |
| Budget ceiling | **Yes** | `$0 new spend` | Free tiers and preloaded credits only; no paid plan, top-up, wallet funding or unexpected charge |
| Production authority | **Yes** | `NO` | Preview/staging only; production requires explicit separate grant |
| Preview authority | Yes | `BLOCKED` | Vercel CLI exists, but exact preview permission has not been granted |
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
| Reference asset | Image inspected or explicit generation authorization recorded | **BLOCKED** |
| Scope tier | Tier A full blueprint explicitly confirmed | **BLOCKED** |
| NEAR AI | Key, starter credit, TEE-verifiable model and fresh attestation test validated | **BLOCKED** |
| OpenRouter | Key, model IDs, credits and live test validated | **BLOCKED** |
| SERV / OpenServ | Key, catalog entry, credits and harmless call validated | **BLOCKED** |
| Supabase | Project URL, keys, database URL and private bucket verified | **BLOCKED** |
| Vercel | Project access and preview deployment permission verified | **BLOCKED** |
| Render | API and Presidio service access verified; free-tier fit confirmed | **BLOCKED** |
| Presidio | Deployment blocker resolved and recorded | **RESOLVED** |
| Reppo | Disabled or enabled with verified access and synthetic-only payload policy | **DISABLED** |
| Kite | Disabled or enabled with exact spend cap/asset/session | **ENABLED (TESTNET) — payment smoke test blocked** |
| Budget | Numeric ceiling and billing boundary recorded | **$0 new spend; no paid authority** |
| Production | Explicit authority recorded or staging-only constraint honored | **NOT AUTHORIZED** |
| Demo | Audience, pronunciation, redactions and output location set | **DEFAULTS RECORDED** |

**Phase 0 does not pass until the `BLOCKED` rows are resolved.**

---

## 4. Exact operator action required before Phase 1

1. **Confirm scope tier:** explicitly confirm **Tier A — full blueprint**.
2. **UI reference:** supply an image with exact path/source/ownership/usage rights, or explicitly authorize agent-generated original reference imagery.
3. **NEAR AI:** provide a dedicated `NEARAI_API_KEY` through the approved secret channel; confirm the starter-credit amount in the dashboard; confirm or replace the proposed extraction model `z-ai/glm-5.3-flash`; authorize the attestation test.
4. **OpenRouter:** provide a dedicated `OPENROUTER_API_KEY`; confirm or replace `openai/gpt-5.4-mini` (judgement) and `deepseek/deepseek-v3.2` (generation); confirm available credits.
5. **SERV / OpenServ:** provide `SERV_REASONING_API_KEY`; confirm the model catalog entry and credit balance; authorize one harmless graph/model test call.
6. **Supabase:** provide the project URL, anon key, service-role key, database URL and private bucket name, or authorize creation of a free project.
7. **Vercel:** confirm the Assay project and explicitly authorize preview deployment. Confirm Hobby/free-only.
8. **Render:** provide service access or authorize creation of free API and Presidio services; confirm the reduced Presidio mode and 512 MB constraint.
9. **Budget:** raise the ceiling only if a paid service is required. Otherwise confirm free-tier-only operation and no top-ups/payments.
10. **Production:** confirm production remains **NOT AUTHORIZED**.
11. **Optional integrations:** Reppo remains disabled. Kite testnet is enabled with session `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf` (5/20 PIEUSD, 24h); resolve the provider internal error before relying on the x402 path in the Assay workflow.
12. **Secrets:** deliver values only through a secure out-of-band channel — never in chat, Git, logs or `NEXT_PUBLIC_*` variables.

**No Phase 1 work — no monorepo scaffold, no application code, no deployment — may begin until the critical blockers above are resolved.**
