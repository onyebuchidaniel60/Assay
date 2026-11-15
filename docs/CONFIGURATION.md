# Configuration

Use `.env.example` as the canonical environment variable list. The complete variable matrix is in `MASTER_BLUEPRINT.md` §23.

## Client-safe values

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `API_PUBLIC_URL`

The anon key is not a secret, but table/storage access still requires RLS and server authorization.

## Server-only secrets

`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SERV_REASONING_API_KEY`, `DOLPHIN_API_KEY`, `REPPO_API_KEY`, `PRESIDIO_SERVICE_TOKEN`, `DATA_KEK_BASE64`, `AUDIT_SIGNING_PRIVATE_KEY_BASE64` and any optional Kite credentials. Never prefix them with `NEXT_PUBLIC_`.

## Provider flags

- `DOLPHIN_PRIVACY_TERMS_VERIFIED=false` by default. Only set true after official @dphnAI endpoint/model/terms have been reviewed and documented.
- `REPPO_ENABLED=false` until key, quota and synthetic-only payload contract are verified.
- `KITE_ENABLED=false` until CLI/SDK, testnet, owner-approved session and exact spend ceiling are verified.
- `ENABLE_DEMO_SHRED=false` outside a controlled synthetic demo.

## Environment separation

Use separate Supabase projects and service keys for local development, preview and any production environment. Do not reuse a production key in a preview deployment. Preview must never connect to production borrower records. Production is out of scope and unauthorized by default.

The app validates the environment with Zod at startup. Logs may show variable names that are missing, never values.
