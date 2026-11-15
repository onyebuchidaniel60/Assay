# Assay — AI Handoff / Build State

**Status:** Blueprint complete; implementation not started.  
**Current phase:** Phase 0 — Operator Intake / Readiness pending.  
**Repository:** `https://github.com/onyebuchidaniel60/Assay` (operator intends to clear existing contents first).  
**Preview URL:** Not deployed.  
**Deployed commit:** None.  
**Production release authority:** Not granted.  
**Data boundary:** Synthetic data only; no real borrower records.

## Completed

- Product definition and MVP boundary documented.
- Four staff roles and access matrix documented.
- Primary analyst, manager, auditor, admin and partner journeys documented.
- Deterministic covenant arithmetic and state machine defined.
- Data model, API and transaction rules defined.
- Architecture and stack fixed: Next.js, Fastify, Supabase, Render, Vercel, Presidio, Circom/SnarkJS.
- Security, privacy, AI, provider and payment controls documented.
- Autonomous implementation phases and checkpoint rules documented.
- README/docs, reference asset inventory and final demo deliverables specified.

## Intake blockers

1. **UI reference image(s) not yet supplied.** Required before implementation begins under the workflow guide. Record exact filenames/paths and provenance once received.
2. **OpenServ SERV key/model/catalog access** must be supplied/verified.
3. **Dolphin @dphnAI** exact endpoint, model name, auth mechanism and privacy/service terms must be verified. Do not use the unrelated `api.dolphinllm.com` endpoint as a substitute.
4. Vercel, Render and Supabase access must be verified. Confirm which plans are available and no new paid resource will be created without authorization.
5. Reppo key is optional; no Reppo call until provided and synthetic-only policy verified.
6. Kite Passport is optional; no wallet funding or testnet spend without exact per-payment/total cap, asset, session owner and allowed service explicitly authorized.
7. Google TTS key/free quota is optional; check current free tier and terms. Use local free fallback if unavailable.

## Known defaults / authority

- Synthetic data only.
- No paid spend or top-ups by default.
- No Kite wallet spend by default.
- Preview deployment only after account access is verified.
- Production deployment is not authorized unless explicitly granted in the completed intake.
- `ENABLE_DEMO_SHRED=false` except during an explicitly authorized synthetic demo.
- No public signup.
- No live borrower information.

## Verification evidence

No implementation or test results exist yet. This file must be updated at every internal checkpoint with exact commands, results, URLs, commits, integration status and remaining issues.

## Next task — exact start point

Read `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `DEMO_VIDEO_PLAN.md` and `MASTER_BLUEPRINT.md`. Inspect repository/Git status without changes. Complete the entire consolidated Operator Intake/Readiness Check in one pass; validate reference images, credentials, provider endpoints, account permissions, deployment access and budget/production boundaries. Do not modify the repository or begin Phase 1 while critical intake items remain unresolved. Once the intake passes, proceed to Phase 1 and execute all remaining phases autonomously.
