# Assay — Consolidated Operator Intake / Readiness Check

**Purpose:** One consolidated intake before repository modification. The agent records the answer/source, required status, validation and authorization boundary for every applicable item. Do not re-ask known items.

## A. Already known / resolved from handoff

| Item | Known answer / source | Required? | Validation | Authorization boundary |
|---|---|---:|---|---|
| Product name | Assay | Yes | Resolved | Do not rename without operator instruction |
| Product purpose | AI-assisted covenant monitoring for one Debt/Adjusted EBITDA covenant | Yes | Resolved | Not a full underwriting product |
| MVP data | Synthetic data only | Yes | Resolved | Real borrower data prohibited |
| User roles | Analyst, Manager, Auditor, Admin | Yes | Resolved | RBAC enforced server-side |
| Covenant support | One maximum Debt/Adjusted EBITDA covenant | Yes | Resolved | Other covenant families out of scope |
| Financial inputs | Analyst-entered and attested | Yes | Resolved | Do not infer missing amounts |
| Calculations | Deterministic arithmetic | Yes | Resolved | LLM cannot be authoritative calculator |
| Manager approval | Assay approval gate, only for baseline compliant + verified proof | Yes | Resolved | No baseline-breach override in MVP |
| Kite role | Optional x402 spending session for external service, separate from credit approval | Yes | Resolved | No wallet spend without exact authority |
| Repository | `github.com/onyebuchidaniel60/Assay` | Yes | Operator-supplied in handoff; re-check access | Operator will clear old contents; do not resurrect old files |
| Hosting constraint | Railway unavailable; use Render/other suitable service | Yes | Resolved | No Railway |
| Preferred frontend preview | Vercel preferred | Yes | Confirm account in intake | Preview only unless production authorized |
| Documentation | README/docs first-class deliverables | Yes | Resolved | Must be completed and verified |
| Demo video | Actual produced MP4 <=180 seconds using Playwright and free TTS where available | Yes | Resolved | No unapproved paid voice/video service |
| Coding workflow | Autonomous phases; no routine approval stops | Yes | Resolved | Stop for genuine blocker/authorization boundary only |

## B. Critical items to collect before coding

| Question / input | Required/optional | Status | Where used | Authority / validation |
|---|---|---|---|---|
| At least one UI reference image, exact filename/path and source/ownership | **Required** | **BLOCKER — not supplied** | Phase 6 visual implementation; `REFERENCE_ASSETS.md` | Must be supplied or operator expressly authorizes agent-generated reference image; no mockup phase |
| Is the repository cleared and ready for a clean start? Confirm branch and target default branch | Required | Pending verification | Phase 1 | Do not delete files unless operator explicitly confirms; inspect Git status first |
| GitHub write access and public-repository status | Required | Pending verification | Push, links, submission | Never publish secrets or real borrower data; do not make private repo public without authorization |
| Vercel access/project creation permission | Required for preview | Pending verification | Phase 1 frontend preview | Preview deployment permitted only within verified project; no paid upgrade |
| Render access/service creation permission | Required for API and Presidio | Pending verification | Phases 1–2 | No paid compute, disks or add-ons without explicit budget authority |
| Supabase project access or permission to create a free project | Required | Pending verification | Auth, DB, storage | Do not upgrade to paid plan or enable paid features without authorization |
| Supabase URL, anon key, service role key, Postgres connection string | Required | Pending secure transfer | API/Auth/storage | Secret store only; never paste into repository or logs |
| OpenServ SERV API key and chosen current model/catalog entry | Required for completed SERV MVP | Pending | Reasoning nodes | Verify key, credits, endpoint, model ID and API usage; no top-up without consent |
| Dolphin **@dphnAI** partner API URL, key, model ID and current terms | Required only to enable AI extraction integration | Pending | Covenant extraction | Must verify from official partner account/docs; do not guess; no unverified endpoint or privacy claim |
| Reppo Evaluation API key and access | Optional | Pending | Feedback evaluation | Use synthetic/de-identified payload only; verify current free quota and pricing before calls |
| Kite Passport account/agent identity, wallet/session setup, supported CLI/SDK and service ID | Optional | Pending | External benchmark/x402 | No funding or transaction until exact per-tx cap, total cap, asset, expiry and allowed service are approved |
| Kite testnet spending ceiling | Required only if Kite is enabled | Pending | Payment policy | Default `$0`; operator must provide numeric maximum and asset before enablement |
| Presidio service deployment config | Required | Pending | PII detection | Confirm Render resources and memory fit; no paid plan without permission |
| Domain names/custom domains | Optional | Pending | URLs, CORS, metadata | Use provider subdomains if no domain supplied |
| CORS origins | Required | Derive from actual preview URL | API security | Exact allowlist only; no wildcard with credentials |
| Free demo TTS access/key | Optional | Pending | Demo voiceover | Try current Google Gemini TTS free tier; no billing activation; local fallback permitted |
| Demo audience and pronunciation of Assay | Required | Default judges; pronunciation to confirm | Script and narration | No private user/customer details in video |
| Demo output location | Required | Default `artifacts/demo/` | MP4/script/captions/notes | Save only synthetic data and redacted URLs |
| Production deployment authority | Required | **Default: NOT AUTHORIZED** | Phase 9 | Preview/staging only unless explicit affirmative scope given |
| Paid-service budget ceiling | Required | **Default: $0 new spend** | Provider/hosting limits | Existing free/preloaded credits only; stop before exceeding cap |
| Data handling and prohibited actions | Required | Default synthetic only | All services | Do not upload real borrower data; do not expose secrets |

## C. Optional preferences with safe defaults

| Input | Safe default | Required? |
|---|---|---:|
| Brand/product pronunciation | “ASS-ay” unless operator specifies otherwise | Optional |
| Demo duration | 90–150 seconds, maximum 180 | Optional preference |
| Demo voice | Clear, professional, natural neutral English; select best free permitted voice | Optional preference |
| Theme | Follow supplied reference image; until then neutral temporary design system | Reference itself is required |
| Custom domain | Provider preview URL | Optional |
| Reppo/Kite integration | Disabled until verified and authorized | Optional |

## D. Readiness checklist

- [ ] All required product facts already known or collected.
- [ ] Reference image(s) attached and exact paths/provenance recorded.
- [ ] Repository write access and clean-start state verified.
- [ ] Vercel preview access verified; exact project selected.
- [ ] Render service access and no-cost/paid limitations verified.
- [ ] Supabase project/DB/Auth/Storage access verified.
- [ ] SERV key/model/credits validated with harmless test call.
- [ ] Dolphin endpoint/model/privacy terms validated or adapter remains disabled.
- [ ] Reppo and Kite enabled only if credentials and authority provided.
- [ ] Cost ceiling and payment limits recorded.
- [ ] Production authority explicitly set to yes/no; default no.
- [ ] Demo audience, pronunciation, redactions and output location set.
- [ ] No secrets or real borrower data present in repository or fixtures.

**Gate:** Phase 1 begins only when all critical items are verified. An optional integration may remain disabled without blocking the core workflow.
