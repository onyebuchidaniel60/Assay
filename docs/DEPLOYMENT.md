# Deployment

## Environments

- **Local:** Neon development branch/project, synthetic fixtures, live providers only through verified server-side adapters.
- **Preview:** Vercel frontend, Render API/Presidio, Neon demo project. Synthetic fixtures only. Sandbox integrations. No production secrets/data/payments.
- **Production:** release authority is recorded, but deployment remains gated on the full Phase 5/9 test and security matrix. No production deployment is claimed.

## Platform allocation

**Render decision:** Option B — Render deployment is deferred to Phase 5. Phases 2–4 run the Fastify API locally against Neon. No Render deployment is claimed yet.

- Vercel hosts the Next.js frontend and preview deployments.
- Render hosts Fastify API and Presidio service. The MVP worker loop runs in the API service and uses Postgres as its durable queue.
- Neon provides Postgres and Auth; private S3-compatible storage holds encrypted documents and exports.
- AI routing: SERV orchestrates; NEAR AI Cloud handles tokenized Layer 2 extraction with TEE attestation; OpenRouter handles structured judgement/generation. Dolphin is not deployed.
- Do not use Render free Postgres for persistent application data; its free database has a 30-day limit. Do not use local Render filesystem for documents; use private S3-compatible storage.
- Free service sleep/pause and quotas must be considered. A sleeping Render service can delay a demo; warm it before recording. Neon free projects may pause after inactivity and have storage/egress limits. Record actual plans during intake.

## Current preview

- **URL:** `https://assay-uhhh2.vercel.app` (aliases the protected deployment `https://assay-h7uyd6mg5-uhhh2.vercel.app`).
- **Commit:** `d608534` (final deployed app commit; docs-only commits may follow).
- **Protection:** Vercel Authentication.
- **API:** `https://assay-api-7hy0.onrender.com` (Render free web service, health `/health/ready`).
- **Presidio:** `https://assay-presidio.onrender.com` (Render free Python service, `REDUCED_PII_MODE`).
- **State:** authenticated Phase 5 preview; analyst/manager/auditor journeys backed by Neon and the live providers. Synthetic data only.
- **Verification:** deployed sign-in/session, dashboard/borrowers/runs with BOR-004/005, role 401/403 checks, manager DTO without raw amounts, upload magic-byte rejection, audit tamper detection, concurrent approval, Kite policy denial/provider block and demo-shred denial. See `docs/BUILD_LOG.md`.
- **Known latency:** attested extraction runs as a background job and can take 75 s–4.5 min under provider load; the UI auto-refreshes.

## Preview deployment order

1. Confirm Vercel/Render/Neon access and no-cost limits during Phase 0.
2. Deploy skeletal frontend and API health route in Phase 1.
3. Record exact URL, commit SHA and environment name in `AI_HANDOFF.md`.
4. Configure CORS to the exact Vercel preview origin.
5. Add only synthetic test data and sandbox secrets.
6. Redeploy and smoke-test after verified checkpoints.

An unverified Production build was auto-triggered by the GitHub connection during Phase 1 and the Git integration was disconnected. Production remains gated on the Phase 5/9 test and security matrix.

## Secrets

Store secrets in provider environment settings. Never commit `.env`, credentials, bearer tokens, service role keys, encryption keys or signing keys. Validate variable presence without printing values. Keep preview/prod secrets separated.

## Database migration and rollback

- Use committed migrations; no manual schema drift.
- Backup/confirm database before destructive migration in any persistent environment.
- Run migrations as a separate deploy step; fail deploy if migration fails.
- Prefer additive migrations; do not drop columns/data as part of an ordinary deploy.
- Seed scripts must refuse production unless an explicit special flag and authority exist.

## Release gate

Production deploy only with recorded operator authority in `OPERATOR_INTAKE.md`. If not granted, finish on preview and write precise release instructions. A preview deployment permission does not imply production permission.
