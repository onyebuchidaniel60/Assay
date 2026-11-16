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

## Reppo — LIVE synthetic feedback evaluation

- **Endpoint migration:** the legacy `/agents/eval-requests/submit` and `/agents/eval-requests/{evalId}` endpoints documented in the first blueprint were removed by the provider and now return HTML 404. Assay targets the live endpoints: `POST https://eval.reppo.xyz/api/v1/agents/evals` with `taskType`/`input`, and `GET https://eval.reppo.xyz/api/v1/agents/evals/{id}`. This deviation is recorded because the old contract is no longer callable.
- **Auth:** bearer `REPPO_API_KEY`, server-side only.
- **Payload:** only synthetic/de-identified correction traces built from an allowlist: correction type, changed field names, safe categorical values and the synthetic covenant threshold. Amounts, free text, borrower identity, token map, agreement text, document excerpts and witness data are excluded. A preflight check rejects payloads over 50 KB before any network call and rejects emails, account-like numbers, token-map placeholders and secret-like material.
- **Polling:** background `reppo.poll` job every 60 seconds; local cap selected per request at 10, 15 or 30 minutes. `PENDING` is displayed honestly. `FAILED` is stored with the exact provider error and is not retried blindly. `TIMEOUT`/poll-window expiry is distinct from provider failure.
- **Verdict storage:** provider status, score, decision, confidence, route, full result, credits charged and exact error fields are persisted in `reppo_evaluations`.
- **No authority:** Reppo does not approve a covenant, change a prompt, alter a calculation or trigger a payment.

### Live evaluation evidence — 16 November 2026

| Field | Value |
|---|---|
| Provider eval ID | `cmwikqtsn000f08l4y73d9a8m` |
| Local evaluation | `56cfd84f-acdc-457d-a673-c84cf0d0178c` |
| Submitted | `2026-11-16T01:18:00.352Z` |
| Status at submission | `PENDING` (provider `QUEUED`) |
| Final status | `COMPLETED` at `2026-11-16T01:19:06.641Z` |
| Score | `98 / 100` |
| Decision | `accept` |
| Confidence | `low` |
| Route | `review` |
| Credits charged | `440` |
| Payload size | `409 bytes` |
| Polling | 60 s interval; 10-minute cap; completed in ~66 s |

Returned verdict summary: the submission scored 98 and was accepted, but low confidence routed it to `review` for additional validation. Rubric: scope 100, safety 100, correctness 100, reversibility 88. Three evaluators were weighted (economic 98 vs equal-weight 86; score spread 16.9); the route decision was `review`. No sensitive data was sent or returned.

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

## Demo TTS

Google Gemini TTS was not used: no Google AI/TTS credential or free-tier activation is present. The demo uses Microsoft Edge TTS (`edge-tts`, free, no account) with `en-US-AndrewNeural`; only the public narration script is sent. No billing was enabled.

## Integration state

- Reppo: **LIVE** — one real synthetic evaluation completed; score 98, decision `accept`, confidence `low`, route `review`, 440 credits.
- Kite: testnet session enabled; both documented testnet endpoints are provider-blocked. `passport.dev.gokite.ai/x402/test` previously returned an upstream internal error; the second endpoint `x402.dev.gokite.ai/api/weather` did not resolve (DNS `ENOTFOUND`) on 16 November 2026. No payment was attempted through it, and the earlier endpoint was not retried a third time.
