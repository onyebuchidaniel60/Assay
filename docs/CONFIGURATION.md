# Configuration and environment variables

All secret values are server-side only. Never prefix secrets with `NEXT_PUBLIC_`; never expose them through page props, API responses, source maps, logs or client bundles. `.env.example` contains placeholders only.

| Variable | Required | Server/client | Purpose / validation |
|---|---|---|---|
| `NODE_ENV` | Yes | Server | `development`, `test` or `production`; production security flags must be on. |
| `APP_BASE_URL` | Yes | Server | Canonical HTTPS origin used for auth, redirects and URL validation. |
| `DATABASE_URL` | Yes | Server | PostgreSQL application connection, TLS where remote. |
| `DATABASE_DIRECT_URL` | Optional | Server | Direct connection for migrations/admin tooling; never client-exposed. |
| `BETTER_AUTH_SECRET` | Yes | Server | High-entropy session/signing secret; minimum length enforced; unique per environment. |
| `BETTER_AUTH_URL` | Yes | Server | Canonical auth base URL; must match approved host. |
| `SEED_ADMIN_EMAIL` | Dev/seed only | Server | Synthetic seed account identity; never enable public self-signup. |
| `SEED_ADMIN_PASSWORD` | Dev/seed only | Server | Seed secret; do not commit or log. Rotate/disable after seed. |
| `VULTR_INFERENCE_API_KEY` | AI mode | Server | Vultr inference bearer key; secret manager/runtime only. |
| `VULTR_INFERENCE_BASE_URL` | Yes in AI mode | Server | Default `https://api.vultrinference.com/v1`; validate HTTPS and allowlisted host. |
| `VULTR_INFERENCE_MODEL` | Yes in AI mode | Server | Proposed `deepseek-v4.1-flash-1017`; verify live catalog and response model ID. |
| `VULTR_INFERENCE_TIMEOUT_MS` | Yes | Server | Bounded request timeout; set from tested latency, no infinite wait. |
| `VULTR_INFERENCE_MAX_TOKENS` | Yes | Server | Output cap and cost control. |
| `VULTR_INFERENCE_MAX_CONCURRENT` | Yes | Server | Worker concurrency cap. |
| `S3_ENDPOINT` | Yes | Server | Vultr Object Storage HTTPS S3 endpoint for selected region. |
| `S3_REGION` | Yes | Server | Region identifier required by the S3 client/signature. |
| `S3_BUCKET` | Yes | Server | Private bucket name; validate expected environment prefix. |
| `S3_ACCESS_KEY_ID` | Yes | Server | Restricted Object Storage credential. |
| `S3_SECRET_ACCESS_KEY` | Yes | Server | Restricted Object Storage secret. |
| `STORAGE_PROVIDER` | Yes | Server | `vultr` in deployed environment; local adapter only for dev/test. |
| `MAX_UPLOAD_BYTES` | Yes | Server | Default 25 MiB hard limit; validate server-side. |
| `MAX_PDF_PAGES` | Yes | Server | Bounded parser resource limit; initial default 200 pages. |
| `PDF_PARSER_URL` | Yes | Server | Private internal parser endpoint; reject public/loopback bypass routes. |
| `CLAMAV_HOST` | Yes | Server | Private scanner address; fail closed if scanner is mandatory and unavailable. |
| `PG_BOSS_SCHEMA` | Yes | Server | Queue schema name; restrict privileges. |
| `LOG_LEVEL` | Yes | Server | `info` default in prod; never enable sensitive payload logging. |
| `AUDIT_HASH_VERSION` | Yes | Server | Versioned canonicalization/hash algorithm identifier; initial `sha256-v1`. |
| `DEMO_MODE` | Yes | Server | Explicitly seeded synthetic demo behavior; never turns off auth or authorization. |
| `PREVIEW_ALLOWED_ORIGIN` | Yes in preview | Server | Exact origin used for CORS/origin checks; no wildcard. |
| `GOOGLE_TTS_API_KEY` | Optional | Server | Only if approved free Google TTS is validated; never assume free tier or spend. |
| `APP_LOG_REDACT_PATHS` | Optional | Server | Additional Pino redaction fields, not a substitute for default redaction. |
| `BACKUP_BUCKET_PREFIX` | Optional | Server | Private prefix for encrypted database backups; no public ACL. |

## Validation rules

- Parse and validate environment at process startup with Zod; fail startup on missing/invalid critical variables.
- Reject production config that selects local filesystem/MinIO storage.
- Reject non-HTTPS inference/storage endpoints in deployed environments.
- Validate the exact inference response model identifier; do not accept provider fallback.
- Use separate secrets, buckets and DBs for local, preview and production.
- Keep secrets out of `.env.example`; list names and descriptions only.
- Rotate credentials if exposed and record incident response.
