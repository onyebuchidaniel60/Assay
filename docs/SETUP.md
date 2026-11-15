# Local Setup

## Requirements

- Node.js 24 LTS and pnpm (exact version pinned in `package.json`/Corepack field).
- Python 3.12 for the Presidio service.
- Docker if using local Supabase and containerized Presidio.
- Circom 2.x and SnarkJS for proof compilation and local verification.
- Access to a Supabase development project or local Supabase stack.

## First-time setup

1. Clone the approved Assay repository.
2. Install pinned dependencies: `pnpm install --frozen-lockfile`.
3. Copy `.env.example` to the local environment file and fill only development/test values.
4. Start local Supabase or select the dedicated development project.
5. Run database migrations and seed synthetic users/borrowers.
6. Start the Presidio service; verify `/health` using its internal service token.
7. Start API and frontend workspaces.
8. Run unit tests and Playwright smoke tests.

The implementation agent must write exact commands to match actual workspace scripts and verify each command before publishing this guide. Do not document commands that were not tested.

## Demo fixture setup

Use `scripts/seed-demo` to create synthetic borrower/facility/agreement/financial input fixtures and role-specific accounts. Demo fixture passwords and credentials must be provided through secure local env or generated interactively; never commit them. Reset scripts must operate only on a dedicated demo project and must refuse production environment names.

## Known service constraints

The MVP is not production-ready. Supabase free projects may pause after inactivity and have constrained database/storage limits. Render free services may sleep and have no persistent local disk; all durable files belong in Supabase Storage. The Render free Postgres offering is not used because it expires after 30 days.
