# Third-party Integrations

**Provider revision:** 21 November 2026. This file supersedes the historical Dolphin and Kite integration descriptions in the blueprint and `docs/`. Kite is archived only.

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

## Arc Mainnet x402 exact — LIVE payment rail

- **Provider:** standard onchain x402 `exact` via `@x402/evm`, USDC EIP-3009, and viem.
- **Network:** Arc Mainnet `eip155:5042`; chain ID `5042`; USDC `0x3600000000000000000000000000000000000000`; merchant `0xeF2a4B6756895aAf1374640dcFCD4947959442ab`; seller facilitator settles `transferWithAuthorization`.
- **Flow:** fresh 402 requirement -> deterministic policy -> explicit analyst authorisation -> Postgres `payment.execute` job -> signed EIP-3009 authorization -> provider receipt and onchain verification. A timeout becomes `RECONCILIATION_REQUIRED`; the worker looks up the original authorization by nonce and never blindly repays.
- **Security:** server-side key only; no key in the browser or database; provider/endpoint/network/asset/recipient/allowlist/cap/expiry/idempotency checks; execution off by default.
- **Live proof (20 November 2026):** one 0.05 USDC payment for `AAPL` from LoneStar Oracle settled in transaction `0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134`. The provider returned `success: true`; the USDC `authorizationState` is `true`; the wallet moved from 0.93 to 0.88 USDC; the returned fundamentals were stored as `VALID`, encrypted, source-linked evidence. Full record: [evidence/payments-2026-11-20/EVIDENCE.md](evidence/payments-2026-11-20/EVIDENCE.md).
- **Limits:** the production session cap was exactly 50,000 atomic units per payment and 50,000 in total, so a second payment could not pass the policy. Execution was disabled immediately after settlement.

## Arc Testnet / Circle Gateway — preserved payment rail

- **Provider:** Circle Gateway nanopayments via the official `@circle-fin/x402-batching@4.0.0` SDK and viem.
- **Network:** Arc Testnet `eip155:5042002`; chain ID `5042002`; USDC `0x3600000000000000000000000000000000000000`; Gateway Wallet `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`; Gateway domain `26`; facilitator `https://gateway-api-testnet.circle.com`.
- **Flow:** same deterministic quote/policy/authorisation/jobs/audit pipeline, with Gateway receipt/transfer verification instead of Mainnet EIP-3009 settlement.
- **Verified:** SDK config matches the official Circle values; facilitator reachable and supports Arc Testnet USDC; local mock x402 server tests cover signing, receipt confirmation, missing receipt, timeout, duplicate-payment and insufficient-balance handling.
- **Not claimed:** no live Testnet financial-data retrieval. Circle Discovery returned zero `FINANCIAL_ANALYSIS` services on Arc Testnet on 20 November 2026, and no testnet funds were supplied. The adapter is preserved, not repurposed for Mainnet.

## Financial data providers

### SEC EDGAR — free public evidence

Implemented with a descriptive `SEC_EDGAR_USER_AGENT`, CIK/ticker resolution, XBRL `companyfacts` parsing, annual-period selection, provenance, content hash and explicit public-company limitations. On 20 November 2026 this development host received **HTTP 403 from AkamaiGHost** for SEC endpoints; the adapter surfaces `PROVIDER_UNAVAILABLE` and does not fabricate a result. Re-probe the deployed Render egress before claiming live SEC evidence. Evidence fixtures and validation tests pass.

### Financial Datasets — preferred candidate, not Arc-compatible

The live 402 terms on 20 November 2026 offered **Base mainnet** (`eip155:8453`) USDC only, with a Non-Professional x402 licence. It does not accept Arc Testnet or Circle Gateway on Arc. Assay implements the adapter, marks it incompatible, rejects it at the network policy check and does not bridge or relabel the payment. No API key is configured, so no retrieval is claimed.

### LoneStar Oracle EquityScope — Arc Mainnet standard x402 exact

Circle Discovery lists a real financial-data endpoint with an **Arc Mainnet** (`eip155:5042`) USDC option at 0.05 USDC per request. The live option is **standard onchain x402 exact** (`assetTransferMethod: eip3009`), not Circle Gateway batching. Assay implements `ArcX402ExactProvider` for this rail and completed one authorized 0.05 USDC payment and AAPL retrieval on 20 November 2026. The transaction, provider receipt, authorization state, normalized facts and audit events are recorded in [evidence/payments-2026-11-20/EVIDENCE.md](evidence/payments-2026-11-20/EVIDENCE.md).

## Archived Kite evidence

The failed Kite Passport integration is preserved for development history in [archive/KITE_REMOVAL.md](archive/KITE_REMOVAL.md). It is not an active dependency, route or setup instruction.

## Presidio — mandatory reduced mode on Render free tier

Use Microsoft Presidio Analyzer and Anonymizer with the small spaCy model plus deterministic custom recognizers for the demo’s borrower reference, loan/facility reference and account-like patterns. The deployed service is labelled `REDUCED_PII_MODE`; it is not full-strength Presidio and must not be described as such. Full `en_core_web_lg` is not deployed on Render’s free 512 MB web service. Analysts must review redaction; unresolved cases block model calls. No paid Render upgrade is authorized.

## Neon — mandatory data/auth dependency

Neon provides Postgres and managed Better Auth. Private S3-compatible storage holds encrypted documents and exports. Database/auth secrets remain server-only. Preview and development use separate projects/branches. No public object bucket.

## Vercel — frontend hosting

Hobby/free plan only. The production deployment is public at `https://assay-uhhh2.vercel.app` (production domain `https://assay-omega-gray.vercel.app`) at the current `main` deployment; Vercel Authentication is disabled and the app keeps its own invite-only sign-in. Vercel Toolbar feedback is disabled for production and preview. No paid plan, domain or add-on without explicit budget authority.

## Render — API and Presidio host

Free web services only; 512 MB RAM, no persistent local disk and possible sleep. Persistent data belongs in Neon. Free Render Postgres is not used because it expires after 30 days. No paid plan, disk or add-on without explicit budget authority.

## Demo TTS

Final narration uses ElevenLabs text-to-speech with the operator-approved **George - Warm, Captivating Storyteller** voice (`JBFqnCBsd6RMkjVDRZzb`) and `eleven_v4`. The API key is stored outside Git at `/root/assay-secrets/elevenlabs.env` (mode 600); only the narration script is sent. An earlier draft used `edge-tts`; the published video is the ElevenLabs version.

## Integration state

- Reppo: **LIVE** — one real synthetic evaluation completed; score 98, decision `accept`, confidence `low`, route `review`, 440 credits.
- Arc Mainnet x402 exact: **LIVE — ONE PAYMENT CONFIRMED** — 0.05 USDC to LoneStar Oracle in transaction `0xc0a9997f…a9e134`; provider receipt `success: true`; AAPL fundamentals retrieved and stored as encrypted evidence; audit chain `VALID:32`.
- Arc Testnet / Circle Gateway: **IMPLEMENTED, PRESERVED, NOT LIVE-PAID** — verified SDK/config/facilitator, deterministic policy and mock-x402 tests; no live settlement claimed.
- SEC EDGAR: **IMPLEMENTED, LIVE RETRIEVAL BLOCKED FROM THIS HOST** — HTTP 403 from SEC/Akamai on 20 November 2026; fixtures and validation pass. Re-probe Render before claiming live data.
- Financial Datasets: **ADAPTER ONLY, NOT ARC-COMPATIBLE** — Base mainnet x402; no key; no payment or retrieval claimed.
- LoneStar Oracle: **LIVE ARC MAINNET X402 EXACT** — one 0.05 USDC AAPL purchase settled and retrieved; execution disabled again after the single authorized payment.
- Kite: **REMOVED** — historical provider-blocked evidence is archived at [archive/KITE_REMOVAL.md](archive/KITE_REMOVAL.md); no active dependency remains.
