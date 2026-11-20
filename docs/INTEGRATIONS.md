# Third-party Integrations

**Provider revision:** 20 November 2026. This file supersedes the historical Dolphin and Kite integration descriptions in the blueprint and `docs/`. Kite is archived only.

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

## Arc Testnet / Circle Gateway — implemented payment rail

- **Provider:** Circle Gateway nanopayments via the official `@circle-fin/x402-batching@4.0.0` SDK and viem.
- **Network:** Arc Testnet `eip155:5042002`; chain ID `5042002`; USDC `0x3600000000000000000000000000000000000000`; Gateway Wallet `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`; Gateway domain `26`; facilitator `https://gateway-api-testnet.circle.com`.
- **Flow:** real 402 requirement -> deterministic policy -> explicit analyst authorisation -> Postgres `payment.execute` job -> signed EIP-3009 authorization -> receipt/transfer verification. A timeout becomes `RECONCILIATION_REQUIRED`; the worker looks up the original nonce and never blindly repays.
- **Security:** server-side key only; no key in the browser or database; network/asset/recipient/allowlist/cap checks; execution off by default.
- **Verified:** SDK config matches the official Circle values; facilitator reachable and supports Arc Testnet USDC; local mock x402 server tests cover signing, receipt confirmation, missing receipt, timeout, duplicate-payment and insufficient-balance handling.
- **Not claimed:** no live paid financial-data retrieval. Circle Discovery returned zero `FINANCIAL_ANALYSIS` services on Arc Testnet on 20 November 2026, and no testnet funds were supplied. See [PAYMENTS_ARCHITECTURE.md](PAYMENTS_ARCHITECTURE.md).

## Financial data providers

### SEC EDGAR — free public evidence

Implemented with a descriptive `SEC_EDGAR_USER_AGENT`, CIK/ticker resolution, XBRL `companyfacts` parsing, annual-period selection, provenance, content hash and explicit public-company limitations. On 20 November 2026 this development host received **HTTP 403 from AkamaiGHost** for SEC endpoints; the adapter surfaces `PROVIDER_UNAVAILABLE` and does not fabricate a result. Re-probe the deployed Render egress before claiming live SEC evidence. Evidence fixtures and validation tests pass.

### Financial Datasets — preferred candidate, not Arc-compatible

The live 402 terms on 20 November 2026 offered **Base mainnet** (`eip155:8453`) USDC only, with a Non-Professional x402 licence. It does not accept Arc Testnet or Circle Gateway on Arc. Assay implements the adapter, marks it incompatible, rejects it at the network policy check and does not bridge or relabel the payment. No API key is configured, so no retrieval is claimed.

### LoneStar Oracle EquityScope — Arc mainnet quote only

Circle Discovery lists a real financial-data endpoint with an **Arc mainnet** (`eip155:5042`) USDC option at 0.05 USDC per request. Assay parses the actual quote and persists a deterministic `payment_network_forbidden` rejection under the default testnet-only policy. No mainnet funds are authorised and no payment was made.

## Archived Kite evidence

The failed Kite Passport integration is preserved for development history in [archive/KITE_REMOVAL.md](archive/KITE_REMOVAL.md). It is not an active dependency, route or setup instruction.

## Presidio — mandatory reduced mode on Render free tier

Use Microsoft Presidio Analyzer and Anonymizer with the small spaCy model plus deterministic custom recognizers for the demo’s borrower reference, loan/facility reference and account-like patterns. The deployed service is labelled `REDUCED_PII_MODE`; it is not full-strength Presidio and must not be described as such. Full `en_core_web_lg` is not deployed on Render’s free 512 MB web service. Analysts must review redaction; unresolved cases block model calls. No paid Render upgrade is authorized.

## Neon — mandatory data/auth dependency

Neon provides Postgres and managed Better Auth. Private S3-compatible storage holds encrypted documents and exports. Database/auth secrets remain server-only. Preview and development use separate projects/branches. No public object bucket.

## Vercel — frontend hosting

Hobby/free plan only. The production deployment is public at `https://assay-uhhh2.vercel.app` (production domain `https://assay-omega-gray.vercel.app`) at commit `9e9f054`; Vercel Authentication is disabled and the app keeps its own invite-only sign-in. Vercel Toolbar feedback is disabled for production and preview. No paid plan, domain or add-on without explicit budget authority.

## Render — API and Presidio host

Free web services only; 512 MB RAM, no persistent local disk and possible sleep. Persistent data belongs in Neon. Free Render Postgres is not used because it expires after 30 days. No paid plan, disk or add-on without explicit budget authority.

## Demo TTS

Google Gemini TTS was not used: no Google AI/TTS credential or free-tier activation is present. The demo uses Microsoft Edge TTS (`edge-tts`, free, no account) with `en-US-AndrewNeural`; only the public narration script is sent. No billing was enabled.

## Integration state

- Reppo: **LIVE** — one real synthetic evaluation completed; score 98, decision `accept`, confidence `low`, route `review`, 440 credits.
- Arc Testnet / Circle Gateway: **IMPLEMENTED, NOT LIVE-PAID** — verified SDK/config/facilitator, deterministic policy and mock-x402 tests; no live settlement or paid evidence retrieval claimed.
- SEC EDGAR: **IMPLEMENTED, LIVE RETRIEVAL BLOCKED FROM THIS HOST** — HTTP 403 from SEC/Akamai on 20 November 2026; fixtures and validation pass. Re-probe Render before claiming live data.
- Financial Datasets: **ADAPTER ONLY, NOT ARC-COMPATIBLE** — Base mainnet x402; no key; no payment or retrieval claimed.
- LoneStar Oracle: **QUOTE-ONLY, POLICY-RESTRICTED** — Arc mainnet; default policy rejects `eip155:5042`; no payment claimed.
- Kite: **REMOVED** — historical provider-blocked evidence is archived at [archive/KITE_REMOVAL.md](archive/KITE_REMOVAL.md); no active dependency remains.
