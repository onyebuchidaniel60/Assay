# Configuration

Use `.env.example` as the canonical environment variable list. The complete variable matrix is in `MASTER_BLUEPRINT.md` §23; the Phase 0 provider revision below overrides any historical Dolphin entries. `.env.example` will be created in Phase 1 with placeholders only.

## Client-safe values

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `API_PUBLIC_URL`

The anon key is not a secret, but table/storage access still requires RLS and server authorization. Never place any provider API key in `NEXT_PUBLIC_*`.

## Server-only secrets

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SERV_REASONING_API_KEY`, `NEARAI_API_KEY`, `OPENROUTER_API_KEY`, `REPPO_API_KEY`, `PRESIDIO_SERVICE_TOKEN`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64` and any optional Kite credentials. Never prefix them with `NEXT_PUBLIC_`.

## Model and provider configuration

- `NEARAI_BASE_URL=https://cloud-api.near.ai/v1`
- `NEARAI_API_KEY` — secret, server-only.
- `NEARAI_MODEL=z-ai/glm-5.3-flash` — must be a TEE-verifiable model with `verifiable: true` and `attestationSupported: true` metadata.
- `NEARAI_ATTESTATION_REQUIRED=true` — rejects extraction output without fresh Intel TDX/NVIDIA NRAS evidence bound to the request nonce.
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
- `OPENROUTER_API_KEY` — secret, server-only.
- `OPENROUTER_MODEL_JUDGEMENT=openai/gpt-5.4-mini`
- `OPENROUTER_MODEL_GENERATION=deepseek/deepseek-v3.2`
- `SERV_BASE_URL=https://inference-api.openserv.ai/v1`
- `SERV_REASONING_API_KEY` — secret, server-only.
- `SERV_MODEL` — non-secret catalog entry confirmed in the OpenServ account.

Do not add `DOLPHIN_BASE_URL`, `DOLPHIN_API_KEY`, `DOLPHIN_MODEL` or `DOLPHIN_PRIVACY_TERMS_VERIFIED` to `.env.example`, application config or deployment settings. Dolphin is rejected.

## Provider flags

- `NEARAI_ATTESTATION_REQUIRED=true` by default. Do not accept un-attested Layer 2 output.
- `REPPO_ENABLED=false` until key, quota and synthetic-only payload contract are verified.
- `KITE_ENABLED=true` for the authorized Kite testnet integration. Kite does not use an API key; authentication is via the passkey-approved wallet session.
- `ENABLE_DEMO_SHRED=false` outside a controlled synthetic demo.
- `PRESIDIO_MODE=REDUCED_PII_MODE` — Presidio Analyzer with the small spaCy model plus deterministic custom financial recognizers. This is not full-strength Presidio.

### Kite testnet configuration

- `KITE_PASSPORT_API=https://agentpassport.ai/api`
- `KITE_TEST_X402_ENDPOINT=https://passport.dev.gokite.ai/x402/test`
- `KITE_TESTNET_ASSET=PIEUSD`
- `KITE_SESSION_ID=agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`
- `KITE_MAX_PER_PAYMENT_MINOR=500`
- `KITE_MAX_TOTAL_MINOR=2000`
- `KITE_SESSION_EXPIRY=2026-11-16T15:11:32.17177Z`

The adapter must enforce `KITE_MAX_PER_PAYMENT_MINOR` and `KITE_MAX_TOTAL_MINOR` deterministically before calling Kite. The current session is an approved testnet grant; it is not a production payment authorization. No Kite API key or wallet material is stored in the repository.

## Environment separation

Use separate Supabase projects and service keys for local development, preview and any production environment. Do not reuse a production key in a preview deployment. Preview must never connect to production borrower records. Production is out of scope and unauthorized by default.

The app validates the environment with Zod at startup. Logs may show variable names that are missing, never values. Provider failures must be visible; never fabricate an inference, Reppo verdict or payment receipt.
