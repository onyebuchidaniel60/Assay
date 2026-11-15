# Local Setup

## Requirements

- Node.js 24 LTS and pnpm (exact version pinned in `package.json`/Corepack field).
- Python 3.12 for the Presidio service.
- Docker if using local Neon and containerized Presidio.
- Circom 2.x and SnarkJS for proof compilation and local verification.
- Access to a Neon development project or local Neon stack.

## Phase 1–4 verified setup

1. Clone the approved Assay repository.
2. Use Node.js 24 LTS and pnpm 10.34.5.
3. Install pinned dependencies: `pnpm install --frozen-lockfile`.
4. Copy `.env.example` to `.env.local` and fill only development/test values. Never commit `.env.local`.
5. Apply the Neon migration once: `pnpm --filter @assay/db migrate`.
6. Start the web app and API: `pnpm dev`.
   - Web: `http://localhost:3000`
   - API: `http://localhost:3001`
7. Verify: `pnpm typecheck`, `pnpm test`, `pnpm build`.
8. Run the shell E2E suite: `pnpm --filter @assay/web exec playwright test`. Install Chromium once with `pnpm --filter @assay/web exec playwright install chromium`.

Neon Postgres, managed Better Auth, private S3-compatible storage, envelope encryption, per-borrower signed audit chains, the Postgres job worker, the fixed-circuit proof worker and the `REDUCED_PII_MODE` Presidio service are wired. The full borrower → upload → redaction → attested extraction → terms → financials → calculation → proof → manager approval workflow is implemented. Public sign-up is disabled at the auth service.

## Presidio local service

```bash
python3 -m venv .venv-presidio
.venv-presidio/bin/pip install -r services/presidio/requirements.txt
.venv-presidio/bin/python -m spacy download en_core_web_sm
PRESIDIO_SERVICE_TOKEN="$PRESIDIO_SERVICE_TOKEN" \
  .venv-presidio/bin/uvicorn app.main:app --app-dir services/presidio --host 127.0.0.1 --port 5001
```

The service reports `mode: REDUCED_PII_MODE`, uses `en_core_web_sm`, and measured approximately 176 MB RSS locally. It is not full-strength Presidio and must remain labelled as reduced.

## Phase 3/4 and Render

Render is deferred to Phase 5 (Option B in the intake). Phases 3–4 run the API locally against Neon. Exact Render commands must be added only after deployment is verified.

## Demo identities and workspace

1. In Neon Auth, provision three invite-only users (analyst, manager, auditor). Public sign-up remains disabled.
2. Put their email addresses and locally chosen passwords in `/root/assay-secrets/demo-users.env` (outside Git).
3. Seed the demo organization, profiles and memberships for those existing Auth users:

```bash
ALLOW_DEMO_SEED=true pnpm seed:workspace
```

The script refuses `APP_ENV=production`, never creates Auth users or passwords, and is idempotent. Then sign in through `/login` and create the synthetic borrower/facility/agreement through the UI. The fixture `fixtures/synthetic/credit-agreement.pdf` is fabricated and safe to upload.

A direct sign-up probe should return `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`. If it does not, disable sign-up in Neon Auth before exposing the deployment.

## Known service constraints

The MVP is not production-ready. Neon free projects may pause after inactivity and have constrained database/storage limits. Render free services may sleep and have no persistent local disk; all durable files belong in private S3-compatible storage. The Render free Postgres offering is not used because it expires after 30 days.
