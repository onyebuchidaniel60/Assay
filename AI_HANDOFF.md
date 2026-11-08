# AI_HANDOFF.md — Current implementation state

**Project:** CovenantOps — Financial Covenant Operations Platform  
**Blueprint version:** 1.0  
**Last updated:** 2026-11-08  
**Implementation status:** Not started; blueprint and handoff package only  
**Current phase:** Phase 0 — consolidated operator intake/readiness  
**Application code written by this blueprint session:** No

## Current state

- Product specification: drafted in `PROJECT_SPEC.md`.
- Business logic: fixed in `BUSINESS_LOGIC.md`.
- Architecture and stack: fixed in `ARCHITECTURE.md`.
- Data model/API/security/UI requirements: documented in their respective files.
- Autonomous phases: documented in `IMPLEMENTATION_PLAN.md`.
- Persistent agent rules: `AGENTS.md`.
- Operator intake: see `OPERATOR_INTAKE.md`; not yet completed.
- UI reference image: **not attached to this conversation and not verified in a repository**. Must be supplied or generated only with express operator authorization during intake.
- Repository: not supplied/identified in this blueprint session. Existing repository and Git state must be inspected before modification.
- Vultr account, credentials, quotas, region, domain and permissions: not verified.
- Preview URL: **none**. No deployment has occurred.
- Deployed commit: **none**.
- Production release: **not authorized**.
- Budget ceiling: **not supplied**; no paid provisioning or service use authorized.
- `stageshow` skill: not installed or inspected yet; required attempt at start of UI phase.
- Tests: none run; no application implementation exists.
- Demo video: not produced; no capture/narration performed.

## Fixed product/architecture constraints

- Product name: CovenantOps.
- Customer: commercial lenders and private credit firms.
- MVP: one contract-configurable maximum Debt/EBITDA covenant, deterministic assessment, separate forward-looking scenario, evidence trace, fail-closed verification, exception/case workflow, human approval, stale-decision invalidation and hash-linked audit history.
- No universal covenant coverage claim; no OCR in MVP; scanned PDFs go to review.
- AI proposes extraction and drafts prose only; it never performs authoritative arithmetic, activates formulas, approves, sends communications or changes audit history.
- Fixed implementation stack and deployment are in `ARCHITECTURE.md`.
- Preview uses synthetic data and isolated preview credentials. Production is prohibited without explicit authority.

## Next exact task

1. Read the complete handoff package and inspect the actual repository without modifying it.
2. Complete every applicable row in `OPERATOR_INTAKE.md` in one consolidated operator interaction; do not ask questions whose answers are already in the repository or handoff.
3. Verify the reference image asset or record express permission for agent-generated reference imagery.
4. Validate repository write access, Vultr account and region, budget ceiling, Compute provisioning authority, Object Storage access, Inference key/model/catalog, domain/DNS/TLS, SSH/firewall access, preview authority and data policy.
5. Verify the model with a safe test and confirm the response model ID exactly matches the configured ID.
6. Do not begin implementation until all critical readiness inputs are validated. Then execute Phase 1 onward autonomously.

## Checkpoint template

```text
Current phase:
Completed:
Tests and evidence:
Preview/staging URL:
Deployed commit:
Reference image and UI skill status:
Documentation status:
Demo video status:
Known issues:
Authorization boundaries:
Next task:
Blocked by (if any):
```
