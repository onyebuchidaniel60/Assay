# Deployment

## Environments

- **Local:** Neon development branch/project, synthetic fixtures, live providers only through verified server-side adapters.
- **Preview:** Vercel frontend, Render API/Presidio, Neon demo project. Synthetic fixtures only. Sandbox integrations. No production secrets/data/payments.
- **Production:** Vercel frontend `https://assay-omega-gray.vercel.app`, Render API/Presidio, Neon demo project. Render API deployed at `720f9a1` and Vercel UI at `4fe696e` for the 21 November 2026 Arc Mainnet release; the earlier payment update was `9e9f054`. Synthetic data only; Vercel Authentication is disabled and the app keeps its own invite-only sign-in.

## Platform allocation

**Render decision:** Option B — the Fastify API and Presidio run as Render free web services, while Neon owns persistent data. No Render Postgres/disk is used. Both services can sleep on the free tier; warm them before a demo.

- Vercel hosts the Next.js frontend and preview deployments.
- Render hosts Fastify API and Presidio service. The MVP worker loop runs in the API service and uses Postgres as its durable queue.
- Neon provides Postgres and Auth; private S3-compatible storage holds encrypted documents and exports.
- AI routing: SERV orchestrates; NEAR AI Cloud handles tokenized Layer 2 extraction with TEE attestation; OpenRouter handles structured judgement/generation. Dolphin is not deployed.
- Do not use Render free Postgres for persistent application data; its free database has a 30-day limit. Do not use local Render filesystem for documents; use private S3-compatible storage.
- Free service sleep/pause and quotas must be considered. A sleeping Render service can delay a demo; warm it before recording. Neon free projects may pause after inactivity and have storage/egress limits. Record actual plans during intake.

## Current production deployment

- **Frontend:** `https://assay-uhhh2.vercel.app` (public; deployment `assay-o65mwq19k-uhhh2.vercel.app`; production domain `https://assay-omega-gray.vercel.app`).
- **Commits:** Render API `720f9a1`; Vercel UI `4fe696e`. Previous payment update `9e9f054`.
- **Protection:** Vercel Authentication disabled; the app enforces invite-only Neon Auth sign-in. Vercel Toolbar feedback is off for production and preview.
- **API:** `https://assay-api-7hy0.onrender.com` (Render free web service, live at `720f9a1`, health `/health/ready`; worker enabled, Reppo live, Arc execution disabled).
- **Presidio:** `https://assay-presidio.onrender.com` (Render free Python service, `REDUCED_PII_MODE`).
- **State:** production analyst/manager/auditor journeys backed by Neon and the live providers. Synthetic data only.
- **Payment state (21 November 2026):** Arc Mainnet standard x402 exact is configured and one **0.05 USDC** LoneStar Oracle payment settled in transaction `0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134`. The provider receipt is `success: true`, `authorizationState` is true, the wallet moved from 0.93 to 0.88 USDC, and the AAPL fundamentals were stored as encrypted evidence. Execution is **disabled again** (`PAYMENT_EXECUTION_ENABLED=false`, `PAYMENT_DRY_RUN=true`); the session caps were exactly 50,000/50,000 atomic units and the budget is spent. Full evidence: `docs/evidence/payments-2026-11-20/EVIDENCE.md`.
- **Applied migration:** `0002_noisy_paibok.sql` adds `payment_sessions`, `payment_intents`, `payment_authorizations` and `external_evidence`.
- **Production environment names:** the pre-existing auth/API names plus `ARC_PAYMENTS_ENABLED`, `PAYMENT_EXECUTION_ENABLED`, `PAYMENT_DRY_RUN`, `ARC_NETWORK`, `ARC_SETTLEMENT_MODEL`, `ARC_MAINNET_RPC_URL`, `ARC_MAINNET_PAYER_ADDRESS`, `ARC_MAINNET_PRIVATE_KEY`, `ARC_TESTNET_RPC_URL`, `CIRCLE_GATEWAY_FACILITATOR_URL`, `CIRCLE_GATEWAY_MAINNET_FACILITATOR_URL`, `PAYMENT_SESSION_ID`, `PAYMENT_SESSION_EXPIRES_AT`, `PAYMENT_MAX_PER_TX_MINOR`, `PAYMENT_MAX_TOTAL_MINOR`, `PAYMENT_ALLOWED_PROVIDERS`, `PAYMENT_ALLOWED_ENDPOINTS`, `PAYMENT_ALLOWED_RECIPIENTS`, `PAYMENT_ALLOWED_NETWORKS`, `PAYMENT_ALLOWED_ASSETS`, `PAYMENT_REQUEST_TIMEOUT_MS`, `PAYMENT_RECONCILE_INTERVAL_SECONDS`, `PAYMENT_RECONCILE_MAX_ATTEMPTS`, `SEC_EDGAR_USER_AGENT`, `FINANCIAL_DATASETS_BASE_URL`, `LONESTAR_ORACLE_BASE_URL`. Kite variables were removed.
- **Verification:** production sign-in/session, `/dashboard`, `/borrowers`, `/facilities`, `/analysis-runs`, `/covenants`, `/cases`, `/evaluations`, `/approvals`, `/audit`, `/integrations`, `/settings`, `/v1/me`, `/v1/integrations/status`, logo/favicon/OG/manifest and API health all returned 200. The Reppo verdict, provider status, payment receipt, onchain settlement and audit chain are real. See `docs/BUILD_LOG.md`.
- **Known latency:** attested extraction runs as a background job and can take 75 s–4.5 min under provider load; the UI auto-refreshes. Presidio cold start measured 42–52 s on the free tier. An exact forced API cold-start timing was not measured; do not claim one.

## Preview deployment order

1. Confirm Vercel/Render/Neon access and no-cost limits during Phase 0.
2. Deploy skeletal frontend and API health route in Phase 1.
3. Record exact URL, commit SHA and environment name in `AI_HANDOFF.md`.
4. Configure CORS to the exact Vercel preview origin.
5. Add only synthetic test data and sandbox secrets.
6. Redeploy and smoke-test after verified checkpoints.

A production build was auto-triggered by the GitHub connection during Phase 1; the Git integration was disconnected and production remained gated until the final Phase 9 matrix passed. Production has since been deployed manually (Render `720f9a1`, Vercel `4fe696e`) and smoke-tested with execution disabled after the authorized payment.

## Secrets

Store secrets in provider environment settings. Never commit `.env`, credentials, bearer tokens, service role keys, encryption keys or signing keys. Validate variable presence without printing values. Keep preview/prod secrets separated.

## Database migration and rollback

- Use committed migrations; no manual schema drift.
- Backup/confirm database before destructive migration in any persistent environment.
- Run migrations as a separate deploy step; fail deploy if migration fails.
- Prefer additive migrations; do not drop columns/data as part of an ordinary deploy.
- Seed scripts must refuse production unless an explicit special flag and authority exist.

## Release gate

Production deploy was authorized by the operator and completed only after the full regression, IDOR, session, proof-mutation, prompt-injection, log-redaction and dependency/secret checks passed. Future releases must repeat that gate; a preview deployment permission still does not imply production permission.
