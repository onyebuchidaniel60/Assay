# Assay — AI Handoff / Build State

> **PAYMENT UPDATE — 20 November 2026.** Kite Passport/x402 was removed and replaced by Arc Testnet / Circle Gateway plus external financial-evidence linkage. Historical Kite entries below are development history, not active instructions. See `docs/PAYMENTS_ARCHITECTURE.md` and the latest `docs/BUILD_LOG.md` entry.


**Status:** Phases 1–9 complete. Public production deployed and smoke-tested after the full regression and security matrix passed; post-submission access and branding fixes applied. The 20 November 2026 payment update removes Kite, adds Arc Testnet / Circle Gateway and external financial-evidence linkage.
**Repository:** `https://github.com/onyebuchidaniel60/Assay` — public, default branch `main`.  
**Production URL:** `https://assay-uhhh2.vercel.app` — public (Vercel Authentication disabled) and explicitly aliased to the 20 November 2026 build. `https://assay-omega-gray.vercel.app` is the production domain.
**Production commit:** app commit `9e9f054` (payment update). Vercel `dpl_AA3gRSVs1ggcZ5Gsku7MBbrrADCH` / `https://assay-px4d9i5ih-uhhh2.vercel.app`; Render deploy `dep-dc06dd97lnhs739qd280` live at `7d80665` (payment-update app code plus execution-time policy recheck and idempotency hardening; Vercel app UI unchanged since `9e9f054`). **Render API:** `https://assay-api-7hy0.onrender.com`. **Render Presidio:** `https://assay-presidio.onrender.com`.
**Public demo:** `https://github.com/onyebuchidaniel60/Assay/releases/download/demo-v1/assay-demo-final.mp4` — 131.97 s, 1080p/30 fps. It predates the Arc change and is a historical artifact.
**Production release authority:** Exercised for the previous release; the Arc update was deployed with payment execution disabled.
**Data boundary:** Synthetic data only; no real borrower, lender or production records.  
**New spend authority:** `$0`; no Arc Testnet funds, no Arc mainnet funds, no paid Financial Datasets request.

## Phase 1 — complete

- pnpm workspace with apps/web, apps/api, packages/domain, contracts, proof, plus Phase 2/3 packages crypto, storage, db, document, ai.
- Next.js 16.4.6 / React 19 / Tailwind 4 responsive shell; Fastify health foundation; CI; Vercel protected preview; shell Playwright tests.

## Phase 2 — complete

- Neon PostgreSQL 18.7, managed Better Auth, private S3-compatible bucket `assay-private-documents`.
- Envelope encryption, per-borrower wrapped DEK, keyed document HMAC.
- Per-borrower Ed25519-signed audit chain with row-locked sequence.
- Postgres jobs queue with `FOR UPDATE SKIP LOCKED`, leases, retry/dead-letter.
- `REDUCED_PII_MODE` Presidio service (`en_core_web_sm` + custom financial recognizers, ~176 MB RSS).
- Supabase fully removed. Render deferred to Phase 5 (Option B). Live provider connectivity and model/attestation checks recorded.

## Phase 3 — complete

- Canonical schema realigned to `MASTER_BLUEPRINT.md` §7: borrowers, borrower keys, facilities, documents, analysis runs, covenant terms, sealed financial inputs, scenario results, proof artifacts, approvals, redaction revisions, extraction runs, feedback/Reppo evaluations, per-borrower audit events/heads, jobs, idempotency records. Roles are `ANALYST | MANAGER | AUDITOR | ADMIN`.
- Full Fastify domain/API surface: borrower/facility CRUD; encrypted upload with PDF/TXT magic-byte, 10 MiB, 40-page and scanned-PDF rejection; in-memory preview; run create/list/detail; redaction read/review; asynchronous extraction; terms review; financial inputs with deterministic add-back caps; calculation + independent BigInt verifier + SERV gate; fixed-circuit proof; role-shaped reports; manager approval queue/decision; cancellation; audit read/verify/payload; feedback; integration status; Reppo live adapter; Kite local policy → provider-blocked; demo shred.
- NEAR AI extraction is attested per request: exact model, `verifiable`/`attestationSupported`, fresh 32-byte nonce, Intel TDX via `@phala/dcap-qvl`, NVIDIA NRAS, signer/nonce binding, response ECDSA signature, request/response hashes, compose-manager quote. Failure blocks terms.
- Extraction runs as a background Postgres job (`analysis.extract`), returning `202`; parse also runs as `analysis.parse`.
- Proof generation runs in a one-shot child process; witness is passed over stdin and never persisted. Server checks public signals `["1","35000"]` before storing a verified artifact.

## Phase 4 — complete

- Authenticated API-backed UI: dashboard, borrowers list/detail/new, facilities list/detail, document preview, analysis run list/detail, approvals queue/decision, audit timeline/verify, covenant register, exception cases derived from immutable run state, integrations, settings/sign-out.
- Role-shaped analyst/manager/auditor views; manager view excludes raw amounts, names, agreement text and token map.
- Loading/empty/error/forbidden states, auto-refresh during background jobs, responsive desktop/mobile layouts, keyboard-focus styles, no fake provider success.
- Document preview, redaction review, terms confirmation, financial attestation, calculation, proof, approval and cancellation all call real APIs.

## Verified evidence

| Check | Result |
|---|---|
| `psql "$DATABASE_URL" -c "select version();"` | PostgreSQL 18.7 |
| `curl "$NEON_AUTH_BASE_URL/ok"` | HTTP 200 |
| `aws s3 ls --endpoint-url "$AWS_ENDPOINT_URL_S3"` | `assay-private-documents` |
| NEAR AI model list | `z-ai/glm-5.3-flash`, `verifiable=true`, `attestationSupported=true` |
| NEAR AI attested live call | TDX `UpToDate`, NRAS true, signature + nonce + hashes verified |
| OpenRouter live call | exact `openai/gpt-4o-mini` |
| SERV live call | exact `serv-standard` |
| Storage healthcheck | put/read/head/presign/delete pass |
| Audit chain | `VALID`, 13 events, signatures verified |
| Parse/redaction | 4-page PDF, 7 entities, covenant clause preserved |
| Full workflow BOR-004 | 3.0660x compliant → proof `VERIFIED` → manager `APPROVED` |
| Stressed BOR-005 | baseline 3.475x; stress 3.861x/3.823x breached; no-ack 422; acknowledged approve 201 |
| Root typecheck/build | Passed |
| Unit tests | 94 passed, 1 skipped (live Arc payment suite requires funded testnet credentials); domain 28, crypto 4, contracts 6, document 8, proof 3, Reppo 8, AI 10, financial-data 8, payments 11, API 8 |
| Playwright | 20/20 desktop + mobile on the previous release; local Arc evidence flow exercised with the demo analyst |
| Arc | SDK/config verified; facilitator supports Arc Testnet USDC; real LoneStar quote persisted as `POLICY_REJECTED` with `payment_network_forbidden`; no execution job; no payment claimed |
| SEC EDGAR | Adapter and fixtures pass; this host received HTTP 403 from AkamaiGHost; visible failure and audit; no data fabricated |
| Public signup | Disabled at the auth service; direct probe returned `400 EMAIL_PASSWORD_SIGN_UP_DISABLED` |
| Reppo | **LIVE** — real evaluation `cmwikqtsn000f08l4y73d9a8m`, score 98, `accept`, confidence `low`, route `review`, 440 credits, 409-byte safe trace |

## Current data state (synthetic demo)

- Organizations: `Assay Demo Credit Partners` (`00000000-0000-4000-8000-000000000001`).
- Demo staff: `analyst@assay.test` (Maya Chen, ANALYST), `manager@assay.test` (Jon Bell, MANAGER), `auditor@assay.test` (Priya Raman, AUDITOR). Credentials live only in `/root/assay-secrets/demo-users.env`.
- Borrowers BOR-004, BOR-005, BOR-006, BOR-013 and BOR-018 exist, all manager-approved. BOR-004/006/013/018 are baseline compliant with two acknowledged stress breaches; BOR-005 is the stressed-breach fixture. One real Reppo evaluation (`cmwikqtsn000f08l4y73d9a8m`) remains. All security-test and IDOR records were deleted.
- The 20 November 2026 payment update added synthetic run `856a437a-0449-4d2e-8cab-024fc0fa8140` (BOR-004, `TERMS_CONFIRMED`) solely for the external-evidence policy demonstration. It has no covenant terms or financial inputs and is not an approved analysis. Payment intent `86907190-500c-434d-ac4a-73f526aa7a38` is `POLICY_REJECTED`; SEC failure audit events are present. The audit chain verifies `VALID` with 22 events.
- Old BOR-001/2/3 test runs were deleted before the final schema/workflow checks. No real data was involved.

## Phase 5 — deployed preview verified

- Render API and Presidio are live; exact URLs are above. Environment-variable names are recorded in `docs/BUILD_LOG.md`; values remain in the Render secret store and `.env.local`.
- Vercel preview `https://assay-uhhh2.vercel.app` is protected and authenticated; it reads the Render API server-side with the Neon Auth cookie.
- Deployed checks passed: sign-in/session, real runs in the UI, 401/403 role boundaries, manager DTO without raw amounts, upload magic-byte rejection, Kite over-cap/provider-blocked, demo-shred denial, CORS denial, audit tamper `VALID → INVALID → VALID`, concurrent approval `201 + 409`.
- Public sign-up is disabled at Neon Auth.
- Known latency: attested extraction is background and can take 75 s–4.5 min under provider load; the UI auto-refreshes.

## Phase 6 — complete

- `stageshow` installed successfully but applied only as craft guidance; faux UI/mock cursor compositions were rejected because they conflict with the real-action rule. Deviation recorded.
- UI refined: live status, attestation panel, correct audit actor names, role-shaped screens, accessible empty/error/denied states, no inert primary controls.
- Demo video: `artifacts/demo/assay-demo.mp4` — 113.5 s, 1080p/30 fps, real Playwright capture, local free `espeak-ng` narration, burned captions. Script, narration, captions and production notes are under `artifacts/demo/`. The real manager approval of BOR-013 is captured.
- Final demo data: BOR-004/005/006/013 approved; failed test borrowers removed. No real data.

## Verified hardening

- Unauthenticated 401; analyst/auditor/manager role boundaries; manager DTO excludes raw amounts.
- Upload magic-byte, page, scan and size validation; Kite over-cap 422 and provider-blocked 503; demo-shred denial.
- Audit tamper `VALID → INVALID → VALID`; concurrent approval one `201`, one `409`.
- Demo crypto-shred verified: wrapped key deleted, chain `VALID` before and after; preview-mode shred denied 403.
- XSS probe escaped; SQL-injection probe rejected 422; secret scan clean; CI secret-hygiene step added.
- Public signup disabled (`400 EMAIL_PASSWORD_SIGN_UP_DISABLED`).

## Phase 7 — complete

- README rewritten for end users/developers: logo, problem/audience, workflow, Mermaid architecture, track declaration, accurate security language, quick start, verified deployment links, docs index and license/attribution.
- `docs/SUBMISSION.md` created: problem-first write-up, SERV's two bounded roles, Open Track primary with Reppo/Kite secondary claims and no Dolphin claim, architecture, privacy summary, links, X post and checklist.
- API, data model, configuration, integrations, operator guide, troubleshooting, design notes, reference assets and operator intake updated to the built behavior and provider states.
- Security-language audit: no `zero retention guaranteed`, `GDPR compliant`, `differentially private`, unqualified `TEE protected` or `Presidio-verified` claims; the reduced Presidio profile, predicate-only ZK proof and tamper-evident (not immutable) audit chain are stated explicitly.
- `docs/INTEGRATIONS.md` records the Reppo endpoint migration and live verdict, and the Kite provider block with timestamps.
- Footer/docs links resolve to real pages; no `href="#"`, fake contact URL or private repository link.

## Phase 8 — complete

- Final demo `artifacts/demo/assay-demo-final.mp4`: 131.97 s, 1920×1080, 30 fps, H.264 High/yuv420p + AAC mono, 7.34 MB.
- Microsoft Edge TTS `en-US-AndrewNeural` (free, no account, no billing) replaced the robotic espeak-ng render. Gemini TTS was not used because no Google AI credential/free-tier activation was present.
- Opening title and app header show the operator logo. Scenes cover dashboard, facility/redaction, extraction/attestation/scenarios/proof, real manager approval of BOR-018, the real Reppo verdict (`cmwikqtsn000f08l4y73d9a8m`), auditor chain verification and honest integration status.
- Script `assay-demo-script-final.md`, captions `assay-demo-final.srt`, production notes `production-notes-final.md` and rebuild script `build-video-final.sh` are committed beside the MP4.
- Complete render inspected with extracted frames; no secrets, private URLs or real data. Public URL: `https://github.com/onyebuchidaniel60/Assay/releases/download/demo-v1/assay-demo-final.mp4` (YouTube/Drive upload requires operator OAuth).

## Phase 9 — complete

- **Proof mutation (D1):** stored `pi_a[0]` replaced with `1`; `/proof/verify` `422 PROOF_FAILED`; run `PROOF_FAILED`; approval `409 PROOF_FAILED`. Stored proof is re-verified inside the approval path.
- **Cross-tenant IDOR (D2):** second org/user created; borrower, facility, document, preview, run, report, redaction, proof, audit events and audit verify all `404`; approval `404` with idempotency key; shred `403`. No 200.
- **Sessions (D3):** malformed `401`, expired token `401`, disabled profile `401`, expired full cookie `401`. Re-verified on the production API at `60fac34`: expired cookie with a fresh 60 s cache `401`; disabled profile `401`; re-enabled profile `200`. Web cache TTL 60 s; API strips signed session-data cache and revalidates every request.
- **Prompt injection (D4):** embedded instruction to set 9999 bps ignored; extracted `32500` with quote evidence; SERV `ANALYST_REVIEW_REQUIRED`.
- **Log redaction (D5):** forced attestation failure logged only `analysis.extract failed code=ATTESTATION_FAILED error=Configured model is not present.`; marker, email, account, figure, reference, borrower name and token-map values absent.
- **Kite duplicate/reconciliation (D6):** code-reviewed control only — idempotency key, receipt-before-retry, `RECONCILIATION_REQUIRED` on timeout; not tested because both documented testnet endpoints are provider-blocked. No payment/receipt claimed.
- **Reppo:** live real evaluation completed (score 98, accept, low confidence, review, 440 credits, 409-byte payload).
- **Kite:** both documented testnet endpoints provider-blocked (upstream internal error; second endpoint DNS `ENOTFOUND` at `2026-11-16T01:23:30Z`). No retry, no spend.
- **Dependency/secret scans:** `pnpm audit` 0 high/critical (1 moderate dev-only esbuild, 1 low elliptic); `underscore` overridden to 1.13.8; Gitleaks worktree/history clean of real secrets; `scripts/check-secrets.sh` passes.

## Final regression matrix

| Check | Result |
|---|---|
| `pnpm lint` | Pass |
| `pnpm typecheck` | Pass |
| `pnpm build` | Pass |
| `pnpm test` | Pass — 61 tests: domain 18, crypto 4, contracts 6, document 8, proof 3, reppo 8, AI 10, API 4 |
| `pnpm test:e2e` | 20/20 desktop + mobile (after warming Render API) |
| `pnpm audit` | 0 critical, 0 high, 1 moderate dev-only esbuild, 1 low elliptic |
| Secret scan | Pass — no real secret in tracked files or 27-commit history |
| Production smoke | `/`, `/login`, logo, favicon, OG, manifest, authenticated dashboard/evaluations/integrations/settings, `/v1/me`, `/v1/integrations/status`, API health all pass |

## Production deployment

- **Frontend:** `https://assay-uhhh2.vercel.app` (public); production domain `https://assay-omega-gray.vercel.app`; deployment `assay-o65mwq19k-uhhh2.vercel.app`; commit `c27a02a`. Final-build screenshots are in `docs/evidence/`.
- **API:** `https://assay-api-7hy0.onrender.com`, live at `60fac34`, worker enabled, Reppo live.
- **Presidio:** `https://assay-presidio.onrender.com`, `REDUCED_PII_MODE`.
- **Database/auth/storage:** Neon Postgres/Neon Auth/private S3-compatible storage; trusted origins include the production and stable alias domains; public signup disabled.
- **Production env names:** `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_BASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `API_PUBLIC_URL`, `APP_ENV`, `VERCEL_PREVIEW_FEEDBACK_ENABLED=0`.

## Post-submission access and branding — complete

- Vercel Authentication is **disabled** for the project; `https://assay-uhhh2.vercel.app` is public (`200`), and `/dashboard` redirects to the app’s own `/login`. No Vercel login is required. After repeated automation, Vercel’s automatic bot mitigation challenged this datacenter IP (`x-vercel-mitigated: challenge`); an independent external fetch and a headed browser still received the Assay pages and signed in. This is not deployment authentication.
- User-facing preview/demo/staging copy was removed from the landing, login, authenticated shell, footer, settings, borrower, audit, document and facility views. Synthetic aliases and the organization name were renamed to remove “Demo”.
- A 24-route headed-browser check verified the logo on every actual route, no banned branding and no Vercel toolbar. Screenshots and the route map are in `docs/evidence/`.
- `/favicon.ico` and `/opengraph-image` return `200`; `/opengraph-image` serves `image/png`.
- The three Neon Auth accounts were updated to the operator-requested passwords and re-linked by `pnpm seed:workspace`. Passwords are delivered only in chat and stored in `/root/assay-secrets/demo-users.env` (mode 600), never in Git.
- Production deployment: `c27a02a` / `assay-o65mwq19k-uhhh2.vercel.app`. Render API remains at `60fac34` (web-only change).

## Residual operator actions

1. Upload the demo to YouTube (unlisted) or Google Drive if the hackathon form requires that host; the GitHub release asset is public and currently linked.
2. Confirm OpenServ data-collection is enabled and the SERV API credit balance is adequate in the operator console.
3. Kite payment remains provider-blocked on both documented testnet endpoints; do not retry or claim a receipt without new provider evidence.
4. Production is public; the workspace remains invite-only at the app level. Use the three synthetic accounts supplied to the operator for judge access.

## Authorization boundaries

- Synthetic data only; no public signup.
- No Kite wallet spend; payment path is provider-blocked and must not be retried.
- Production was deployed only after the full gate passed; no critical/high finding remains.
- Never fabricate provider output, receipts, attestation or verification results.
- Do not expose secrets. `.env.local`, `.kite-passport/` and `/root/assay-secrets/` are outside Git.
