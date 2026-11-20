# API Reference

Base path: `/v1`. JSON, camelCase. Protected endpoints require the Neon Auth session cookie, validated server-side by Fastify; the API never trusts a client-supplied role or organization.

Success responses use `{ "data": ..., "meta": { "requestId": "..." } }`. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "requestId": "req-...",
    "details": { "fieldErrors": { "thresholdBps": "Must be positive." } }
  }
}
```

Stack traces, SQL messages, provider raw errors, prompts, raw documents and private financial content are never returned.

## Health and identity

| Method / path | Access | Purpose |
|---|---|---|
| `GET /health/live` | Public | Liveness only |
| `GET /health/ready` | Public | Aggregate readiness; no dependency details |
| `GET /v1/me` | Authenticated | Current staff user, organization, role and capabilities |

## Borrowers, facilities, documents

| Method / path | Access | Notes |
|---|---|---|
| `GET /v1/borrowers` | All staff | Tenant-scoped list with facility counts |
| `POST /v1/borrowers` | Analyst/Admin | Creates borrower, DEK, audit head/event transactionally; optional `Idempotency-Key` |
| `GET /v1/borrowers/:id` | All staff | Borrower plus facilities |
| `PATCH /v1/borrowers/:id` | Analyst/Admin | Version-checked alias/status edit with audit |
| `POST /v1/borrowers/:id/facilities` | Analyst/Admin | Creates facility with audit event |
| `GET /v1/facilities` | All staff | Tenant-scoped facility register |
| `GET /v1/facilities/:id` | All staff | Facility, documents and run summaries; role-shaped |
| `POST /v1/facilities/:id/documents` | Analyst/Admin | Multipart upload, 10 MiB cap, PDF/TXT magic-byte validation, 40-page cap, no-text PDF rejection, AES-GCM encryption, private object write |
| `GET /v1/documents/:id` | All staff | Role-shaped metadata (analyst sees filename/hash) |
| `GET /v1/documents/:id/preview` | Analyst/Admin | Decrypts and parses in memory; `Cache-Control: no-store`; no file download |

## Analysis lifecycle

| Method / path | Access | Notes |
|---|---|---|
| `GET /v1/analysis-runs` | All staff | Tenant-scoped list; filter `status`/`facilityId`; role-shaped |
| `POST /v1/analysis-runs` | Analyst/Admin | `Idempotency-Key` required; creates immutable run, locks facility, enqueues parse job |
| `GET /v1/analysis-runs/:id` | All staff | Analyst full workflow fields; manager/auditor restricted |
| `GET /v1/analysis-runs/:id/redaction` | Analyst/Admin | Redacted pages and non-sensitive entity spans |
| `POST /v1/analysis-runs/:id/redaction-review` | Analyst/Admin | Confirm/reject, or create a new immutable revision with page-local span corrections |
| `POST /v1/analysis-runs/:id/extraction` | Analyst/Admin | Enqueues `analysis.extract`; returns `202`; worker verifies NEAR AI TDX/NRAS + response signature before saving terms |
| `POST /v1/analysis-runs/:id/terms-review` | Analyst/Admin | Revision-checked confirm/reject; edits threshold/definitions/add-backs |
| `PUT /v1/analysis-runs/:id/financial-inputs` | Analyst/Admin | Integer minor units, permitted add-back codes, deterministic caps, explicit attestation; seals snapshot |
| `POST /v1/analysis-runs/:id/calculate` | Analyst/Admin | Deterministic Decimal calculation + independent BigInt verification + SERV coherence gate; stores three sealed scenario rows |
| `POST /v1/analysis-runs/:id/proof` | Analyst/Admin | `Idempotency-Key` required; generates/verifies fixed-circuit proof in a one-shot child process; witness never persisted |
| `POST /v1/analysis-runs/:id/proof/verify` | Analyst/Manager/Auditor/Admin | Re-verifies the stored proof bytes against the fixed verification key; mutation sets `PROOF_FAILED` and blocks approval |
| `GET /v1/analysis-runs/:id/proof` | Analyst/Manager/Auditor | Proof status/public signals; no witness or proof bytes |
| `GET /v1/analysis-runs/:id/report` | All staff | Analyst full; manager restricted; auditor evidence-only; admin metadata |
| `POST /v1/analysis-runs/:id/cancel` | Analyst/Admin | Allowed before a manager decision; terminal `CANCELLED` |

## Approvals

| Method / path | Access | Notes |
|---|---|---|
| `GET /v1/approvals/queue` | Manager | Pending `READY_FOR_MANAGER` runs; restricted fields plus proof ID and scenario bands |
| `POST /v1/analysis-runs/:id/approvals` | Manager | `Idempotency-Key` required; row lock; exact proof/version/snapshot check; one decision per run; stressed breach requires risk acknowledgement and rationale |

## Audit, feedback and integrations

| Method / path | Access | Notes |
|---|---|---|
| `GET /v1/borrowers/:id/audit-events` | All staff | Metadata only; payload availability is role-shaped |
| `POST /v1/borrowers/:id/audit/verify` | All staff | Recomputes the per-borrower hash chain and verifies every Ed25519 signature |
| `GET /v1/borrowers/:id/audit-events/:eventId/payload` | Analyst/Admin | Decrypts the sealed payload; returns unavailable after key shred |
| `POST /v1/feedback` | Analyst/Admin | Stores a synthetic correction and audit event; optional `submitToReppo` creates a de-identified Reppo trace (50 KB preflight) |
| `GET /v1/integrations/status` | Analyst/Admin | Configured/disabled/blocked status; no secrets |
| `POST /v1/integrations/reppo/evaluations` | Analyst/Admin | Submits a feedback record to the live Reppo Eval Router; returns `202` or a visible provider/client error |
| `GET /v1/integrations/reppo/evaluations` | All staff | Tenant-scoped evaluation register |
| `GET /v1/integrations/reppo/evaluations/:id` | All staff | Real provider status/score/decision/confidence/route/result; `?refresh=1` polls the provider |
| `GET /v1/analysis-runs/:id/external-evidence` | All staff | Deterministic evidence plan, retrieved evidence, payment intents and provider status; payload only for analyst/admin |
| `POST /v1/analysis-runs/:id/external-evidence/free` | Analyst/Admin | Free SEC EDGAR retrieval; requires an explicit public-reference confirmation and idempotency key |
| `POST /v1/analysis-runs/:id/external-evidence/quote` | Analyst/Admin | Fetches the provider's real terms, runs the deterministic Arc policy and persists `PROPOSED` or `POLICY_REJECTED` |
| `POST /v1/analysis-runs/:id/external-evidence/authorize` | Analyst/Admin | Re-evaluates policy, locks the session, reserves budget and queues `payment.execute`; a policy rejection never executes |
| `POST /v1/analysis-runs/:id/external-evidence/payments/:intentId/reconcile` | Analyst/Admin | Queues a lookup of the original authorization; never creates a second payment |
| `GET /v1/analysis-runs/:id/external-evidence/:evidenceId` | All staff | Source-linked evidence; payload is role-restricted |
| `POST /v1/demo/borrowers/:id/shred` | Admin, demo-only | Requires `APP_ENV=demo`, `ENABLE_DEMO_SHRED=true`, synthetic `BOR-*` reference and typed confirmation |

## Idempotency and state

`Idempotency-Key` is mandatory for run creation, proof generation, manager decisions, free external-evidence retrieval and paid payment intents. Other mutating endpoints accept it. Reuse with a different request hash returns `409 IDEMPOTENCY_CONFLICT`. State transitions use row locks and a version check; stale or concurrent actions return `409`. Payment authorisation locks the payment-session row and reserves budget before queuing execution. A timeout becomes `RECONCILIATION_REQUIRED`; reconciliation looks up the original nonce and never creates a second payment.

## Security notes

- Uploads are capped at 10 MiB and 40 PDF pages; encrypted/password PDFs and scanned PDFs without a text layer are rejected.
- Original documents and raw financial values never enter manager/auditor DTOs.
- Provider output is never fabricated. Attestation failure, SERV failure and proof failure produce visible states; the run cannot be approved.
- The OpenAPI document must be generated from the actual Fastify schemas and committed after route documentation stabilises. This file is the implemented contract summary.
