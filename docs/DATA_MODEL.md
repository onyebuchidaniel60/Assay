# Data Model

PostgreSQL is canonical. Full field definitions, constraints and relationships are in `MASTER_BLUEPRINT.md` §7.

Main tables:

- `profiles` — Neon Auth identity + Assay role/status.
- `borrowers` — synthetic borrower aliases/reference tokens.
- `facilities` — credit facility attached to borrower.
- `documents` — encrypted object metadata and lifecycle status.
- `analysis_runs` — immutable analysis snapshots and workflow state.
- `covenant_terms` — confirmed Debt/Adjusted EBITDA terms and source evidence.
- `financial_inputs` — analyst-attested figures and permitted add-backs.
- `scenario_results` — baseline and two stress calculations.
- `proof_artifacts` — fixed circuit version, proof storage reference, verification status.
- `approvals` — manager decision, rationale and exact proof/run version.
- `audit_events` — per-borrower signed hash chain, encrypted payloads.
- `borrower_keys` — wrapped DEK status; crypto-shred marker.
- `redaction_revisions` — redacted text and encrypted token map revisions.
- `feedback_records`, `reppo_evaluations` — synthetic feedback and actual evaluation status.
- Optional `kite_sessions`, `kite_payments` — spending session and receipts.
- `jobs`, `idempotency_records` — durable jobs and retry safety.

Use UUIDs, UTC timestamps, enums/checks, foreign keys, unique keys and indexes. Store amounts as integer minor units. Keep raw financial fields out of manager/auditor DTOs. Do not put raw prompt/document content in operational job payloads or logs.
