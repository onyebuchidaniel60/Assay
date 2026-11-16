# Deployment

## Environments

- **Local:** Neon development branch/project, synthetic fixtures, live providers only through verified server-side adapters.
- **Preview:** Vercel frontend, Render API/Presidio, Neon demo project. Synthetic fixtures only. Sandbox integrations. No production secrets/data/payments.
- **Production:** Vercel frontend `https://assay-omega-gray.vercel.app`, Render API/Presidio, Neon demo project. Deployed at commit `60fac34` after the full Phase 5/9 regression and security matrix passed. Synthetic data only; Vercel Authentication is enabled.

## Platform allocation

**Render decision:** Option B — the Fastify API and Presidio run as Render free web services, while Neon owns persistent data. No Render Postgres/disk is used. Both services can sleep on the free tier; warm them before a demo.

- Vercel hosts the Next.js frontend and preview deployments.
- Render hosts Fastify API and Presidio service. The MVP worker loop runs in the API service and uses Postgres as its durable queue.
- Neon provides Postgres and Auth; private S3-compatible storage holds encrypted documents and exports.
- AI routing: SERV orchestrates; NEAR AI Cloud handles tokenized Layer 2 extraction with TEE attestation; OpenRouter handles structured judgement/generation. Dolphin is not deployed.
- Do not use Render free Postgres for persistent application data; its free database has a 30-day limit. Do not use local Render filesystem for documents; use private S3-compatible storage.
- Free service sleep/pause and quotas must be considered. A sleeping Render service can delay a demo; warm it before recording. Neon free projects may pause after inactivity and have storage/egress limits. Record actual plans during intake.

## Current production deployment

- **Frontend:** `https://assay-omega-gray.vercel.app` (deployment `assay-c1l1ridga-uhhh2.vercel.app`; stable alias `https://assay-uhhh2.vercel.app`).
- **Commit:** `60fac34`.
- **Protection:** Vercel Authentication (Option B — kept enabled; the public demo video and API health are the accessible artifacts).
- **API:** `https://assay-api-7hy0.onrender.com` (Render free web service, live at `60fac34`, health `/health/ready`; worker enabled, Reppo live).
- **Presidio:** `https://assay-presidio.onrender.com` (Render free Python service, `REDUCED_PII_MODE`).
- **State:** production analyst/manager/auditor journeys backed by Neon and the live providers. Synthetic data only.
- **Production environment names:** `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `API_PUBLIC_URL`, `APP_ENV`.
- **Verification:** production sign-in/session, `/dashboard`, `/evaluations`, `/integrations`, `/settings`, `/v1/me`, `/v1/integrations/status`, logo/favicon/OG/manifest and API health all returned 200. The Reppo verdict and provider status are real. See `docs/BUILD_LOG.md`.
- **Known latency:** attested extraction runs as a background job and can take 75 s–4.5 min under provider load; the UI auto-refreshes. Presidio cold start measured 42–52 s on the free tier. An exact forced API cold-start timing was not measured; do not claim one.

## Preview deployment order

1. Confirm Vercel/Render/Neon access and no-cost limits during Phase 0.
2. Deploy skeletal frontend and API health route in Phase 1.
3. Record exact URL, commit SHA and environment name in `AI_HANDOFF.md`.
4. Configure CORS to the exact Vercel preview origin.
5. Add only synthetic test data and sandbox secrets.
6. Redeploy and smoke-test after verified checkpoints.

A production build was auto-triggered by the GitHub connection during Phase 1; the Git integration was disconnected and production remained gated until the final Phase 9 matrix passed. Production has since been deployed manually from `60fac34` and smoke-tested.

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
