# Third-party Integrations

**Provider revision:** 15 November 2026. This file supersedes the historical Dolphin integration description in the blueprint and `docs/`.

## OpenServ SERV Reasoning — mandatory orchestration

Use the current OpenServ inference base URL confirmed in public materials: `https://inference-api.openserv.ai/v1`. An unauthenticated probe returned HTTP 401, confirming the endpoint responds; verify the actual key, model catalog, graph features and credits in the account before implementation. SERV is the bounded reasoning/orchestration layer; its nodes call NEAR AI or OpenRouter. SERV does not itself perform inference. Application code owns the domain state machine and deterministic checks. Never claim a graph, Shadow Agent or PromptGuard feature was executed unless account/runtime evidence confirms it.

## NEAR AI Cloud — Layer 2 confidential inference

- Base URL: `https://cloud-api.near.ai/v1` (OpenAI-compatible gateway).
- Auth: bearer token via `NEARAI_API_KEY`.
- Confidential compute: Intel TDX confidential VMs and NVIDIA H200 GPUs in confidential-computing mode.
- Attestation: request fresh evidence with a client-supplied nonce; verify against Intel TDX and NVIDIA NRAS. Public deployment manifests: `github.com/nearai/cvm-compose-files`.
- Model catalog: `GET https://cloud-api.near.ai/v1/model/list`. Select only models whose metadata reports both `verifiable: true` and `attestationSupported: true` for Layer 2 extraction.
- Selected/proposed extraction model: `z-ai/glm-5.3-flash` (TEE-verifiable metadata, 1M context, structured outputs). Alternative: `deepseek-ai/DeepSeek-V4.1-Flash-1017` (verifiable, no structured-output metadata).
- Routing: only tokenized credit-agreement text and structured financial figures. Never send token maps, borrower identities or raw documents.
- Starter credit: advertised, but the exact amount must be verified in the dashboard before Phase 3.
- Required wording: “Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request can be verified against Intel TDX and NVIDIA NRAS attestation evidence.”
- Prohibited: “zero retention guaranteed”, “TEE protected” without attestation evidence, and “cryptographically proves the data was never logged”.

## OpenRouter — general model inference

- Base URL: `https://openrouter.ai/api/v1` (OpenAI-compatible).
- Auth: bearer token via `OPENROUTER_API_KEY`.
- Two configurable model IDs: `OPENROUTER_MODEL_JUDGEMENT` and `OPENROUTER_MODEL_GENERATION`.
- Proposed models: `openai/gpt-5.4-mini` for judgement and `deepseek/deepseek-v3.2` for generation.
- Routing: SERV judgement and generation nodes receive only structured, already-extracted data — never raw documents.
- This is not the confidential Layer 2 path. Do not send tokenized agreement text, token maps, borrower identities or raw documents here.

## Dolphin — evaluated and rejected

Dolphin was evaluated and rejected because its confidentiality mechanism is unverified: no TEE, no MPC and unverified zero-retention claims. Do not build a Dolphin adapter or add Dolphin endpoints, models, keys or privacy-verification flags. Historical references are superseded.

## Reppo — optional

Current public Evaluation API documentation advertises bearer authentication, `POST /api/v1/agents/eval-requests/submit`, `GET /{evalId}`, structured score/decision/confidence/critique/route, 10 free evaluations and then launch pricing of $0.01 per evaluation. Confirm current docs/quota/terms at setup time. Send only synthetic/de-identified content; do not send original credit agreements or actual financials. Disabled by default.

## Kite Passport / x402 — optional

Kite documentation describes passkey-approved spending sessions with a per-payment cap, total budget and expiry, and payment for x402 services. Confirm current CLI/SDK commands, testnet, supported assets and catalog services. The deterministic Assay policy engine must check service allowlist, asset, per-payment cap, total remaining budget, session expiry and idempotency. No wallet funding or testnet spend without explicit operator authorization.

### Testnet integration state — 15 November 2026

- Testnet user: `user_01a1dfab-06b7-7b42-b03c-111a2805c175`.
- Testnet wallet funded with `100 PIEUSD` from the faucet.
- Active session: `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`.
- Delegation: `5 PIEUSD` per transaction, `20 PIEUSD` total, `24h` TTL, asset `PIEUSD`; expires `2026-11-16T15:11:32.17177Z`.
- The Phase 3 adapter must use this approved session (or a newly approved successor) and enforce the same caps in the deterministic policy engine before any payment call. It must never auto-approve a session or bypass the caps.
- The x402 smoke payment is **provider-blocked**: two identical calls with idempotency key `assay-kite-smoke-1457e791-3c4f-45f9-ade5-16e0749b117c` returned `internal error`; no activity event, receipt or spend exists.
- The over-cap policy test succeeded: a temporary `0.05 PIEUSD` session rejected a `0.1 PIEUSD` request with `session_rule_exceeded` (exit 6) and no payment event.
- Do not represent the provider-blocked smoke payment as successful. Do not retry again without a provider change or new operator instruction.

## Presidio — mandatory reduced mode on Render free tier

Use Microsoft Presidio Analyzer and Anonymizer with the small spaCy model plus deterministic custom recognizers for the demo’s borrower reference, loan/facility reference and account-like patterns. The deployed service is labelled `REDUCED_PII_MODE`; it is not full-strength Presidio and must not be described as such. Full `en_core_web_lg` is not deployed on Render’s free 512 MB web service. Analysts must review redaction; unresolved cases block model calls. No paid Render upgrade is authorized.

## Neon — mandatory data/auth dependency

Neon provides Postgres and managed Better Auth. Private S3-compatible storage holds encrypted documents and exports. Database/auth secrets remain server-only. Preview and development use separate projects/branches. No public object bucket.

## Vercel — frontend preview

Hobby/free plan only unless the operator raises the budget. Preview deployment requires explicit operator permission; production is not authorized.

## Render — API and Presidio host

Free web services only; 512 MB RAM, no persistent local disk and possible sleep. Persistent data belongs in Neon. Free Render Postgres is not used because it expires after 30 days. No paid plan, disk or add-on without explicit budget authority.

## Google Gemini TTS — demo only

Check current official Gemini TTS model availability and free-tier limits on the day of production. Use only public narration text because Google’s free tier may use input for product improvement. No billing/paid plan without permission. If unavailable or unsuitable, use a local free TTS model/tool with checked license.

## Disabled by default

- Reppo: optional; enable only after synthetic-data authorization.
- Kite: testnet session enabled; payment path is provider-blocked and the over-cap policy rejection is verified.
