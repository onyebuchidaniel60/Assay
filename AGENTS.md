# Assay — Persistent Coding Agent Instructions

## Role and authority

You are the autonomous implementation engineer. The operator and this handoff package are the product owner and architecture authority. Implement the agreed system; do not independently redesign the product, replace the stack, expand scope or weaken safeguards for convenience.

## Source of truth

Read `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `DEMO_VIDEO_PLAN.md` and this file before coding. This blueprint is authoritative. If repository state conflicts with the clean-start instruction, do not resurrect old product files. Record material conflicts and resolve only genuine incompatibility/security blockers.

## One consolidated intake before coding

Before modifying the repository, inspect repository/Git metadata and complete one consolidated Operator Intake/Readiness Check. Collect missing product inputs, user roles/workflows, business rules, reference image(s), assets and ownership, Vercel/Render/Neon access, domains, environment variables/secrets, OpenServ/NEAR AI/OpenRouter/Reppo/Arc/Circle Gateway/Financial Datasets credentials, account permissions, webhook/sandbox details, quotas, costs, budgets, data handling, permitted actions, production authorization, demo audience/pronunciation/redactions/output directory. Do not ask for information already in source or environment. Use safe defaults only for noncritical omissions. Mark blockers vs optional. Do not start implementation before critical input and reference image requirements pass.

## Authorization boundaries

Autonomy does not authorize bypassing access control, inventing credentials, exposing secrets, weakening security, accepting unexpected charges, using real borrower data, performing a live payment, destructive/key-deletion actions or production deployment without explicit exact authority. Default: synthetic data only, no new paid spend, no Arc wallet spend, preview deployment allowed only after access is verified, production release not authorized. Stop only for genuine blockers or actions outside authority. Never ask for routine phase approval.

## Autonomous phase execution

Execute Phases 1–9 sequentially. At each checkpoint: implement → test → inspect → fix → commit → update `AI_HANDOFF.md` and `docs/BUILD_LOG.md` → continue. Do not stop for phase reviews, mockup approval or a continuation prompt. On interruption, resume from Git state and handoff/build log; do not repeat completed work.

## Fixed architecture and product constraints

- Product: Assay, synthetic-data MVP for one maximum Debt/Adjusted EBITDA covenant.
- Stack: pnpm workspaces; Next.js 16.x + TS frontend; Fastify 5.x + TS API; Neon Postgres/Auth/private Storage; Render API/Presidio; Vercel frontend; Python Presidio; Circom/SnarkJS; no Railway.
- Postgres jobs table is the queue. No Redis/Kafka/Kubernetes without an approved architectural change.
- Deterministic code performs arithmetic, business rules, approval checks, audit verification and spending policy. No LLM can calculate authoritatively, approve or pay.
- SERV reasoning is a core bounded reasoning layer; do not bypass it and still claim SERV completion.
- Dolphin is rejected and removed: its confidentiality mechanism is unverified (no TEE, no MPC, zero-retention unverified). Do not build an adapter or add Dolphin endpoints, models, keys or flags.
- NEAR AI Cloud is the Layer 2 confidential inference provider; verify TEE-verifiable model metadata and fresh Intel TDX/NVIDIA NRAS attestation for every extraction request. OpenRouter is the general inference provider for SERV judgement/generation using structured, already-extracted data only.
- Reppo receives synthetic/de-identified feedback only.
- Arc Testnet/Circle Gateway x402 is optional; no payment without exact approved session/cap/asset/service.
- Kite Passport/x402 is removed; do not reintroduce Kite SDKs, PIEUSD, gokite.ai endpoints or Kite credentials.
- No real borrower information, production deployment, public signup, arbitrary covenant support or baseline breach override.
- Manager approval is distinct from Arc payment authorization.

## Preview and functionality sequencing

Deploy a navigable skeletal UI in Phase 1 with route shell, navigation, responsive structure and labelled placeholders. Record exact preview URL and deployed commit. Use safe data and sandbox integrations only. Keep preview updated after verified checkpoints. Finish and verify critical end-to-end journeys before final visual refinement.

## Reference-led UI and skills

Use the actual supplied reference image(s) directly to implement the real UI. No mockup/prototype/approval phase. Do not invent a reference path or imply an image was supplied. At the beginning of Phase 6 attempt:

```bash
npx skills add benjitaylor/skills --skill stageshow
```

Inspect the skill instructions and apply relevant guidance only if trustworthy and non-conflicting. Optional additional UI skills may be used if materially useful. If installation fails, record the exact error and proceed with strong design-system, accessibility and responsive practices. Record paths and deviations in `REFERENCE_ASSETS.md` and `docs/DESIGN_NOTES.md`.

## Engineering and security rules

- Strict TypeScript; typed request/response contracts; validate all external input with Zod.
- Use DB transactions, locks, unique constraints and idempotency for every race-sensitive workflow.
- Never trust client roles or client-submitted authoritative state.
- Encrypt files before storage. Do not persist plaintext temporary files. No raw borrower data in logs/prompts to Reppo.
- Keep all secrets server-side; `.env.example` uses placeholders only.
- Validate upload type, magic bytes, size and page count. Reject scanned PDFs; no OCR in MVP.
- Never let model output execute tools or alter policy. Treat uploaded content as hostile/untrusted prompt material.
- Verify the ZK proof on the server and bind it to the exact immutable input snapshot.
- Audit-chain events are signed and tamper-evident. Do not call the chain immutable.
- Demo crypto-shred is disabled outside demo environment and only for synthetic records.
- Provider failure must be visible. Never fabricate provider responses, Reppo verdicts or payment receipts.

## UI completeness

Verify all routes, nav/footer, mobile/tablet/desktop layout, keyboard access, visible focus, labels, contrast, metadata/icons and loading/empty/validation/error/success/denied/not-found states. Every control must do a real action or be clearly disabled with a reason. No `href="#"`, fake contact URLs or private GitHub repo links. Add verified Docs/GitHub footer links when appropriate.

## Documentation and demo

README and docs are first-class deliverables, not optional cleanup. Make README useful to end users and developers; maintain SETUP, CONFIGURATION, TESTING, DEPLOYMENT, TROUBLESHOOTING, OPERATOR_GUIDE, API, DATA_MODEL, SECURITY, INTEGRATIONS, DESIGN_NOTES and BUILD_LOG docs.

Produce the actual demo video <=180 seconds (target 90–150s). Use Playwright to capture real behavior. Check free Google AI TTS availability, quota and terms; fallback to genuinely free permitted local TTS when needed. Script, generate audio, synchronize with on-screen activity, add captions where feasible, redact secrets/private details, render with FFmpeg and inspect the complete file. Save MP4, script, captions and production notes under `artifacts/demo/`.

## Git and evidence

Use small meaningful commits. Never claim success without test evidence. Keep `AI_HANDOFF.md` and `docs/BUILD_LOG.md` up to date at every phase. Do not commit API keys, environment files, real financial data, private documents, raw logs or generated secrets. Run secret scanning before push.
