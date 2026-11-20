# Configuration

Use `.env.example` as the canonical environment variable list. The complete variable matrix is in `MASTER_BLUEPRINT.md` §23; the Phase 0 provider revision below overrides any historical entries. Neon is the sole database/auth layer.

## Client-safe values

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`

`NEON_AUTH_BASE_URL` and `NEON_AUTH_API_KEY` are server-side. Auth flows are proxied through the Fastify API; do not expose auth service keys in the browser. Never place a provider secret in `NEXT_PUBLIC_*`.

## Server-only secrets

`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_API_KEY`, `NEON_AUTH_COOKIE_SECRET`, `NEON_STORAGE_BUCKET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SERV_REASONING_API_KEY`, `NEARAI_API_KEY`, `OPENROUTER_API_KEY`, `REPPO_API_KEY`, `REPPO_BASE_URL`, `PRESIDIO_SERVICE_TOKEN`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64`, `AUDIT_SIGNING_PUBLIC_KEY_BASE64`, `ARC_TESTNET_PRIVATE_KEY`, `ARC_TESTNET_PAYER_ADDRESS`, `CIRCLE_GATEWAY_FACILITATOR_URL`, payment allowlists/caps, `SEC_EDGAR_USER_AGENT` and optional `FINANCIAL_DATASETS_API_KEY`. Never prefix them with `NEXT_PUBLIC_`.

## Model and provider configuration

- `NEARAI_BASE_URL=https://cloud-api.near.ai/v1`
- `NEARAI_API_KEY` — secret, server-only.
- `NEARAI_MODEL=z-ai/glm-5.3-flash` — verified TEE-verifiable model with `verifiable: true` and `attestationSupported: true` metadata.
- `NEARAI_ATTESTATION_REQUIRED=true` — rejects extraction output without fresh Intel TDX/NVIDIA NRAS evidence bound to the request nonce.
- `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
- `OPENROUTER_API_KEY` — secret, server-only.
- `OPENROUTER_MODEL_JUDGEMENT=openai/gpt-4o-mini`
- `OPENROUTER_MODEL_GENERATION=deepseek/deepseek-v3.2`
- `SERV_BASE_URL=https://inference-api.openserv.ai/v1`
- `SERV_REASONING_API_KEY` — secret, server-only.
- `SERV_MODEL=serv-standard` — confirmed in the OpenServ catalog; the provider returns the exact model ID.

Do not add `DOLPHIN_BASE_URL`, `DOLPHIN_API_KEY`, `DOLPHIN_MODEL` or `DOLPHIN_PRIVACY_TERMS_VERIFIED` to `.env.example`, application config or deployment settings. Dolphin is rejected.

## Provider flags

- `NEARAI_ATTESTATION_REQUIRED=true` by default. Do not accept un-attested Layer 2 output.
- `REPPO_ENABLED=true` with a server-side `REPPO_API_KEY`. The adapter uses the live `https://eval.reppo.xyz/api/v1/agents/evals` endpoints, a 50 KB preflight, de-identified correction traces and 60-second polling capped at 10/15/30 minutes.
- `ARC_PAYMENTS_ENABLED=false` by default. Set to `true` only with the allowlists, caps and session expiry below.
- `PAYMENT_EXECUTION_ENABLED=false` by default. Live signing requires both this and `PAYMENT_DRY_RUN=false`.
- `PAYMENT_DRY_RUN=true` by default. A dry run can quote and show policy decisions but never signs or pays.
- `ENABLE_DEMO_SHRED=false` outside a controlled synthetic demo.
- `PRESIDIO_MODE=REDUCED_PII_MODE` — Presidio Analyzer with the small spaCy model plus deterministic custom financial recognizers. This is not full-strength Presidio.

### Neon configuration

- `DATABASE_URL` — pooled Neon Postgres connection string.
- `DATABASE_URL_UNPOOLED` — direct connection for migrations where required.
- `NEON_AUTH_BASE_URL` — managed Better Auth project URL.
- `NEON_AUTH_API_KEY` — server-side auth service key.
- `NEON_AUTH_COOKIE_SECRET` — high-entropy cookie/session secret.
- `NEON_STORAGE_BUCKET=assay-private-documents` — private object bucket.
- `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — S3-compatible private storage.

### Arc Testnet / Circle Gateway configuration

Verified values are in [PAYMENTS_ARCHITECTURE.md](PAYMENTS_ARCHITECTURE.md). The default is fail-closed.

- `ARC_NETWORK=eip155:5042002` — only Arc Testnet is accepted by the provider.
- `ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network`
- `ARC_TESTNET_PRIVATE_KEY=` — server-side only, never `NEXT_PUBLIC_*`, never committed. Generate an isolated test wallet and keep the key outside Git.
- `ARC_TESTNET_PAYER_ADDRESS=` — public address for balance/status reads; must match the key if both are set.
- `CIRCLE_GATEWAY_FACILITATOR_URL=https://gateway-api-testnet.circle.com`
- `PAYMENT_SESSION_ID=assay-arc-testnet-session-1`
- `PAYMENT_SESSION_EXPIRES_AT=` — required for a usable session; ISO-8601.
- `PAYMENT_MAX_PER_TX_MINOR=100000` — 0.10 USDC in 6-decimal minor units.
- `PAYMENT_MAX_TOTAL_MINOR=500000` — 0.50 USDC in 6-decimal minor units.
- `PAYMENT_ALLOWED_PROVIDERS=` — comma-separated financial provider IDs, for example `lonestar-oracle`.
- `PAYMENT_ALLOWED_ENDPOINTS=` — comma-separated exact URLs; origin + path is the allowlist boundary.
- `PAYMENT_ALLOWED_RECIPIENTS=` — comma-separated seller wallet addresses.
- `PAYMENT_ALLOWED_NETWORKS=eip155:5042002`
- `PAYMENT_ALLOWED_ASSETS=0x3600000000000000000000000000000000000000`
- `PAYMENT_REQUEST_TIMEOUT_MS=20000`
- `PAYMENT_RECONCILE_INTERVAL_SECONDS=60`
- `PAYMENT_RECONCILE_MAX_ATTEMPTS=10`

The payment session row is created once per `PAYMENT_SESSION_ID` and is authoritative for the aggregate budget. Changing caps requires a new session ID; the UI/API has no way for an agent to edit its own limits.

```bash
# Inspect config and facilitator support without signing
node scripts/check-arc-config.mjs

# Deposit/withdraw are explicit operator actions with --confirm
ARC_TESTNET_PRIVATE_KEY=... node scripts/arc-gateway-deposit.mjs --amount 0.50 --confirm
```

### Financial-data configuration

- `SEC_EDGAR_USER_AGENT=` — descriptive operator contact. SEC fair-access rules require it. The app refuses live SEC retrieval without it. The current development host receives HTTP 403 from SEC/Akamai; probe the deployed egress before claiming live SEC evidence.
- `FINANCIAL_DATASETS_API_KEY=` — optional; licensed API-key path only. The documented x402 path is Base mainnet and is not Arc-compatible.
- `FINANCIAL_DATASETS_BASE_URL=https://api.financialdatasets.ai`
- `LONESTAR_ORACLE_BASE_URL=https://equity.lonestaroracle.xyz` — real Circle Discovery financial-data provider with an Arc mainnet option; default policy rejects mainnet.

### Kite removal

Kite Passport, Kite SDKs, `PIEUSD`, `gokite.ai`, Kite sessions and Kite wallet material are removed. There are no active `KITE_*` variables. Do not reintroduce them; use the Arc variables above.

## Jobs and auth

- `WORKER_ENABLED=true` runs the in-process Postgres job poller. The worker claims `analysis.parse` and `analysis.extract` jobs with `FOR UPDATE SKIP LOCKED`.
- Public sign-up is disabled in Neon Auth (`email_and_password.disableSignUp=true`). Provision staff accounts in Neon, then run `ALLOW_DEMO_SEED=true pnpm seed:workspace` to create profiles/memberships. Seed scripts refuse `APP_ENV=production`. The web session-data cache TTL is 60 seconds; the API strips `local.session_data` so every protected API request revalidates the Neon Auth session token and loads the current profile status.

## Environment separation

Use separate Neon projects/branches and storage credentials for local development, preview and any production environment. Do not reuse a production key in a preview deployment. Preview must never connect to production borrower records. The current production deployment uses the synthetic demo project after the full test/security matrix passed; future releases must repeat that gate.

The app validates the environment with Zod at startup. Logs may show variable names that are missing, never values. Provider failures must be visible; never fabricate an inference, Reppo verdict or payment receipt.
