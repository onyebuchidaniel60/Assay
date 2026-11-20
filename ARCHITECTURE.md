# Assay — Architecture Specification

## Architecture decision

A pnpm monorepo containing a Next.js web UI, Fastify API, Python Presidio service, domain/contract/crypto/AI/proof packages and tests. Backend jobs use a PostgreSQL table with `FOR UPDATE SKIP LOCKED`; no Redis/Kafka/Kubernetes.

## Runtime topology

```text
Browser / Next.js 16.x (Vercel)
  -> HTTPS API + Neon Auth JWT
Fastify API / Node.js 24 LTS (Render)
  -> Neon Postgres (canonical data + queue)
  -> private S3-compatible storage (ciphertext only)
  -> Presidio Python service (server-to-server token)
  -> OpenServ SERV reasoning API (orchestration)
       -> NEAR AI Cloud TEE-attested gateway (tokenized text only)
       -> OpenRouter (structured SERV judgement/generation)
  -> optional Reppo Evaluation API (synthetic-only)
  -> optional Arc Testnet / Circle Gateway x402 payment rail
       -> deterministic PaymentPolicyService before signing
       -> Postgres worker for execution/reconciliation
  -> SEC EDGAR free public data + optional paid financial-data providers
Worker loop inside API deployment
  -> PDF text extraction / PII redaction / provider calls / ZK proof / polling
  -> payment.execute / payment.reconcile with no blind retry
```

## Application ownership

- Frontend owns layout, user interaction, form-level feedback and role-shaped display only.
- API owns every authorization check, business rule, state transition, transaction, provider integration and audit write.
- Worker owns long-running steps and retries; it receives database IDs, not document text in job payloads.
- SERV is the bounded reasoning/model layer. The application owns its explicit workflow state machine, contracts and deterministic checks.
- No LLM is authoritative for numeric calculations, approval or spending policy.
- The payment rail is hidden behind a `PaymentProvider` interface. Business logic depends on the interface and the deterministic policy, not the Circle SDK directly.

## Fixed stack

- Web: Next.js 16.x, React, TypeScript, Tailwind CSS 4.x, shadcn/ui/Radix, Lucide, TanStack Query, Zod.
- API: Fastify 5.x, TypeScript, Drizzle ORM, `pg`.
- Data/Auth/Storage: Neon Postgres, Neon Auth, private S3-compatible storage.
- Worker: Postgres jobs table; custom row-locking worker and leases.
- PII: Python 3.12, Microsoft Presidio Analyzer/Anonymizer, custom recognizers, deployed in `REDUCED_PII_MODE` on the Render free tier (small spaCy model; not full `en_core_web_lg`).
- PDF: `pdfjs-dist`, text layer only; scanned PDFs rejected.
- Crypto: Node crypto AES-256-GCM, SHA-256, Ed25519.
- Proof: Circom 2.x + SnarkJS fixed circuit.
- Payments: `@circle-fin/x402-batching` 4.0.0, viem, Arc Testnet (`eip155:5042002`), Circle Gateway testnet facilitator.
- Financial data: SEC EDGAR XBRL (free), Financial Datasets adapter (Base mainnet x402 / API key), LoneStar Oracle adapter (Arc mainnet x402).
- Hosting: Vercel web preview; Render API and Presidio; Neon Postgres/Auth and private S3-compatible storage. Railway is prohibited.
- Tests: Vitest, API integration tests, Playwright E2E, static/dependency/security scans.

## SERV reasoning graph

The application graph contains explicit nodes/contracts:

1. `INTERPRET_COVENANT`: structured extraction facts → `SUPPORTED`, `NEEDS_ANALYST_REVIEW`, or `UNSUPPORTED`.
2. `CLASSIFY_ADDBACKS`: analyst-entered lines and confirmed add-back list → eligible/ineligible/uncertain classification with evidence.
3. `ROUTE_RESULT`: deterministic calculation result + scenario flags → compliant/breach/uncertain routing.

SERV is the orchestration layer: its BRAID graph nodes call either NEAR AI or OpenRouter according to the routing rules below. SERV does not itself perform inference. The graph and outputs are versioned. Each node output passes Zod schema validation and deterministic invariants before the next step. SERV does not mutate the database directly and cannot call arbitrary tools.

Current OpenServ public materials identify `https://inference-api.openserv.ai/v1` as an OpenAI-compatible SERV endpoint. An unauthenticated probe returns HTTP 401. The operator must verify the current model catalog, key permissions, credits and any graph/Shadow Agent/PromptGuard capability in the account before enabling claims about those capabilities.

## Provider routing and privacy boundaries

- **NEAR AI Cloud (Layer 2):** receives only tokenized credit-agreement text and structured financial figures for extraction. Never send token maps, borrower identities or raw documents. Requests must carry fresh Intel TDX/NVIDIA NRAS attestation evidence bound to a client-supplied nonce; fail closed if attestation is missing or invalid.
- **OpenRouter (general):** receives only structured, already-extracted data for SERV judgement and generation nodes. Never send raw documents or tokenized agreement text.
- **SERV:** receives structured, non-identifying inputs and orchestrates the graph; it does not itself perform inference.
- **Reppo:** receives synthetic/de-identified correction records only; the live adapter submits field-level traces after a 50 KB preflight and displays the real provider verdict.
- **Arc / Circle Gateway:** receives payment amounts, recipient, network, asset and x402 metadata. It never receives borrower documents, token maps, raw financial statements or analyst notes. The payer private key stays server-side.
- **SEC EDGAR / financial-data providers:** receive only the public ticker/CIK, requested public period and endpoint parameters. A private borrower is never sent to a public-company data provider as a lookup. Evidence limitations are stored with the data.
- **Token-to-identity maps** never leave backend storage.
- **Dolphin:** removed and rejected; no adapter or endpoint is part of the architecture.

## Jobs

`jobs` rows include job type, IDs-only payload, state, attempt count, lease timestamp, next run time and last safe error code. Worker claims with `FOR UPDATE SKIP LOCKED`. Expired leases can be reclaimed. Retry only idempotent operations. Payment execution is a separate job; a timeout becomes `RECONCILIATION_REQUIRED`, and the worker looks up the original authorization by nonce before any retry. It never blindly pays twice.

## Encryption and audit

Generate one random 32-byte DEK per borrower; wrap it using `DATA_KEK_BASE64` with AES-256-GCM. Encrypt documents, token maps, private audit payloads and external evidence payloads. Unique random 12-byte nonce per encryption. Delete wrapped DEK to demonstrate crypto-shred; do not claim all provider backups are erased.

Audit entries are sequential per borrower. Canonicalize non-sensitive metadata + previous hash + ciphertext/nonce/tag, hash with SHA-256, sign with Ed25519 private key stored only in secret manager. Verification recomputes the chain and verifies signatures. Chain is tamper-evident, not immutable against compromise of DB and signing key together.

## External evidence workflow

1. The bounded evidence planner inspects the structured run and proposes needs. It never authorises spend.
2. Free SEC EDGAR retrieval requires an explicit public-reference confirmation by an analyst.
3. Paid retrieval starts with the provider's actual HTTP 402 terms. The deterministic `PaymentPolicyService` evaluates provider, endpoint, network, asset, recipient, caps, budget, expiry, idempotency and duplicate nonce.
4. A policy rejection is persisted and audited and never reaches the execution service.
5. An analyst authorises an approved quote. The payment session row is locked, budget is reserved, and `payment.execute` is queued transactionally.
6. The worker signs and submits the x402 authorization. `CONFIRMED` requires a verifiable provider receipt; a timeout becomes `RECONCILIATION_REQUIRED`.
7. Reconciliation looks up the original nonce/transfer. It does not create a second payment.
8. Returned data is validated, encrypted under the borrower DEK, content-hashed, linked to the analysis run and audited. Public-company limitations are shown in the UI and API.

## ZK predicate

Private witness: total debt and adjusted EBITDA minor units. Public input: covenant threshold in basis points, circuit version and public outcome semantics. Constraint: `debt * 10000 <= adjustedEbitda * thresholdBps`, with range checks (64-bit debt/EBITDA, bounded threshold) so intermediate products remain safely within the Circom field. The proof proves only that the supplied witness satisfies the inequality; it does not prove source-document authenticity or accuracy of entered figures. Manager sees verified predicate, not private witness.

## Hosting

- Vercel: frontend routes and static assets; preview deployment first.
- Render: Fastify API and a `REDUCED_PII_MODE` Presidio-equivalent service; use free services only. The API worker runs in the same API service to avoid a separate paid worker tier for the MVP; Postgres is the durable queue. Full `en_core_web_lg` Presidio is not deployed on the 512 MB free tier.
- Neon: Postgres and Auth; private S3-compatible storage holds encrypted objects. Free plan only for demo and subject to pause/size limits. Render free Postgres is not used because free DBs expire after 30 days.
- No production release or paid-plan activation without explicit operator authorization.

## Failure handling

Providers are behind adapters. A provider outage changes integration state and analysis state visibly; it must not generate a fake output or trigger an unapproved substitute. Keep manual term entry as an explicit fallback if extraction is unavailable. If SERV is unavailable, do not label the run SERV-complete.
