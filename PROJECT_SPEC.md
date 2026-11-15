# Assay — Project Specification

**Status:** Approved blueprint for implementation; synthetic-data MVP only.

## Product

Assay is a privacy-conscious AI-assisted covenant-monitoring workspace for mid-market lenders and credit teams. It extracts and interprets one maximum Debt / Adjusted EBITDA covenant from a credit agreement, lets an analyst confirm the terms and financial inputs, calculates compliance and three scenarios deterministically, generates a fixed-circuit ZK proof for a compliant baseline, and routes the decision to a manager for approval.

## Problem

Covenant reviews combine contract interpretation, manual spreadsheet arithmetic, scenario checks and evidence preparation. Generic LLM output is not enough for a credit workflow because arithmetic, evidence and approval must be controlled and auditable.

## Users

- Credit Analyst — manages borrower/facility, uploads agreements, reviews redaction and terms, enters/attests values, runs analysis.
- Credit Manager — sees a restricted compliance summary and approves/rejects eligible runs.
- Auditor — read-only event/proof/approval evidence.
- Workspace Administrator — provisions staff and monitors system status; no default access to financial content.
- Borrower is a data subject, not a product user in MVP.

## MVP boundaries

### In scope
- Invite-only staff authentication and RBAC.
- Synthetic borrower/facility records.
- PDF/TXT agreement upload, max 10 MiB and 40 pages; text-based PDF only.
- Server-side encrypted private storage.
- Presidio redaction, custom financial-domain recognizers and analyst correction.
- AI extraction of one Debt/Adjusted EBITDA covenant; evidence quotes/page references; Zod validation and analyst confirmation.
- Analyst-entered debt, EBITDA and agreement-permitted add-backs.
- Deterministic baseline and two sensitivity cases.
- One fixed ZK proof circuit for baseline compliance.
- Manager approval gated on proof verification.
- Encrypted hash-chained/signed audit log and demo-only crypto-shred.
- Synthetic-only correction feedback and optional actual Reppo evaluation.
- Optional Kite x402 spend adapter behind explicit authorization.
- Complete docs and <=180-second real demo video.

### Out of scope
- Full underwriting/credit scoring/lending decision.
- Arbitrary covenants, multiple covenant families or automated financial statement extraction.
- Real borrower data or production use.
- Borrower portal, multi-tenant SaaS, SSO, mobile app, OCR/scanned PDF, bulk ingestion.
- Custody, lending, escrow, payouts or payment processing for customers.
- Baseline breach overrides, unsupervised self-improvement, automatic prompt changes.
- Claims of TEE protection, regulatory certification, guaranteed zero retention or DP unless separately implemented and verified.

## Core workflow

1. Analyst signs in.
2. Creates borrower/facility using synthetic identifiers.
3. Uploads text PDF/TXT; API encrypts bytes before private storage.
4. Worker parses and redacts with Presidio/custom recognizers.
5. Analyst reviews redaction and confirms.
6. NEAR AI Cloud's TEE-attested gateway extracts terms from tokenized text only; SERV reasoning orchestrates the graph and routes supported/uncertain/unsupported cases. General judgement/generation calls route to OpenRouter with structured, already-extracted data only.
7. Analyst confirms/corrects terms.
8. Analyst enters debt, EBITDA and permitted add-back amounts, with currency and source references.
9. Deterministic engine calculates baseline leverage/headroom and scenarios.
10. If baseline meets the covenant, fixed circuit proof is generated and verified. If baseline breaches, there is no compliance proof and approval is blocked.
11. Manager sees restricted summary, proof state and scenario risk indicators. Manager approves or rejects. Downside scenario breach requires explicit risk acknowledgement/rationale.
12. Audit chain stores a signed, encrypted event. Auditor verifies chain.
13. Optional synthetic correction is submitted to Reppo; optional Kite external-data purchase is allowed only within a passkey-authorized session and operator-approved spend cap.

## Normative calculation rules

Use same currency and integer minor units. Let `D` = total debt, `E` = adjusted EBITDA, `T` = threshold basis points (`4.00x = 40000`).

`E = reported EBITDA + sum(eligible add-backs)`

`compliant = D * 10000 <= E * T`

`ratio = D / E`

`headroom = T / 10000 - ratio`

`headroom_pct = headroom / (T / 10000) * 100`

Never round before the compliance comparison. EBITDA downside uses floor(`E*90/100`); debt upside uses ceil(`D*110/100`). `E <= 0`, negative debt, currency mismatch or overflow blocks calculation.

## State machine

`DRAFT → FILE_UPLOADED → PARSING → REDACTION_REVIEW → REDACTION_CONFIRMED → EXTRACTION_PENDING → TERMS_REVIEW → TERMS_CONFIRMED → FINANCIALS_PENDING → FINANCIALS_CONFIRMED → CALCULATION_PENDING → CALCULATED`.

After calculation: baseline breach → `BREACH_REVIEW`; baseline compliant → `PROOF_PENDING → PROOF_VERIFIED → READY_FOR_MANAGER → APPROVED | REJECTED`. Proof failure → `PROOF_FAILED`; any processing failure → `FAILED`. A corrected run creates a new immutable analysis snapshot.

## Acceptance criteria

- A user cannot access data outside their role, even by direct API request or guessed UUID.
- A document is stored as ciphertext in a private bucket; no raw bytes, PII, token map or full prompt appears in logs.
- No model call occurs before redaction is confirmed.
- No raw token map is sent to any inference provider.
- Extraction must include valid evidence quote/page reference and be analyst-confirmed.
- Every calculation is reproducible from immutable financial inputs and versioned terms.
- ZK proof verifies independently and is bound to the exact analysis input hash/version/circuit.
- Manager approval cannot occur for breach, unknown, stale or unverified proof.
- Concurrent approvals cannot create two decisions.
- Audit tampering is detected; demo key shred removes decryptability while chain verification remains possible.
- External integrations show real/disabled/fixture state honestly.
- All primary analyst/manager E2E journeys pass on preview before final UI refinement.
- README/docs and demo video are completed and verified.

## Product language

Use “AI-assisted covenant analysis”, “deterministic covenant calculation”, “proof of the defined compliance predicate” and “tamper-evident audit trail”. Avoid “automated credit decision”, “cryptographically proves the financials are true”, “GDPR compliant”, “TEE protected” and “differential privacy” unless the exact corresponding guarantee is implemented and evidenced.
