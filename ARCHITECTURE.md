# ARCHITECTURE.md — Fixed technical architecture

## 1. Architectural decision

Use a **modular monolith plus one background worker**, with a separate isolated PDF parser. This is the simplest structure that supports financial transactions, async document/AI workloads, audit, and Vultr's role as the central platform without microservices/Kubernetes.

- `apps/web`: Next.js UI, server-side REST route handlers, Better Auth integration.
- `apps/worker`: Node.js worker and pg-boss consumers.
- `apps/pdf-parser`: private parser container; no public ingress and no internet egress.
- `packages/domain`: business rules, state transitions, formula DSL, calculations and verification.
- `packages/db`: Drizzle schema, migrations and tenant-scoped repositories.
- `packages/contracts`: shared Zod request/response/AI schemas.
- `packages/ai`: Vultr inference client, prompts, extraction schemas and output validation.
- `packages/storage`: S3-compatible private storage adapter and local development adapter.

The browser only talks to Next.js API routes. Web and worker use shared domain code. Route handlers are thin and do not contain finance rules.

## 2. Fixed stack

| Layer | Choice | Responsibility / reason |
|---|---|---|
| Runtime | Node.js 24 LTS | Supported LTS runtime; pin exact patch/image. |
| Package manager | pnpm workspaces | Single lockfile, shared typed packages. |
| Web | Next.js 16 App Router, React 19, TypeScript | UI + REST endpoints in one deployable app. Next 16 is Active LTS as of 8 Nov 2026. |
| Styling | Tailwind CSS 4, shadcn/ui, Radix, Lucide | Accessible, consistent UI components. |
| Forms | React Hook Form + Zod | Shared form/API validation. |
| Tables | TanStack Table | Sort/filter/paginate operational tables. |
| Charts | Recharts | Limited portfolio trends; not sole source of information. |
| Auth | Better Auth, email/password, invite/seed controlled | Avoid paid auth dependency; server sessions and DB persistence. Pin patched stable version and test config. |
| DB | PostgreSQL 18+ | ACID, JSONB snapshots, NUMERIC, row locks. Initial container major: 18. |
| ORM/migrations | Drizzle ORM + drizzle-kit | Explicit SQL/migrations and typed schema. |
| Queue | pg-boss | Durable Postgres-backed jobs; no Redis required. |
| PDF text | pdfjs-dist in isolated parser container | Page-indexed text extraction; no OCR MVP. |
| Malware scan | ClamAV container/service | Scan before parsing; fail closed if enabled scanner is unavailable. |
| File storage | Vultr Object Storage, S3-compatible | Private source docs and generated exports. |
| AI | Vultr Serverless Inference via OpenAI-compatible SDK | Extraction and memo wording, not calculations. |
| Decimal | decimal.js | Exact financial arithmetic vs JS binary floating point. |
| Logging | Pino | Structured logs with redaction/correlation IDs. |
| Proxy/TLS | Caddy | HTTPS termination/reverse proxy. |
| Runtime deployment | Docker Compose on Vultr Cloud Compute, Ubuntu 24.04 LTS | App/backend control plane hosted on Vultr. |
| Tests | Vitest, API integration tests, Playwright | Unit/API/E2E. |
| CI | GitHub Actions | Lint, typecheck, tests, build and authorized deploy. |

Pin exact patched dependencies and container digests at implementation. Do not use `latest`, canary or floating tags in deployment. Recheck support/security notices at build start.

## 3. Vultr deployment topology

One Vultr Cloud Compute VM for the hackathon MVP. Starting capacity recommendation: **4 vCPU / 8 GB RAM / 160 GB NVMe**, subject to live quote, region availability, available credits and the operator's hard cost ceiling. This is not authorization to provision/spend. Load-test before reducing capacity.

```text
Internet
  |
Vultr Firewall (80/443; SSH 22 only from approved operator IP)
  |
Caddy container (public HTTPS)
  |
Next.js web container (private port 3000)
  |-- REST/API + auth + server-side services
  |-- PostgreSQL container (private only; not host-published)
  |-- pg-boss job queue in PostgreSQL
  |-- Worker container (private)
       |-- ClamAV scanner (private)
       |-- PDF parser container (private, no external egress)
       |-- Vultr Object Storage (outbound HTTPS)
       |-- Vultr Serverless Inference (outbound HTTPS)
```

Vultr product roles:
- **Cloud Compute:** web app, API, DB, worker and orchestration; central application/control plane.
- **Object Storage:** private original documents and generated reports; no public access or CDN.
- **Serverless Inference:** model extraction/memo assistance; called server-side only.

No Vercel frontend, Supabase backend, external DB, Redis, Kubernetes, payments, vector DB, email or bank integration in MVP.

## 4. Network and runtime security

- Public ingress only 80/443. Restrict SSH to operator-approved source IP or other approved secure access.
- Never publish PostgreSQL, pg-boss, parser or ClamAV ports.
- Separate Docker networks: public edge only Caddy; application-private web/worker/db; parser/scanner-private. Parser has no internet egress.
- Run services non-root; read-only filesystem where practical; drop Linux capabilities; no privileged containers; CPU/memory/PID limits on parser and worker.
- Web and worker require outbound HTTPS to Vultr Object Storage for authorized upload/download/processing. Worker additionally requires outbound HTTPS to Vultr Serverless Inference. Restrict egress to documented destinations where provider networking permits; parser has no internet egress.
- Secrets in runtime env/secret store with restrictive permissions; never in repository, image, client bundle or logs.
- Preview uses synthetic seed data, preview DB/bucket and restricted credentials. Never production data/secrets/real external actions.

## 5. Document processing data flow

1. Browser submits multipart PDF to Next API.
2. API authenticates, checks org/facility permission, streams with 25MB max, verifies PDF signature/MIME and computes SHA-256.
3. API uploads to private staging key in Vultr Object Storage.
4. DB transaction inserts document/version metadata and pg-boss job. If DB commit fails, compensation deletes staged object; orphan reconciliation detects failures.
5. Worker downloads object and performs ClamAV scan.
6. Worker passes bytes to isolated parser container. Parser returns page-indexed text, page count and parser diagnostics; no network access.
7. Worker sends minimal relevant page text to Vultr inference with strict extraction schema. Document text is untrusted data.
8. Worker checks Zod schema, returned model ID, page references and quote excerpts. Invalid/ambiguous output -> NEEDS_REVIEW.
9. UI exposes candidate to analyst; manager activates approved covenant.

## 6. Assessment data flow

1. API validates user permission and expected versions.
2. Domain service freezes approved formula/evidence snapshot and its canonical hash.
3. Formula engine evaluates allow-listed AST with Decimal.js.
4. Independent verifier reloads exact immutable versions, validates dimensions and recomputes through a separately implemented reference evaluator; it must not call the primary calculator function.
5. Actual classification saved only if verification passes.
6. Audit event and business-state mutation commit in same database transaction.

## 7. Memo/approval flow

1. Service builds deterministic fact packet from verified assessment and evidence references.
2. AI may improve prose only; it cannot add/change factual values or legal conclusions.
3. Server checks all metrics/statements against fact packet; unsupported claim rejected or sent to review.
4. Approval request hashes immutable memo/action payload and dependency versions.
5. Manager decision uses transaction and compare-and-set; changed dependencies invalidate request.
6. Approved memo can be exported; there is no external send integration.

## 8. Vultr Serverless Inference

- Base URL: `https://api.vultrinference.com/v1`.
- Chat endpoint: `POST /chat/completions` with bearer key, using OpenAI-compatible SDK.
- Initial configured model: `deepseek-v4.1-flash-1017`, subject to live catalog/key access, structured-output support, quality fixture and cost checks at intake.
- Vultr's current quickstart documents the endpoint, model catalog and warns that an unrecognized model ID on chat routes may fall back to its default model. **Always verify the `model` returned in each response equals `VULTR_INFERENCE_MODEL`; mismatch means failure, not accepted output.**
- Use structured JSON if supported; validate with Zod regardless. If model does not support constrained schema response, request strict JSON and reject parse/schema failure.
- Store model ID, prompt version, provider request ID, usage counters and output hash; do not log full sensitive prompts.
- Model changes require updated eval and explicit intake authority if cost/access/data terms change.
- No vector DB/RAG for MVP; chunk selected page text deterministically. Do not send other facilities or tenants' content.

## 9. AI workflow pattern

Use bounded deterministic workflow orchestration, not open-ended agent loops. Logical capabilities:
- Contract clause extractor: proposes terms and exact source quote/page.
- Financial extractor: proposes metric, amount, unit, period and source.
- Memo writer: produces language strictly from verified facts packet.

The model has no privileged action tools. No approve, send, delete, activate, alter audit or arbitrary URL-fetch tools. All model output is proposal data.

## 10. Jobs and retries

pg-boss queues: `document.scan-and-extract`, `document.ai-extract`, optional `export.generate`, P1 `audit.checkpoint`. For small MVP assessments, calculate and verify synchronously; if later async, queue versioned snapshot only.

Job payload includes organization ID, entity/version ID and idempotency key—not file path or user-supplied command. Retry only transient rate limit/5xx/network errors with exponential backoff+jitter, max 3 attempts. Do not indefinitely retry malformed document, unsupported PDF or invalid output. Persist sanitized failure reason.

## 11. Database and object storage

PostgreSQL stores relational metadata, formula/evidence snapshots, calculations, approvals, audit and queue state. Vultr Object Storage stores originals/exports with opaque random key, private bucket and TLS. Only server-side S3 credentials. Authorize download first, then issue presigned GET <=60 seconds; never persist/log signed URL. API-proxied upload is preferred for validation, hashing and scanning. Local development may use MinIO/local adapter; deployed config must reject local storage.

Current Vultr compatibility matrix lists presigned URLs supported but bucket access logging unsupported. App must therefore record authorized download activity itself; this is not a substitute for provider storage logs. Vultr also documents a possible `Content-Length` discrepancy on downloads due to gzip compression; compare the retrieved bytes against the stored SHA-256 and stored size metadata rather than trusting the HTTP header as the sole integrity check.

## 12. Auth, jobs, observability

Better Auth email/password invite/seed controlled; secure HTTP-only, SameSite, Secure cookies; CSRF/origin checks. Membership RBAC is separate from login session. Every repository query is tenant-scoped. No JWT localStorage.

Pino JSON logs use request/job/org/user IDs where appropriate, with sensitive field redaction. Health endpoints `/api/health/live` and `/api/health/ready` expose no secrets. Docker health checks/restart policy. Nightly encrypted PostgreSQL dump to private Object Storage, default 7-day demo retention; test restore before claiming backups work. No external telemetry stack in MVP.

## 13. Fixed exclusions / rejected alternatives

- Vercel + Vultr as a thin backend: rejected; Vultr must host actual app/control plane.
- Microservices/Kubernetes: rejected as unnecessary complexity.
- Redis/BullMQ: rejected; pg-boss/Postgres sufficient.
- Supabase hosted DB: rejected for this hackathon architecture.
- Open-ended agent framework: rejected due unnecessary autonomy/risk.
- LLM arithmetic: prohibited.
- OCR in MVP: deferred; scanned PDF requires manual review.
- Payments, emails, banking APIs, webhook integrations: not applicable.

## 14. Version selection and source references

PostgreSQL 18 is selected as the newest stable major in the current official version table; PostgreSQL 19 is still an RC on the blueprint date and is not selected for the demo deployment. Keep PostgreSQL 18 patched to the latest supported minor and revalidate at implementation. Node.js 24 is an LTS line with mature ecosystem support; pin a security-patched 24.x release. Next.js 16 is an LTS major; use its stable latest patch, never canary.

- Vultr Inference docs: https://api.vultrinference.com/docs
- Vultr Inference quickstart/model behavior: https://api.vultrinference.com/docs/get-started/quickstart
- Vultr Object Storage matrix: https://docs.vultr.com/products/storage/object-storage/s3-compatibility-matrix
- Vultr firewall guidance: https://docs.vultr.com/products/compute/instances/cloud-compute/networking/enable-firewall
- Next.js support policy: https://nextjs.org/support-policy
