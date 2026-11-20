# Data Model

PostgreSQL (Neon) is canonical. The latest applied Drizzle migrations are `packages/db/migrations/0000_windy_fat_cobra.sql`, `0001_violet_siren.sql` and `0002_noisy_paibok.sql`; field definitions follow `MASTER_BLUEPRINT.md` §7 with additive multi-tenancy (`organization_id`) and additive operational tables where the workflow needs them.

## Core tables

- `organizations`, `profiles`, `memberships`, `organization_invitations` — workspace, invite-only staff identity, role/status. A role belongs to a membership, so one Auth user can hold different roles in different workspaces.
- `borrowers` — synthetic `display_alias` and `reference_token`; unique per organization after normalization. `created_by` references the staff user ID.
- `borrower_keys` — one wrapped per-borrower data encryption key (AES-256-GCM under `DATA_KEK_BASE64`), key version, status and demo-shred marker.
- `facilities` — facility reference token, label, currency and status; unique `(borrower_id, normalized_reference_token)`.
- `documents` — encrypted object metadata: storage key to ciphertext only, ciphertext SHA-256, keyed plaintext HMAC, page count and processing status. Unique `(borrower_id, facility_id, sha256_ciphertext)`.
- `analysis_runs` — immutable run snapshot and state machine. `run_number` is unique per facility; `document_id` is unique because an agreement belongs to one MVP run. Holds the current state version, terms version, financial-input hash, result/failure code and non-sensitive provider trace (model IDs, request IDs, timing/token counts, attestation metadata; never prompt text).
- `covenant_terms` — one confirmed maximum leverage term per run: threshold basis points, total-debt/EBITDA definitions, permitted add-backs with caps, testing date, source evidence, confidence/uncertainty and review status.
- `financial_inputs` — one sealed analyst-attested snapshot per run (reported EBITDA, total debt, applied add-backs, attested timestamp), plus canonical hash.
- `scenario_results` — baseline, EBITDA-down-10 and debt-up-10 results; each sealed with the borrower DEK and a non-sensitive categorical result/risk band.
- `proof_artifacts` — fixed circuit `leverage-v1`, verification-key hash, private proof object key, public signals, witness commitment, verification status. No witness is stored.
- `approvals` — one manager decision per run; binds manager, decision, risk acknowledgement, rationale, proof artifact and exact analysis version.
- `redaction_revisions` — immutable redaction revision: sealed redacted pages, encrypted token map, non-sensitive entity spans and analyst review metadata.
- `extraction_runs` — provider/model/prompt version, provider request ID, output hash, attestation evidence and token counts. Raw provider output and document text are not persisted here.
- `feedback_records`, `reppo_evaluations` — synthetic correction records and actual Reppo provider status/score/decision/confidence/route/result, credits charged, error code/message, 10/15/30-minute polling cap and last-poll timestamp. No fabricated verdicts.
- `payment_sessions` — operator-defined Arc Testnet session: network, USDC asset, per-payment cap, total budget, spent/reserved totals, expiry, status, version. Row-locked before every authorisation; the agent cannot edit it.
- `payment_intents` — every proposed, policy-rejected, authorised, submitting, confirmed, failed or reconciled payment. Stores provider/endpoint, idempotency key, request fingerprint, quote hash, actual 402 terms, amount/authorized/settled amounts, payer, recipient, network/asset, policy decision, nonce, provider transaction/transfer ID, receipt, failure code and data status. Unique `(organization_id, idempotency_key)` and unique non-null nonce prevent duplicate payment.
- `payment_authorizations` — one explicit policy decision per intent (`APPROVED`/`REJECTED`), actor, policy version/snapshot, authorised amount and expiry. Distinct from the manager approval.
- `external_evidence` — encrypted provider payload, source URL, publisher, reporting period, linked field, retrieval time, content SHA-256, limitations, validation status/errors and optional payment intent. Unique `(analysis_run_id, content_sha256)` prevents duplicate evidence. Sealed under the borrower DEK.
- `audit_events`, `audit_heads` — per-borrower signed hash chain. Sequence and previous hash are row-locked; the event envelope is sealed with the borrower DEK; the Ed25519 signature and chain hash remain verifiable after demo key shred.
- `jobs` — Postgres queue (`QUEUED`, `RUNNING`, `RETRY`, `SUCCEEDED`, `FAILED`, `CANCELLED`), lease fields, retry/dead-letter, IDs-only payloads. Claimed with `FOR UPDATE SKIP LOCKED`. Payment execution and reconciliation use separate job types.
- `idempotency_records` — org/actor/key scoped request hash and resource pointer; unique constraint prevents duplicate creation. Sensitive response bodies are not stored.

## Money

All financial amounts are integer minor units encoded as decimal strings. The covenant threshold is stored as basis points (`35,000 = 3.50x`). The authoritative predicate is:

```text
debt_minor * 10,000 <= adjusted_ebitda_minor * threshold_bps
```

No floating-point arithmetic is authoritative. Scenario amounts are derived by floor(EBITDA × 90 / 100) and ceil(debt × 110 / 100).

## Encryption and access

- Documents, financial snapshots, scenario details, audit payloads, redaction objects and external-evidence payloads are AES-256-GCM sealed under the borrower DEK.
- The DEK is wrapped by the environment KEK and stored in `borrower_keys`.
- A separate HKDF-derived key produces `documents.content_hmac` for duplicate detection without a plaintext hash.
- Manager and auditor serializers exclude raw amounts, named counterparties, agreement text and the token map.
- Demo crypto-shred deletes wrapped key material for synthetic fixtures only; ciphertext remains but is no longer decryptable through the application key store.

## Tenant isolation

Every tenant table carries `organization_id`; every repository query is scoped by the authenticated membership's organization. Client-supplied role, organization, approval result, proof status and financial result are ignored.
