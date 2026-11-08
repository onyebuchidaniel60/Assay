# CovenantOps — Implementation Handoff Package

**Version:** 1.0 | **Prepared:** 8 November 2026 | **Status:** Blueprint complete; operator readiness pending.

## Start here
1. Read `PROJECT_SPEC.md`.
2. Read `ARCHITECTURE.md`, `BUSINESS_LOGIC.md`, `DATA_MODEL.md`, `API.md`, `SECURITY.md`, and `UI_UX.md`.
3. Complete `OPERATOR_INTAKE.md` once, before editing the repository.
4. Obtain the reference image(s) recorded in `REFERENCE_ASSETS.md` or receive express authorization to generate them.
5. Execute `IMPLEMENTATION_PLAN.md` autonomously under `AGENTS.md`.
6. Maintain `AI_HANDOFF.md` and `docs/BUILD_LOG.md` at every checkpoint.

## Readiness status
- Product, MVP, business rules and architecture: specified.
- UI reference: **not attached**; required at intake or generated only with express authorization.
- Repository, domain, Vultr access, credentials and cost ceiling: unknown; intake required.
- Production release: **not authorized** by this blueprint.
- Demo data: synthetic only.

## Fixed MVP promise
A credit analyst onboards a borrower and facility; uploads a synthetic credit agreement and financial statement; reviews source-linked extraction; submits a contract-configurable Debt/EBITDA covenant for manager activation; confirms financial evidence; runs an actual and separate forecast scenario; gets deterministic calculation and independent verification; opens a breach case; drafts an escalation memo; gets manager approval; then changes evidence and demonstrates stale assessment/approval invalidation. The audit timeline shows the full chain.

## Package files
`IMPLEMENTATION_BLUEPRINT.md` (master sections 1–30), `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `BUSINESS_LOGIC.md`, `DATA_MODEL.md`, `DATABASE_OPERATIONS.md`, `API.md`, `SECURITY.md`, `UI_UX.md`, `EDGE_CASE_MATRIX.md`, `IMPLEMENTATION_PLAN.md`, `AGENTS.md`, `AI_HANDOFF.md`, `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `DEMO_VIDEO_PLAN.md`, the full `docs/` operator guides and `reference/PROPER_VIBE_CODING_WORKFLOW_AUTONOMOUS.md`.

## Current technical references (revalidate at implementation)
- Vultr Serverless Inference: https://api.vultrinference.com/docs
- Vultr Inference quickstart/model behavior: https://api.vultrinference.com/docs/get-started/quickstart
- Vultr Object Storage compatibility: https://docs.vultr.com/products/storage/object-storage/s3-compatibility-matrix
- Vultr Cloud Compute firewall: https://docs.vultr.com/products/compute/instances/cloud-compute/networking/enable-firewall
- PostgreSQL version support: https://www.postgresql.org/support/versioning/
- Node.js release/LTS status: https://nodejs.org/en/about/previous-releases
- Better Auth Drizzle/PostgreSQL adapter: https://better-auth.com/docs/installation
- Next.js support policy: https://nextjs.org/support-policy

Provider pricing, regional availability, data-processing terms, credentials and limits are not assumed.

## Reviewer/demo access
The live preview should use synthetic-only records and pre-seeded demo roles. During intake, decide how hackathon reviewers are allowed to access the public URL (for example, a limited read-only reviewer account plus a separate resettable analyst/manager demo environment). Never publish infrastructure credentials or unrestricted admin credentials. Any demo credentials must be isolated, revocable, resettable and limited to synthetic data.

## Source methodology
The original operator-supplied workflow document is preserved in `reference/PROPER_VIBE_CODING_WORKFLOW_AUTONOMOUS.md`. The phase sequence, consolidated intake, autonomous checkpoints, early shell deployment, reference-image-led UI implementation, StageShow skill requirement, final documentation and <=3-minute reviewed demo are derived from that source. This blueprint applies the source methodology to CovenantOps rather than replacing it.

## Important readiness blockers
The package is design-complete but not deployment-ready until the operator intake is completed. In particular, no reference image, repository URL/access, numeric cost ceiling, Vultr account/service credentials, region, domain or preview deployment authority was supplied. Production deployment is expressly not authorized. No code, preview, tests or demo video have been created.
