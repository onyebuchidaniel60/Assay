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

- **URL:** `https://assay-guyo5yh6z-uhhh2.vercel.app`
- **Commit:** the Phase 1 shell commit (`5deaa51…`); the Phase 3/4 authenticated UI is local until Phase 5.
- **Protection:** Vercel Authentication.
- **State:** Phase 1 shell only; it is not the current authenticated workspace.
- **Local verified state:** API `http://localhost:3001`, web `http://localhost:3000`, 18/18 Playwright desktop/mobile, full run lifecycle and manager approval.
- **Phase 5 target:** Render API + Presidio, Vercel preview with `API_PUBLIC_URL` pointing at Render, Neon demo project, sign-up disabled, exact commit/URL recorded here and in `AI_HANDOFF.md`.

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
