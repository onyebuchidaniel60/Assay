# Assay — AI Handoff / Build State

**Status:** Phase 2 complete (Neon data/auth/storage foundation). Phase 3 domain/API implementation is next.  
**Current phase:** Phase 2 checkpoint complete; Phase 3 not started.  
**Repository:** `https://github.com/onyebuchidaniel60/Assay` — public, default branch `main`.  
**Latest app commit:** `5deaa51` (`feat: establish app shell and preview deployment`) plus domain/proof and Phase 2 foundation commits.  
**Preview URL:** `https://assay-guyo5yh6z-uhhh2.vercel.app` — protected Phase 1 shell; authenticated Phase 2 preview not yet deployed.  
**Production release authority:** Authorized by operator, but release remains gated on the full Phase 5/9 test and security matrix. No production deployment is claimed.  
**Data boundary:** Synthetic data only; no real borrower, lender or production records.  
**New spend authority:** `$0` beyond existing NEAR AI and SERV credits.

## Phase 1 — complete

- pnpm workspace with `apps/web`, `apps/api`, `packages/domain`, `packages/contracts`, `packages/proof`.
- Next.js 16.4.6 / React 19.3.1 / Tailwind 4 responsive shell; 16 routes; labelled placeholders; actual/forecast separation.
- Fastify health routes, safe error envelopes, CORS allowlist, Pino redaction.
- Vercel protected preview `https://assay-guyo5yh6z-uhhh2.vercel.app`; `vercel curl` verified five routes.
- Shell Playwright suite 10/10; root typecheck/build pass.

## Phase 2 — complete

- **Neon connectivity:** PostgreSQL 18.7 via `DATABASE_URL`; `NEON_AUTH_BASE_URL/ok` HTTP 200; private S3 bucket `assay-private-documents` listed.
- **Schema:** Drizzle schema with 24 tables/enums; migration applied to Neon. Includes tenant tables, documents/versions, extraction runs, covenants, evidence, assessments, verification, cases, memos, approvals, signed audit events/head, idempotency and jobs.
- **Auth:** Neon managed Better Auth wired in Next.js (`/api/auth/[...path]`, login action, proxy protection) and Fastify (`/v1/me` session/role/org resolution). Analyst sign-in/session verified; unauth 401; analyst audit verify 403; manager audit verify `VALID`.
- **Storage:** AWS SDK client with `forcePathStyle=true` and `requestChecksumCalculation="WHEN_REQUIRED"`; real private bucket put/read/head/presign/delete passed.
- **Encryption:** per-borrower AES-256-GCM DEK wrapped by `DATA_KEK_BASE64`; document encryption; Ed25519 audit signing; tests pass.
- **Audit:** append-only per-org sequence with row lock, SHA-256 chain and Ed25519 signature; DB append/verify `VALID`.
- **Jobs:** Postgres `jobs` queue with idempotent enqueue, `FOR UPDATE SKIP LOCKED`, leases, retries; worker completed a healthcheck job.
- **Presidio:** `REDUCED_PII_MODE` FastAPI service using `en_core_web_sm` and custom financial recognizers; health/tokenize verified; RSS ≈ 176 MB.
- **Supabase removal:** no Supabase variables, dependencies or code/docs references remain. Neon is the sole data layer; storage is private S3-compatible.
- **Render:** Option B — deferred to Phase 5; API runs locally against Neon for Phases 2–4.

## Provider and integration status

| Provider | Status | Evidence |
|---|---|---|
| Neon Postgres/Auth | `LIVE (LOCAL/PREVIEW DATA)` | 18.7; `/ok` 200; bucket accessible; schema migrated |
| NEAR AI Cloud | `LIVE` | `z-ai/glm-5.3-flash`; exact model response; TDX + NRAS attestation pass; evidence report hash recorded |
| OpenRouter | `LIVE` | `openai/gpt-4o-mini` exact; generation `deepseek/deepseek-v3.2` found |
| SERV / OpenServ | `LIVE` | `serv-standard` exact model ID; small live call 200 |
| Presidio | `LIVE (LOCAL REDUCED MODE)` | `/tokenize` verified; RSS 176 MB |
| Vercel | `PREVIEW READY` | Protected Phase 1 shell only |
| Render | `DEFERRED TO PHASE 5` | Option B recorded |
| Kite | `ENABLED (TESTNET) — payment provider-blocked` | Active 5/20 PIEUSD session; over-cap rejection `session_rule_exceeded`; no retry |
| Reppo | `DISABLED` | Optional; key present but synthetic-only contract not enabled |

## Verification evidence

| Command | Result |
|---|---|
| `psql "$DATABASE_URL" -c "select version();"` | PostgreSQL 18.7 |
| `curl "$NEON_AUTH_BASE_URL/ok"` | HTTP 200 |
| `aws s3 ls --endpoint-url "$AWS_ENDPOINT_URL_S3"` | `assay-private-documents` |
| OpenRouter catalog check | both configured IDs FOUND |
| NEAR AI model list + live extraction | verifiable/attestationSupported true; exact model + JSON |
| NEAR AI official verifier | TDX true, NRAS true, nonce binding true, compose hashes match |
| SERV live call | `serv-standard` exact, HTTP 200 |
| `pnpm typecheck` | Passed |
| `pnpm test` | domain 18/18, contracts 6/6, proof 3/3, API 4/4 |
| `pnpm build` | Passed |
| Playwright shell suite | 10/10 with authenticated demo users |
| Storage healthcheck | put/read/presign/delete pass |
| Audit healthcheck | chain `VALID`, signature present |
| Job healthcheck | status `SUCCEEDED` |
| Presidio healthcheck | `/health` and `/tokenize` pass; RSS 176 MB |

## Next exact task — Phase 3

Implement the domain/API workflow:
1. Borrower/facility CRUD with tenant scoping, normalized references and audit events.
2. Document upload/version/hash, private encrypted storage, parser and `REDUCED_PII_MODE` redaction review.
3. NEAR AI extraction adapter with model + attestation checks; OpenRouter/SERV structured reasoning nodes; source quote/page validation.
4. Covenant draft/review/activation with manager maker-checker; financial evidence confirmation/supersession.
5. Deterministic assessment + independent verification + fixed-circuit proof; actual/forecast separation; stale invalidation.
6. Case/memo/approval and audit APIs; Phase 4 UI integration; Phase 5 E2E gate before Phase 6.

## Authorization boundaries

- Synthetic data only.
- No public signup; invite-only staff.
- No Kite wallet spend beyond the approved testnet session.
- Production release only after the full regression/security matrix passes.
- Never fabricate provider output, receipts or verification results.
