# Third-party Integrations

**Provider revision:** 15 November 2026. This file supersedes the historical Dolphin integration description in the blueprint and `docs/`.

## OpenServ SERV Reasoning — mandatory orchestration

Live endpoint: `https://inference-api.openserv.ai/v1`. The account catalog was verified and `serv-standard` returns the exact configured model ID. Extraction and calculation each call SERV with an explicit system prompt and strict JSON contract; a missing system prompt or invalid contract fails the run. SERV is the bounded reasoning/orchestration layer; application code owns the state machine and deterministic checks. Never claim a graph, Shadow Agent or PromptGuard feature was executed without runtime evidence.

## NEAR AI Cloud — Layer 2 confidential inference

- Base URL: `https://cloud-api.near.ai/v1` (OpenAI-compatible gateway).
- Auth: bearer token via `NEARAI_API_KEY`.
- Confidential compute: Intel TDX confidential VMs and NVIDIA H200 GPUs in confidential-computing mode.
- Attestation: request fresh evidence with a client-supplied nonce; verify against Intel TDX and NVIDIA NRAS. Public deployment manifests: `github.com/nearai/cvm-compose-files`.
- Model catalog: `GET https://cloud-api.near.ai/v1/model/list`. Select only models whose metadata reports both `verifiable: true` and `attestationSupported: true` for Layer 2 extraction.
- Selected extraction model: `z-ai/glm-5.3-flash` (`verifiable=true`, `attestationSupported=true`, exact model ID returned).
- Runtime attestation: `NearAIClient.attestedExtraction()` fetches a fresh report, verifies Intel TDX via `@phala/dcap-qvl`, verifies NVIDIA NRAS, binds the TDX report data to the response signer + nonce, verifies the response ECDSA signature and request/response hashes, and checks the compose-manager quote. Failure blocks terms.
- Routing: only tokenized credit-agreement text and structured financial figures. Never send token maps, borrower identities or raw documents.
- Starter credit: advertised, but the exact amount must be verified in the dashboard before Phase 3.
- Required wording: “Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request can be verified against Intel TDX and NVIDIA NRAS attestation evidence.”
- Prohibited: “zero retention guaranteed”, “TEE protected” without attestation evidence, and “cryptographically proves the data was never logged”.

## OpenRouter — general model inference

- Base URL: `https://openrouter.ai/api/v1` (OpenAI-compatible).
- Auth: bearer token via `OPENROUTER_API_KEY`.
- Two configurable model IDs: `OPENROUTER_MODEL_JUDGEMENT` and `OPENROUTER_MODEL_GENERATION`.
- Verified models: `openai/gpt-4o-mini` for judgement and `deepseek/deepseek-v3.2` for generation. Both exist in the catalog and returned exact IDs in live calls.
- Routing: SERV judgement and generation nodes receive only structured, already-extracted data — never raw documents.
- This is not the confidential Layer 2 path. Do not send tokenized agreement text, token maps, borrower identities or raw documents here.

## Dolphin — evaluated and rejected

Dolphin was evaluated and rejected because its confidentiality mechanism is unverified: no TEE, no MPC and unverified zero-retention claims. Do not build a Dolphin adapter or add Dolphin endpoints, models, keys or privacy-verification flags. Historical references are superseded.

## Reppo — optional

Reppo remains disabled. The API surface returns `503 PROVIDER_DISABLED` for submission and stores only synthetic correction records locally. No score, decision or cost is fabricated. Enable only after the current synthetic-only contract, quota and terms are verified.

## Kite Passport / x402 — optional

Kite documentation describes passkey-approved spending sessions with a per-payment cap, total budget and expiry, and payment for x402 services. Confirm current CLI/SDK commands, testnet, supported assets and catalog services. The deterministic Assay policy engine must check service allowlist, asset, per-payment cap, total remaining budget, session expiry and idempotency. No wallet funding or testnet spend without explicit operator authorization.

### Testnet integration state — 15 November 2026

- Testnet user: `user_01a1dfab-06b7-7b42-b03c-111a2805c175`.
- Testnet wallet funded with `100 PIEUSD` from the faucet.
- Active session: `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`.
- Delegation: `5 PIEUSD` per transaction, `20 PIEUSD` total, `24h` TTL, asset `PIEUSD`; expires `2026-11-16T15:11:32.17177Z`.
- The Phase 3 adapter must use this approved session (or a newly approved successor) and enforce the same caps in the deterministic policy engine before any payment call. It must never auto-approve a session or bypass the caps.
- The x402 smoke payment is **provider-blocked**: the approved call returned an upstream provider internal error; no activity event, receipt or spend exists. The API performs the deterministic local session/asset/cap/expiry check and then returns `503 PROVIDER_BLOCKED` without calling x402.
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
