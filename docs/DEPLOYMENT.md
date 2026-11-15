# Deployment

## Environments

- **Local:** local Supabase or dedicated development project, synthetic fixtures, provider calls disabled by default.
- **Preview:** Vercel frontend, Render API/Presidio, Supabase demo project. Synthetic fixtures only. Sandbox integrations. No production secrets/data/payments.
- **Production:** not part of the MVP; not authorized by default. Requires explicit operator approval and separate security/retention review.

## Platform allocation

- Vercel hosts the Next.js frontend and preview deployments.
- Render hosts Fastify API and Presidio service. The MVP worker loop runs in the API service and uses Postgres as its durable queue.
- Supabase provides Postgres, Auth and private Storage.
- AI routing: SERV orchestrates; NEAR AI Cloud handles tokenized Layer 2 extraction with TEE attestation; OpenRouter handles structured judgement/generation. Dolphin is not deployed.
- Do not use Render free Postgres for persistent application data; its free database has a 30-day limit. Do not use local Render filesystem for documents; use private Supabase Storage.
- Free service sleep/pause and quotas must be considered. A sleeping Render service can delay a demo; warm it before recording. Supabase free projects may pause after inactivity and have storage/egress limits. Record actual plans during intake.

## Current preview

- **URL:** `https://assay-guyo5yh6z-uhhh2.vercel.app`
- **Commit:** `5deaa51491e322f5f5fe82b389a7b66206aad126`
- **Protection:** Vercel Authentication.
- **State:** Phase 1 shell only; read-only synthetic views; no database, auth or live provider calls.
- **Verification:** `vercel curl` returned expected titles for `/`, `/dashboard`, `/facilities/demo`, `/integrations` and `/audit`.

## Preview deployment order

1. Confirm Vercel/Render/Supabase access and no-cost limits during Phase 0.
2. Deploy skeletal frontend and API health route in Phase 1.
3. Record exact URL, commit SHA and environment name in `AI_HANDOFF.md`.
4. Configure CORS to the exact Vercel preview origin.
5. Add only synthetic test data and sandbox secrets.
6. Redeploy and smoke-test after verified checkpoints.

An unverified Production build was auto-triggered by the GitHub connection during Phase 1 and removed before release. Production remains gated on the Phase 5/9 test and security matrix.

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
