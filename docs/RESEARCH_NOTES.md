# Research Notes — Current Platform / Provider Checks

**Checked:** 15 November 2026. Re-check during Phase 0 before activation; pricing, limits and API details may change.

## Hosting

- Render lists web services and background workers, but its free-deployment documentation says free instances are for preview/testing and not production. Free web services have no persistent local disk; free Postgres databases expire 30 days after creation. Therefore the app uses Supabase Postgres for persistent data and avoids Render free Postgres. Render remains the API/Presidio host, with Postgres-backed job queue.
- Supabase pricing currently lists a free tier with 500 MB DB, 1 GB file storage and project pausing after one week of inactivity. It is suitable for demo constraints only, not a production SLA.
- Vercel Hobby is a free plan suited to personal and small projects; verify project policy and resource limits in the account.

## Versions

- Node release schedule currently lists Node 26 as Active LTS and Node 24 as Maintenance LTS. The blueprint selects Node 24 for ecosystem compatibility and stability; pin exact runtime and re-evaluate if a required dependency supports only Node 26.
- Next.js 16 is currently Active LTS. Use latest patched stable 16.x; do not use canary.

## OpenServ

- Current public OpenServ materials show `https://inference-api.openserv.ai/v1` as a SERV-compatible base URL and use `SERV_REASONING_API_KEY` in examples. Verify the actual key, model catalog, graph features and credits in account.
- SERV is positioned as a structured reasoning engine; application code must still enforce domain contracts and deterministic rules.

## Dolphin partner identity caution

- Assay handoff identifies the OpenServ hackathon partner as `@dphnAI` and references `dphn.ai/API`, with DeepSeek V4.1 Flash.
- Current public results for `dolphinllm.com` advertise a separate API with model ID `uncensored`; its public description does not match the hackathon partner described in the handoff. Do not use that hostname or model as a substitute.
- `dphn.ai` could not be fully opened by the web research tool (403), so exact endpoint/auth/model/privacy claims remain intake verification items. Do not infer them from name similarity.

## Reppo

- Reppo public Evaluation API page advertises `POST https://eval.reppo.xyz/api/v1/agents/eval-requests/submit`, bearer key, GET by evaluation ID, structured verdict fields and async settlement windows. It advertises 10 free evaluations then launch price $0.01/evaluation. Confirm current conditions on the actual account; use synthetic/de-identified payloads only.

## Kite

- Kite Passport docs describe passkey-approved spending sessions with per-payment and total limits plus expiry, and x402 service payments. A spending session controls agent payments, not business/credit approvals. Verify current CLI/SDK and testnet details before implementation.

## Presidio and proofs

- Microsoft Presidio Analyzer supports built-in and custom recognizers; the app adds domain-specific recognizers and analyst review.
- Circom/SnarkJS docs show proof verification against a verification key and public inputs/outputs. Assay's proof claim must be limited to the exact fixed inequality and supplied witness.

## Demo TTS

- Current Gemini API pricing lists free tiers for Gemini TTS models, but indicates free-tier content may be used to improve Google products. Use only the public narration script and check exact model quota/terms again during Phase 8. Do not enable paid billing without authorization.

## Source links

- Render pricing: https://render.com/pricing
- Render free deploy limits: https://render.com/docs/free
- Render background workers: https://render.com/docs/background-workers
- Supabase pricing: https://supabase.com/pricing
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby
- Node release schedule: https://nodejs.org/en/about/previous-releases
- Next.js support policy: https://nextjs.org/support-policy
- OpenServ reasoning: https://www.openserv.ai/reasoning
- OpenServ main: https://www.openserv.ai/
- Kite Passport: https://docs.gokite.ai/passport
- Kite allowance and sessions: https://docs.gokite.ai/passport/payments/allowance
- Reppo Evaluation API: https://www.reppofoundation.org/evaluation-api
- Presidio Analyzer: https://microsoft.github.io/presidio/analyzer/
- Circom proof verification: https://docs.circom.io/getting-started/proving-circuits/
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing/
- Gemini speech generation: https://ai.google.dev/gemini-api/docs/speech-generation
- Dolphin partner reference from handoff: https://dphn.ai/API
