# API Reference

Base path: `/v1`. JSON, camelCase. Protected endpoints require a valid Supabase Auth bearer token. The full endpoint/role table and representative payloads are in `MASTER_BLUEPRINT.md` §10.

## Common response/error contract

Success responses use `{ "data": ..., "requestId": "..." }` or a documented paginated shape. Errors use:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "requestId": "req_...",
    "details": {"fieldErrors": {"thresholdBps": "Must be positive."}}
  }
}
```

Never expose stack traces, provider raw errors, prompts, raw documents or private financial content in error responses.

## Core endpoints

- `GET /health/live`, `GET /health/ready`
- `GET /v1/me`
- `GET/POST /v1/borrowers`, `GET/PATCH /v1/borrowers/:id`
- `POST /v1/borrowers/:id/facilities`, `GET /v1/facilities/:id`
- `POST /v1/facilities/:id/documents`, `GET /v1/documents/:id`, `GET /v1/documents/:id/preview`
- `POST /v1/analysis-runs`, `GET /v1/analysis-runs/:id`
- `POST /v1/analysis-runs/:id/redaction-review`
- `POST /v1/analysis-runs/:id/extraction`
- `POST /v1/analysis-runs/:id/terms-review`
- `PUT /v1/analysis-runs/:id/financial-inputs`
- `POST /v1/analysis-runs/:id/calculate`
- `GET /v1/analysis-runs/:id/report`
- `POST/GET /v1/analysis-runs/:id/proof`
- `GET /v1/approvals/queue`, `POST /v1/analysis-runs/:id/approvals`
- `GET /v1/borrowers/:id/audit-events`, `POST /v1/borrowers/:id/audit/verify`
- `POST /v1/demo/borrowers/:id/shred` (demo-only)
- `POST /v1/feedback`
- `POST /v1/integrations/reppo/evaluations`, `GET /v1/integrations/reppo/evaluations/:id`
- `GET /v1/integrations/status`
- Optional `POST /v1/integrations/kite/benchmark-requests`

## Security and idempotency

Mutating actions validate role and resource state on the server. `Idempotency-Key` is mandatory for run creation, approval, payment and all operations that may be retried after a timeout. Upload uses streaming limits and file magic-byte verification. Approval and payment lock the relevant rows. The API ignores client-supplied role/result/proof/remaining-budget fields.

OpenAPI must be generated from actual Fastify route schemas and committed after endpoints are implemented. This file is the contract intent, not proof of a deployed API.
