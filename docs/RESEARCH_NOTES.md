# Research Notes — Current Platform / Provider Checks

**Checked:** 15 November 2026. Re-check during Phase 0 before activation; pricing, limits and API details may change.

## Hosting

- Render lists web services and background workers, but its free-deployment documentation says free instances are for preview/testing and not production. Free web services have no persistent local disk; free Postgres databases expire 30 days after creation. Therefore the app uses Neon Postgres for persistent data and avoids Render free Postgres. Render remains the API/Presidio host, with Postgres-backed job queue.
- Neon pricing currently lists a free tier with 500 MB DB, 1 GB file storage and project pausing after one week of inactivity. It is suitable for demo constraints only, not a production SLA.
- Vercel Hobby is a free plan suited to personal and small projects; verify project policy and resource limits in the account.

## Versions

- Node release schedule currently lists Node 26 as Active LTS and Node 24 as Maintenance LTS. The blueprint selects Node 24 for ecosystem compatibility and stability; pin exact runtime and re-evaluate if a required dependency supports only Node 26.
- Next.js 16 is currently Active LTS. Use latest patched stable 16.x; do not use canary.

## Provider revision — 15 November 2026

### NEAR AI Cloud — Layer 2 confidential inference

- Base URL: `https://cloud-api.near.ai/v1` (OpenAI-compatible gateway).
- Public model catalog: `GET https://cloud-api.near.ai/v1/model/list` returned HTTP 200 and 64 models. Fourteen text-output models report both `verifiable: true` and `attestationSupported: true`.
- Proposed extraction model: `z-ai/glm-5.3-flash` — TEE-verifiable metadata, 1,048,576-token context, structured outputs and JSON mode. The alternative `deepseek-ai/DeepSeek-V4.1-Flash-1017` is also verifiable but does not advertise structured outputs.
- Attestation: request fresh evidence with a client-supplied nonce and verify against Intel TDX and NVIDIA NRAS. Public deployment manifests: `github.com/nearai/cvm-compose-files`.
- The advertised starter credit is not treated as confirmed; verify the exact amount in the NEAR AI dashboard before Phase 3.
- Routing: only tokenized credit-agreement text and structured financial figures. Do not send token maps, borrower identities or raw documents.
- Required wording: “Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request can be verified against Intel TDX and NVIDIA NRAS attestation evidence.” Do not claim guaranteed zero retention or that cryptography proves data was never logged.

### OpenRouter — general inference

- Base URL: `https://openrouter.ai/api/v1` (OpenAI-compatible).
- Public model catalog returned HTTP 200 and 470 models.
- Proposed judgement model: `openai/gpt-5.4-mini` (400,000-token context). Proposed generation model: `deepseek/deepseek-v3.2` (163,840-token context).
- Routing: SERV judgement and generation nodes receive only structured, already-extracted data — never raw documents.
- No Assay-scoped API key is present. Model IDs and credits require operator confirmation.

### Dolphin — evaluated and rejected

Dolphin was evaluated and rejected because its confidentiality mechanism is unverified: no TEE, no MPC and unverified zero-retention claims. No Dolphin adapter, endpoint, model or environment variable will be implemented. Historical blueprint references are superseded by the Phase 0 intake.

## OpenServ

- Current public OpenServ materials show `https://inference-api.openserv.ai/v1` as a SERV-compatible base URL and use `SERV_REASONING_API_KEY` in examples. An unauthenticated probe returned HTTP 401, confirming the endpoint responds; the key, model catalog, graph features and credits remain unverified.
- SERV is the orchestration layer; its nodes call NEAR AI or OpenRouter. SERV does not itself perform inference. Application code must still enforce domain contracts and deterministic rules.
- Do not claim Shadow Agent, PromptGuard or graph-versioning execution without account/runtime evidence.

## Reppo

- Reppo public Evaluation API page advertises `POST https://eval.reppo.xyz/api/v1/agents/eval-requests/submit`, bearer key, GET by evaluation ID, structured verdict fields and async settlement windows. It advertises 10 free evaluations then launch price $0.01/evaluation. Confirm current conditions on the actual account; use synthetic/de-identified payloads only.

## Kite

- Kite Passport docs describe passkey-approved spending sessions with per-payment and total limits plus expiry, and x402 service payments. A spending session controls agent payments, not business/credit approvals. Verify current CLI/SDK and testnet details before implementation.

## Presidio and proofs

- Microsoft Presidio Analyzer supports built-in and custom recognizers; the app adds domain-specific recognizers and analyst review.
- Render's free web service is limited to 512 MB, which is insufficient for full Presidio with `en_core_web_lg`. The selected deployment mode is `REDUCED_PII_MODE`: Presidio Analyzer with the small spaCy model plus deterministic custom financial recognizers. This is not full-strength Presidio, must be labelled as reduced, and keeps analyst review mandatory. Full Presidio remains a local/paid-environment option. No paid Render upgrade is authorized.
- Circom/SnarkJS docs show proof verification against a verification key and public inputs/outputs. Assay's proof claim must be limited to the exact fixed inequality and supplied witness.

## Demo TTS

- Current Gemini API pricing lists free tiers for Gemini TTS models, but indicates free-tier content may be used to improve Google products. Use only the public narration script and check exact model quota/terms again during Phase 8. Do not enable paid billing without authorization.

## Source links

- Render pricing: https://render.com/pricing
- Render free deploy limits: https://render.com/docs/free
- Render background workers: https://render.com/docs/background-workers
- Neon pricing: https://neon.com/pricing
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Node release schedule: https://nodejs.org/en/about/previous-releases
- Next.js support policy: https://nextjs.org/support-policy
- OpenServ reasoning: https://www.openserv.ai/reasoning
- OpenServ main: https://www.openserv.ai/
- NEAR AI Cloud: https://cloud-api.near.ai/v1
- NEAR AI public deployment manifests: https://github.com/nearai/cvm-compose-files
- OpenRouter: https://openrouter.ai/api/v1
- Kite Passport: https://docs.gokite.ai/passport
- Kite allowance and sessions: https://docs.gokite.ai/passport/payments/allowance
- Reppo Evaluation API: https://www.reppofoundation.org/evaluation-api
- Presidio Analyzer: https://microsoft.github.io/presidio/analyzer/
- Circom proof verification: https://docs.circom.io/getting-started/proving-circuits/
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing/
- Gemini speech generation: https://ai.google.dev/gemini-api/docs/speech-generation
