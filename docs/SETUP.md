# Local Setup

## Requirements

- Node.js 24 LTS and pnpm (exact version pinned in `package.json`/Corepack field).
- Python 3.12 for the Presidio service.
- Docker if using local Supabase and containerized Presidio.
- Circom 2.x and SnarkJS for proof compilation and local verification.
- Access to a Supabase development project or local Supabase stack.

## Phase 1 — current verified setup

1. Clone the approved Assay repository.
2. Use Node.js 24 LTS and pnpm 10.34.5.
3. Install pinned dependencies: `pnpm install --frozen-lockfile`.
4. Copy `.env.example` to `.env.local` and fill only development/test values. Never commit `.env.local`.
5. Start the shell and API: `pnpm dev`.
   - Web: `http://localhost:3000`
   - API: `http://localhost:3001`
6. Verify: `pnpm typecheck`, `pnpm test`, `pnpm build`.
7. Run the shell E2E suite: `pnpm --filter @assay/web exec playwright test`. This requires Chromium; run `pnpm --filter @assay/web exec playwright install chromium` once.

The Phase 1 shell is read-only and uses synthetic preview data. Database migrations, Supabase/Neon auth, storage and the Presidio service are Phase 2 tasks and are not yet available. Do not treat the preview shell as a live covenant engine.

## Phase 2 prerequisites (not yet complete)

- Authorized database/auth/storage credentials in `.env.local`.
- Drizzle schema and migrations.
- `REDUCED_PII_MODE` Presidio-equivalent service.
- Render API/Presidio service access.
- Live provider credentials for Phase 3.

Exact commands for those phases must be added only after they are implemented and tested. Do not document unrun commands as passing.

## Demo fixture setup

Use `scripts/seed-demo` to create synthetic borrower/facility/agreement/financial input fixtures and role-specific accounts. Demo fixture passwords and credentials must be provided through secure local env or generated interactively; never commit them. Reset scripts must operate only on a dedicated demo project and must refuse production environment names.

## Known service constraints

The MVP is not production-ready. Supabase free projects may pause after inactivity and have constrained database/storage limits. Render free services may sleep and have no persistent local disk; all durable files belong in Supabase Storage. The Render free Postgres offering is not used because it expires after 30 days.
