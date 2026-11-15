# Assay — Complete Implementation-Ready Project Blueprint

**Project:** Assay  
**Purpose:** Authoritative product, architecture, requirements, security, UX and implementation specification for the coding agent.  
**Status:** Pre-implementation blueprint; no application code has been created by this package.  
**Prepared:** 15 November 2026  
**Target repository:** `https://github.com/onyebuchidaniel60/Assay` (operator will clear existing contents before implementation)  
**Operating model:** Operator and product owner settle product/architecture decisions; coding agent executes the approved plan autonomously.

## Decision and source hierarchy

1. This blueprint is the source of truth for product and technical decisions.
2. `AGENTS.md` contains persistent execution rules.
3. `OPERATOR_INTAKE.md` contains missing access, reference assets, credentials and bounded authorizations. It must be completed before repository changes.
4. `AI_HANDOFF.md` and `docs/BUILD_LOG.md` record the implementation state and verification evidence.
5. The Assay handoff supplied by the operator establishes product intent. The uploaded `PROPER_VIBE_CODING_WORKFLOW_AUTONOMOUS.md` establishes the execution methodology.
6. If a provider's current documentation conflicts with an assumption in the old handoff, do not silently use the old assumption. Record the conflict and keep that integration disabled until verified.

**Fresh-start rule:** The operator intends to remove the previous repository contents. The agent must not copy or depend on the old blueprint package, code or configuration. It may inspect Git metadata and repository access, but implementation starts from the clean state after intake.

## Authoritative provider override — 15 November 2026

This section supersedes every conflicting provider statement later in this historical blueprint.

- **Dolphin is removed and rejected.** Its confidentiality mechanism is unverified: no TEE, no MPC and unverified zero-retention claims. No adapter, endpoint, model, key or privacy flag will be implemented. Historical Dolphin references below are retained only as historical context and must not be built.
- **Layer 2 confidential inference is NEAR AI Cloud.** Base URL `https://cloud-api.near.ai/v1`; bearer auth via `NEARAI_API_KEY`. Use Intel TDX attestation and NVIDIA NRAS evidence with a client-supplied nonce. Select only models whose catalog metadata reports `verifiable: true` and `attestationSupported: true`. Send only tokenized credit-agreement text and structured financial figures; never token maps, borrower identities or raw documents.
- **General inference is OpenRouter.** Base URL `https://openrouter.ai/api/v1`; bearer auth via `OPENROUTER_API_KEY`; configurable models `OPENROUTER_MODEL_JUDGEMENT` and `OPENROUTER_MODEL_GENERATION`. Only structured, already-extracted data may be sent.
- **SERV is orchestration, not inference.** Its BRAID graph nodes call NEAR AI or OpenRouter under the routing rules; do not claim Shadow Agent, PromptGuard or graph-versioning execution without account/runtime evidence.
- **Layer 2 wording:** allowed — “Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request can be verified against Intel TDX and NVIDIA NRAS attestation evidence.” Prohibited — “zero retention guaranteed”, “TEE protected” without attestation evidence, and “cryptographically proves the data was never logged”.
- **Presidio deployment:** Render's free 512 MB service uses `REDUCED_PII_MODE` — Presidio Analyzer with the small spaCy model plus deterministic custom financial recognizers. Full `en_core_web_lg` is not deployed on the free tier; no paid upgrade is authorized.
- **Environment variables:** do not add `DOLPHIN_BASE_URL`, `DOLPHIN_API_KEY`, `DOLPHIN_MODEL` or `DOLPHIN_PRIVACY_TERMS_VERIFIED` to `.env.example`, config schemas or deployment settings. Use the NEAR AI, OpenRouter and SERV variables defined in the Phase 0 intake and configuration docs.

The rest of this document is the historical blueprint. Where it names Dolphin or an older provider, this override governs.

---

# 1. Product definition

## 1.1 Product identity

**Name:** Assay  
**One-line description:** Assay is a privacy-conscious AI-assisted covenant-monitoring workspace that extracts one financial covenant from a credit agreement, calculates compliance deterministically, tests defined downside scenarios, and routes the result through verifiable human approval.

**Positioning:** Credit covenant analysis and monitoring for mid-market lenders and credit teams. Assay is not a general-purpose underwriting engine and does not make lending decisions.

**Core promise:** Turn a manual covenant review into a fast, reviewable workflow with validated calculations, a proof-backed compliance result, human sign-off and a tamper-evident audit record.

Do not use the unsubstantiated marketing claim “3-hour review to 3-minute review” as a measured performance guarantee. It may be used as a clearly labelled aspiration or demo framing only after timing has been measured on a representative task.

## 1.2 Problem

Credit analysts manually interpret covenant clauses, identify permitted EBITDA add-backs, combine figures from borrower reporting, calculate leverage, run sensitivity cases and prepare evidence for manager review. The process can be slow and inconsistent. A conventional chatbot does not solve the institutional control problem: its output may be difficult to reproduce, its arithmetic may be wrong, and its reasoning or data handling may be hard to audit.

## 1.3 Current alternatives and workarounds

- Manual spreadsheet calculations and covenant trackers.
- Document-management systems used as repositories rather than reasoning systems.
- Analyst-built templates and checklists.
- Generic document-extraction / LLM tools that do not provide the complete review and approval workflow.
- Existing loan servicing or portfolio-management platforms; these remain system-of-record candidates and are not replaced by the MVP.

## 1.4 Target users

Initial target: a small-to-mid-sized lender, private-credit team or credit fund monitoring contractual financial covenants. The initial buyer is a Head of Credit, Credit Operations lead or risk/compliance lead. The day-to-day user is a credit analyst.

## 1.5 Roles

- **Credit Analyst:** creates borrower/facility records, uploads agreements, reviews redaction, reviews extracted covenant terms, enters financial values, runs analyses and corrects extraction errors.
- **Credit Manager:** views a restricted compliance summary, reviews exceptions and approves or rejects an eligible analysis. The manager does not receive raw borrower identity or financial figures in the manager view.
- **Auditor / Compliance Reviewer:** read-only access to event chronology, hashes, proof verification, decision metadata and approval evidence. No raw document or financial values by default.
- **Workspace Administrator:** provisions and disables staff accounts, assigns roles and inspects integration health. Admin privilege does not automatically grant access to borrower financial content.
- **Borrower:** a data subject, not an authenticated product user in the MVP. No borrower portal.

## 1.6 Core value proposition and differentiator

Assay combines bounded AI-assisted interpretation with deterministic covenant calculations, private-data controls, a zero-knowledge proof of the compliance predicate, a tamper-evident encrypted audit trail and a human approval checkpoint. The LLM is not the calculator and cannot approve credit decisions.

## 1.7 Primary use case

A credit analyst uploads a synthetic credit agreement, confirms Presidio redactions, reviews the extracted Debt/Adjusted EBITDA terms and threshold, enters synthetic financial figures, runs the calculation and stress scenarios, and submits the compliant baseline result for manager review. The manager sees a proof-backed status and risk flags without seeing the exact financial values, then approves or rejects. The system records every material event.

## 1.8 Secondary use cases

- Re-run an analysis when a new reporting period is received.
- Compare baseline leverage with a defined EBITDA-downside and debt-upside scenario.
- Give an auditor a tamper-evident review record.
- Capture analyst corrections and submit a synthetic/redacted evaluation trace to Reppo.
- Demonstrate Kite Passport's separately bounded authorization for an external data-service payment, when credentials and testnet-spend authority are supplied.

## 1.9 Explicit product boundaries / non-goals

Assay MVP does **not**:

- Perform full borrower underwriting, credit scoring, loan origination or lending recommendations.
- Support arbitrary covenant families. It supports one covenant: maximum Debt / Adjusted EBITDA leverage.
- Extract financial statement amounts autonomously from arbitrary borrower reports. Analysts enter and attest the financial inputs; AI interprets the contractual definitions.
- Replace the lender's official servicing, accounting, loan-management or document-management system.
- Accept production borrower information. MVP records and examples are synthetic only.
- Provide multi-tenant enterprise isolation, SSO, SOC 2, regulatory certification or a production compliance guarantee.
- Provide a borrower portal, mobile application, arbitrary spreadsheet ingestion, OCR of scanned PDFs, or bulk portfolio import.
- Custody customer funds, pay borrowers, issue credit, transfer funds, or process loan payments.
- Let an LLM approve, amend or waive a covenant.
- Claim TEE-grade protection, absolute non-retention, GDPR compliance or mathematically formal differential privacy unless each guarantee has been independently implemented and verified.

---

# 2. MVP scope

## MUST HAVE

1. Invite-only sign-in and the four roles above, with server-side role checks.
2. Borrower and facility creation using synthetic demo identities.
3. Upload one text-based PDF or TXT credit agreement per analysis run; strict size/page/type limits.
4. Server-side encrypted file storage in a private bucket.
5. Text extraction and Presidio-based detection/tokenization, including custom recognizers for loan references, account-like strings and borrower identifiers.
6. Analyst redaction-review screen. The original document may be viewed only by an authorized analyst; only tokenized text may be sent to an inference provider.
7. NEAR AI Cloud extraction adapter using only TEE-verifiable models with fresh Intel TDX/NVIDIA NRAS attestation, activated only after key, credit and model validation. Extract one Debt/Adjusted EBITDA covenant, cap, comparator, definitions, permitted add-backs, testing date and supporting page/quote evidence.
8. Schema validation and human correction/confirmation of the extracted covenant terms.
9. Manual entry and confirmation of total debt, reported EBITDA and allowed add-back line items.
10. Deterministic calculation using integer minor units / decimal-safe arithmetic. AI must not calculate the authoritative ratio.
11. Three deterministic scenarios: baseline; adjusted EBITDA reduced by 10%; total debt increased by 10%.
12. One fixed Circom/SnarkJS proof circuit for the baseline covenant predicate. Approval is blocked unless proof verification succeeds.
13. Credit-manager review, approval/rejection and immutable approval event. Approval is separate from Kite Passport spending authorization.
14. Per-borrower envelope encryption and a hash-chained, signed audit record. A demo-only crypto-shred action demonstrates key deletion and chain verification after deletion.
15. A privacy-bounded feedback record. Reppo evaluation is real when credentials are available; only synthetic data and de-identified traces may be submitted.
16. Complete navigable UI, all critical states, responsive behavior, accessibility basics and working navigation.
17. Automated unit, integration, E2E and security checks for the primary workflow.
18. Useful README and complete operator/developer docs.
19. A real recorded and edited demo video, maximum 180 seconds, target 90–150 seconds, with synchronized narration and a reviewed final render.

## SHOULD HAVE

- Kite Passport / x402 testnet adapter for one external benchmark or evidence API, with deterministic policy enforcement and a strict testnet spend cap supplied by the operator.
- Reppo Evaluation API submit/poll flow, result persisted with score, verdict, confidence, critiques and routing suggestion.
- Exportable analysis report (PDF or print stylesheet) containing only role-appropriate information.
- Demo fixtures and reset script for repeatable browser recording.

## NICE TO HAVE

- Optional PDF page thumbnails and clause highlighting.
- A manager-friendly audit timeline with verification detail.
- Downloadable auditor evidence bundle with encrypted payloads omitted.
- More than one sample borrower/facility in the seeded workspace.

## FUTURE

- Additional covenant types and agreement templates.
- Multi-tenant organization model, production key-management service/HSM, KMS-backed envelope encryption, customer-managed keys.
- Full DP-SGD feedback pipeline with documented epsilon/delta accounting and reviewed implementation.
- Real external credit benchmark provider catalogue, controlled integrations and commercial usage metering.
- Enterprise identity, SSO, retention controls, legal hold, disaster recovery and compliance certification.
- Integration with loan servicing, ERP and accounting systems.

## OUT OF SCOPE

- Unverified or fake integrations; hardcoded pretend payments; fabricated Reppo verdicts; fabricated proof verification; silent AI fallback; real borrower data; public signup; production deployment without explicit authorization; live financial transfers; uncontrolled service spending.

**Scope rule:** If an optional partner integration is unavailable, complete the core covenant workflow. An unavailable partner must not block unaffected features, and the UI must label the integration unavailable rather than simulate success.

---

# 3. User roles and permission matrix

| Capability | Analyst | Manager | Auditor | Admin |
|---|---:|---:|---:|---:|
| Create/edit borrower and facility | Yes | Read | Read metadata | Yes (metadata only) |
| Upload/view original agreement | Yes | No | No | No by default |
| View raw financial amounts | Yes | No | No | No by default |
| Review/correct redaction | Yes | No | No | No |
| Review/correct covenant extraction | Yes | Read summary | Read evidence metadata | No |
| Enter/confirm financial inputs | Yes | No | No | No |
| Run/re-run analysis | Yes | No | No | No |
| View full calculation details | Yes | Restricted result only | No | No |
| View compliance proof status | Yes | Yes | Yes | Metadata only |
| Approve/reject eligible analysis | No | Yes | No | No |
| View audit chronology and hashes | Yes | Yes | Yes | Yes (administrative events) |
| Verify audit chain | Yes | Yes | Yes | Yes |
| Crypto-shred | Demo-only Admin, explicit confirmation | No | No | Demo-only, explicit confirmation |
| Manage users/roles | No | No | No | Yes |
| Configure provider secrets | No | No | No | Via deployment secret store only, not UI |

The manager view uses a deliberately minimal output: borrower pseudonym/reference, facility reference token, agreement version, covenant threshold, proof status, baseline compliance status, scenario pass/fail bands, analysis timestamp, analyst attestation and approval actions. It does not show raw debt, EBITDA, named counterparties, full agreement text or the token map.

---

# 4. Complete user flows

## 4.1 Sign-in and access

**Entry:** `/login`.  
**Preconditions:** user has been created/invited in Supabase Auth and a matching Assay profile has an active role.  
**Action:** user signs in using email/password or the configured Supabase Auth method.  
**System:** Supabase validates credentials and creates a session; frontend obtains an access token; API validates JWT signature, issuer, audience and expiry, then loads active profile/role.  
**State:** login event is recorded without credentials or tokens.  
**Success:** user lands on role-appropriate dashboard.  
**Failure:** invalid credentials show a generic message; inactive user receives access denied; expired token returns 401 and triggers re-auth.  
**Permissions:** no public registration; only Admin provisions accounts.  
**Edge cases:** auth user exists without profile → deny and log configuration error; role disabled during active session → next API call denies; token replay after expiry → 401.

```text
User -> Login UI -> Supabase Auth -> Access token
  -> Assay API JWT verification -> active profile + role
  -> role-specific dashboard
```

## 4.2 Create borrower and facility

**Entry:** Borrowers → New borrower.  
**Preconditions:** authenticated Analyst or Admin; synthetic data only.  
**Action:** enter borrower display alias, internal reference token, facility label/reference, currency and status.  
**System:** validate required strings/currency; reject duplicate external reference within workspace; insert borrower and facility in one transaction; create audit event.  
**Success:** facility detail screen with no analysis yet.  
**Failure:** duplicate returns 409; invalid currency/format returns field-level 422; DB failure rolls back both records.  
**Edge cases:** repeated submit with same idempotency key returns original resource; conflicting key payload returns 409.

## 4.3 Upload agreement and protect it

**Entry:** Facility → New analysis → Upload agreement.  
**Preconditions:** Analyst; facility active; maximum one agreement file per analysis run.  
**Action:** upload PDF or TXT.  
**Validation:** max 10 MiB; PDF or UTF-8 text only; verify magic bytes; reject encrypted/password-protected PDFs, image-only/scanned PDFs, zero-text documents, more than 40 pages and unsupported MIME.  
**System:** stream to API; compute SHA-256; generate/obtain per-borrower data encryption key; encrypt file with AES-256-GCM; upload ciphertext to private Supabase Storage; save metadata; enqueue parse/redaction job. Raw bytes are not written to local disk or logs.  
**Success:** document status `PROCESSING`, then `REDACTION_REVIEW`.  
**Failure:** invalid file → 422; duplicate checksum → 409 with existing document link; storage failure → rollback metadata and return 503; worker failure → document `FAILED` with safe error code and retry option.  
**Permissions:** Analyst may upload and preview; other roles cannot retrieve original bytes.

## 4.4 Redaction review

**Entry:** analysis redaction review.  
**Preconditions:** parsing complete.  
**Action:** Analyst reviews identified entities/spans and confirms or edits false positives/missed identifiers.  
**System:** Presidio Analyzer returns spans and types; custom recognizers identify domain references; tokenization produces stable run-scoped placeholders; token-to-value map is encrypted using borrower DEK; redacted text is stored separately; original document remains encrypted.  
**Validation:** spans must be in bounds, non-overlapping after normalization, and replacements must not change the financial values needed for covenant interpretation.  
**Success:** analyst confirms; `redaction_status=CONFIRMED`; extraction job can start.  
**Failure:** low-confidence/unresolved spans block inference; Presidio unavailable → pause at `REDACTION_REVIEW`, no model call.  
**Edge cases:** repeated entity maps to same token within a run; distinct account numbers get distinct tokens; analyst correction creates a new immutable redaction revision.

## 4.5 Covenant extraction and review

**Entry:** confirmed redaction page.  
**Preconditions:** partner provider passes connectivity and policy check; redacted payload only; run still editable.  
**Action:** Analyst starts extraction.  
**System:** application graph invokes the NEAR AI adapter to extract only the supported Debt/Adjusted EBITDA covenant. Prompt explicitly labels document content untrusted and forbids following embedded instructions. The result is parsed and Zod-validated; supporting quotes and page numbers are retained; confidence is a routing signal, not proof of correctness.  
**SERV role:** SERV Reasoning executes the bounded reasoning step that interprets structured extracted clause facts and chooses between the defined covenant branches: supported/clear, analyst review required, or unsupported covenant. It does not write the DB or decide approval.  
**Validation:** threshold must be positive and within configured bounds; comparator must be `<=` for MVP; currency definitions must be coherent; required evidence quotes/page references must exist; one covenant only.  
**Success:** Analyst reviews extracted fields, corrects any errors and confirms a versioned term snapshot.  
**Failure:** invalid JSON gets one constrained repair attempt; second invalid result → manual review; unsupported covenant → `UNSUPPORTED_COVENANT`; provider failure → retry once for transient 429/5xx, then safe failure state.  
**Permissions:** Analyst only edits; Manager can read restricted summary.

## 4.6 Enter financial inputs

**Entry:** Financial inputs tab after terms confirmed.  
**Preconditions:** confirmed covenant terms.  
**Action:** Analyst enters total debt, reported EBITDA, and line-item add-backs with amount, description and source reference.  
**System:** validate numeric minor-unit amounts, common currency, nonnegative debt, positive EBITDA, no duplicate line IDs, and only add-backs permitted by the confirmed term version. Record analyst attestation and timestamp.  
**Success:** `FINANCIALS_CONFIRMED`.  
**Failure:** missing/negative/overflowing values → 422; non-permitted add-back → block until removed or reclassified; zero/negative adjusted EBITDA → analysis cannot calculate and requires correction.  
**Edge case:** changed covenant terms invalidate previously entered add-back selections and require reconfirmation.

## 4.7 Calculate and run scenarios

**Entry:** Calculate analysis.  
**Preconditions:** terms and financial inputs confirmed; analysis revision immutable.  
**System:** deterministic domain service calculates adjusted EBITDA, total debt, leverage ratio, headroom and baseline result using integer-safe arithmetic. It runs: baseline; adjusted EBITDA × 90% (floor, conservative); total debt × 110% (ceiling, conservative). It does not use an LLM for arithmetic.  
**SERV role:** SERV Reasoning receives structured, non-identifying calculation facts and routes the case to compliant, breach or uncertainty review. The deterministic calculation remains authoritative; any mismatch causes `VALIDATION_FAILED`.  
**Success:** results and reasoning graph trace stored; result enters proof generation if baseline compliant, otherwise `BREACH_REVIEW`.  
**Failure:** arithmetic invariant mismatch → fail closed; SERV unavailable → calculation may be preserved as `CALCULATED_SERV_PENDING`, but cannot be represented as complete SERV-orchestrated analysis until SERV validation succeeds; duplicate request returns existing result.

## 4.8 Generate and verify ZK proof

**Entry:** proof step for compliant baseline.  
**Preconditions:** calculation valid and baseline ratio meets the fixed covenant comparator.  
**System:** generate Groth16 proof with private witness (debt and adjusted EBITDA) and public threshold/circuit version. Verify locally before storing. A proof does not prove the source figures are accurate; it proves only that the submitted private witness satisfies the circuit predicate.  
**Success:** proof artifact and verification result persisted; `PROOF_VERIFIED`.  
**Failure:** proof generation/verification failure → `PROOF_FAILED`; approval blocked. A breach case receives no compliance proof and is not mislabeled as proof failure.

## 4.9 Manager approval

**Entry:** Manager queue.  
**Preconditions:** role Manager; baseline compliant; proof verified; no unresolved review flags; run not stale; manager view contains only allowed data.  
**Action:** Manager chooses Approve or Reject. If either downside scenario breaches, Approve requires an explicit risk acknowledgement and rationale.  
**System:** transaction locks analysis run; checks status/version/proof again; inserts approval record; transitions state; appends signed audit event.  
**Success:** `APPROVED` or `REJECTED`; analysis snapshot becomes immutable.  
**Failure:** proof no longer valid, status stale, duplicate approval or concurrent manager action → 409; unauthorized role → 403.  
**Edge cases:** new revision after approval creates a new analysis run and never overwrites old approval.

## 4.10 Audit review and crypto-shred demonstration

**Entry:** Audit tab.  
**Preconditions:** Auditor/Manager/Analyst; Admin for demo shred.  
**Action:** verify chain or inspect events.  
**System:** recompute event hashes/signatures in sequence; report first invalid index. Shred is available only in `APP_ENV=demo` and behind `ENABLE_DEMO_SHRED=true`, requires Admin, a typed confirmation and a synthetic fixture borrower. It deletes the wrapped borrower DEK and records a non-sensitive shred marker outside the destroyed key domain.  
**Success:** chain verification passes before and after shred; ciphertext remains but is no longer decryptable through the application key store.  
**Failure:** key missing or already shredded → idempotent status; chain mismatch → security incident state; any non-demo request → 403.  
**Important:** crypto-shredding is a demo retention mechanism, not a blanket legal-erasure certification.

## 4.11 Feedback and Reppo evaluation

**Entry:** analysis completed or analyst correction saved.  
**Preconditions:** synthetic fixture data; no real borrower text or identity.  
**Action:** analyst submits structured correction.  
**System:** store before/after structured fields and correction category; generate a synthetic/de-identified evaluation trace; optionally submit to Reppo and poll for verdict. Human review is required before changing prompts, schemas or model configuration.  
**Success:** evaluation displayed with real provider status, score, confidence, decision, critiques and timestamp.  
**Failure:** no API key → disabled/labelled; API timeout → pending/retry; provider rejection → failed with code. Never insert fake verdicts.

## 4.12 Kite external data/payment flow (optional partner feature)

**Entry:** analyst requests an approved external benchmark.  
**Preconditions:** Kite Passport account and active operator-approved session; supported catalog service; explicit testnet spending authority in intake; allowed asset and endpoint.  
**System:** discover the approved service; calculate quote; deterministic policy engine checks session ID, total remaining budget, per-payment cap, currency/asset, expiry and allowlisted service. User must initiate the request; no autonomous payment at first load. Execute x402 through verified Kite integration; persist provider receipt and remaining budget.  
**Failure:** no active session, amount exceeds cap, unsupported asset, expired session, duplicate idempotency key, provider failure → deny; never ask the LLM to decide whether the payment is allowed.  
**Boundary:** Kite payment authorization does not approve the credit analysis. If no Kite account/API access or testnet spend authority is supplied, omit the live payment path and label the integration unavailable; core analysis remains functional.

---

# 5. Functional requirements and acceptance criteria

| ID | Feature | Actor | Acceptance criteria |
|---|---|---|---|
| FR-01 | Authentication and role access | All staff | Unauthenticated request returns 401; inactive profile denied; each role cannot call a forbidden endpoint; public signup absent. |
| FR-02 | Borrower/facility CRUD | Analyst/Admin | Valid record created once; duplicate reference rejected; insert and audit event atomic; list/detail scoped to workspace. |
| FR-03 | Secure document ingestion | Analyst | Only PDF/TXT; >10 MiB, >40 pages, encrypted, scanned/no-text or wrong magic bytes rejected; object stored privately as ciphertext; no plaintext temp file or log. |
| FR-04 | Redaction/tokenization | Analyst | Custom recognizers tested; no raw recognized identifiers appear in outbound model payload; human can correct; map encrypted; unresolved high-risk span blocks inference. |
| FR-05 | Covenant extraction | Analyst | Returns schema-valid one-covenant object with source quotes/page refs; invalid output repaired once; unsupported covenant never silently accepted; analyst confirmation required. |
| FR-06 | SERV reasoning gate | System | At least one explicit bounded graph node uses SERV; node input/output contracts validated; trace and provider/model identifiers logged; provider absence blocks `SERV_COMPLETE` status. |
| FR-07 | Financial inputs | Analyst | Values are currency-consistent integer minor units; add-backs matched to permitted definitions; positive adjusted EBITDA required; analyst attestation recorded. |
| FR-08 | Deterministic calculation | System | Ratio, headroom and breach use integer-safe computation; test fixtures match independent reference calculations; no LLM-sourced numeric answer used as authority. |
| FR-09 | Scenario analysis | System | Three scenarios generated reproducibly; EBITDA downside rounds down; debt upside rounds up; stress breach separated from actual baseline breach. |
| FR-10 | ZK proof | System/Manager | Fixed circuit compiles; valid witness creates proof; invalid witness fails; changed public threshold invalidates proof; proof verification required before approval. |
| FR-11 | Manager approval | Manager | Non-manager gets 403; unverified/breached/stale run cannot be approved; duplicate/concurrent approval yields one authoritative result; risk acknowledgement required on stressed breach. |
| FR-12 | Audit chain | System/Auditor | Every material state transition records actor, timestamp, event type, prev hash, cipher payload hash and signature; altered ciphertext or metadata is detected; chain still verifies after demo key shred. |
| FR-13 | Reppo feedback | Analyst | Only synthetic/de-identified content submitted; real response is stored; no score invented on failure; configuration changes require manager/admin approval. |
| FR-14 | Kite policy and x402 (conditional) | Analyst/Agent | Policy engine rejects expired/over-cap/unapproved requests before provider call; retries cannot double-pay; receipts and idempotency IDs persist. |
| FR-15 | Complete frontend | All roles | Routes, controls, responsive layouts, focus states, loading/empty/error/denied/not-found/success states, metadata and verified links present; no inert controls. |
| FR-16 | Documentation and demo | Operator/Judges | README and docs cover user and developer needs; final rendered demo <=180 seconds, audio/video reviewed and narration matches visible actions. |

## Extraction schema (normative)

```ts
const CovenantTermsSchema = z.object({
  covenantType: z.literal("DEBT_TO_ADJUSTED_EBITDA"),
  comparator: z.literal("LTE"),
  thresholdBps: z.number().int().min(1).max(100_000),
  currency: z.string().length(3).optional(),
  totalDebtDefinition: z.string().min(1),
  ebitdaDefinition: z.string().min(1),
  permittedAddbacks: z.array(z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    conditions: z.array(z.string()),
    capMinor: z.string().regex(/^\\d+$/).nullable(),
  })),
  testingDate: z.string().date().nullable(),
  cureRightsSummary: z.string().nullable(),
  evidence: z.array(z.object({
    page: z.number().int().positive(),
    quote: z.string().min(1).max(500),
    field: z.string().min(1),
  })).min(1),
  confidence: z.number().min(0).max(1),
  uncertaintyNotes: z.array(z.string()),
});
```

The LLM returns JSON matching the schema. The schema is only structural validation; analyst confirmation is still required. Confidence does not replace evidence or human review.

---

# 6. Business logic and state machines

## 6.1 Analysis state machine

```text
DRAFT
  -> FILE_UPLOADED
  -> PARSING
  -> REDACTION_REVIEW
  -> REDACTION_CONFIRMED
  -> EXTRACTION_PENDING
  -> TERMS_REVIEW
  -> TERMS_CONFIRMED
  -> FINANCIALS_PENDING
  -> FINANCIALS_CONFIRMED
  -> CALCULATION_PENDING
  -> CALCULATED
      -> BREACH_REVIEW (baseline breach; no proof; no approval)
      -> PROOF_PENDING (baseline compliant)
          -> PROOF_VERIFIED
          -> PROOF_FAILED (no approval)
              -> READY_FOR_MANAGER
                  -> APPROVED
                  -> REJECTED
                  -> RETURNED_FOR_CORRECTION (creates a new run/revision)

Any nonterminal processing state -> FAILED (retry only when safe)
Eligible pre-approval state -> CANCELLED (worker checks cancellation between steps)
```

`BREACH_REVIEW`, `PROOF_FAILED`, `APPROVED`, `REJECTED`, `FAILED` and `CANCELLED` are terminal for that analysis snapshot. Corrections produce a new run; they do not mutate a signed result.

## 6.2 Core arithmetic

All financial amounts are stored as integer minor units in one currency. Avoid JavaScript floating-point arithmetic for the authoritative decision; use `bigint` or an established decimal library, with persisted values as decimal strings where JSON cannot represent BigInt.

Let:
- `D` = total debt in minor units.
- `E` = reported EBITDA plus eligible permitted add-backs, in minor units.
- `T` = covenant threshold in basis points, where `4.00x = 40,000`.

`Adjusted EBITDA = reported EBITDA + sum(eligible add-backs)`.

`Leverage ratio = D / E` for display only.  
The exact compliance predicate is `D * 10,000 <= E * T`.  
`Headroom multiple = T / 10,000 - D / E`.  
`Headroom % = (threshold - ratio) / threshold * 100`.

If `E <= 0`, `D < 0`, currencies differ or arithmetic exceeds configured 64-bit input bounds, the calculation fails closed. No rounding occurs before the compliance comparison. Formatting is rounded only for presentation.

Scenario rules:
- **Baseline:** unchanged `D` and `E`.
- **EBITDA downside:** `E_stress = floor(E * 90 / 100)`.
- **Debt upside:** `D_stress = ceil(D * 110 / 100)`.

Scenario results are sensitivity tests, not additional contractual test results. A downside scenario breach is a risk flag; it is not relabelled as an actual baseline covenant breach.

## 6.3 Add-back logic

Only add-backs present in the analyst-confirmed agreement terms are eligible. Each input line must reference a permitted add-back code. Any documented cap is applied deterministically. Unmatched or ambiguous lines are excluded until an Analyst resolves them. The model cannot create new allowable categories during calculation.

## 6.4 Approval logic

- Approval requires baseline compliant status and a verified proof for the exact analysis version.
- `proof.analysis_run_id`, `proof.terms_version`, `proof.financial_inputs_hash`, and `proof.circuit_version` must match current immutable snapshot.
- If any downside scenario breaches, Manager must acknowledge risk and provide a non-empty rationale.
- There is no override for baseline breach in MVP.
- Any change to terms or financial figures creates a new analysis run and invalidates the ability to approve the prior run if it is still pending.
- Manager approval is an application authorization event. It is not a Kite Passport event.

## 6.5 Duplicate, expiration and cancellation rules

- All mutating endpoints accept `Idempotency-Key` where retry could create duplicate state or spend.
- Agreement checksum duplicates within the same borrower/facility are rejected with 409 unless operator deliberately starts a new run with an existing document.
- A run not touched for 30 days in demo may be archived by a scheduled cleanup. Do not auto-shred without operator-authorized demo policy.
- Kite session validity is authoritative at execution time, not cached at UI load.
- Provider retry: one retry for network/429/5xx using bounded exponential delay; never retry a payment without idempotency/receipt reconciliation.
- Analysis cancellation is allowed before manager decision; proof generation and provider calls may finish in flight but their result is discarded if cancellation wins the state lock.

---

# 7. Data model

PostgreSQL is the canonical application store. Use UUID primary keys, `timestamptz` in UTC, `numeric` or integer minor units for money, `jsonb` only for bounded evidence/configuration payloads, and explicit status enums/check constraints.

## 7.1 Entities

### `profiles`
- `id uuid PK` references Supabase `auth.users.id`.
- `email text NOT NULL` (normalized; not used as a public identifier).
- `display_name text NOT NULL`.
- `role enum('ANALYST','MANAGER','AUDITOR','ADMIN') NOT NULL`.
- `status enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE'`.
- `created_at`, `updated_at`, `last_login_at timestamptz`.
- Unique normalized email; index `(role,status)`.

### `borrowers`
- `id uuid PK`; `display_alias text NOT NULL`; `reference_token text NOT NULL UNIQUE`.
- `status enum('ACTIVE','ARCHIVED') DEFAULT 'ACTIVE'`.
- `created_by uuid FK profiles`; `created_at`, `updated_at`.
- Store synthetic identifiers only. Avoid real names in MVP.

### `facilities`
- `id uuid PK`; `borrower_id uuid FK borrowers NOT NULL`.
- `facility_reference_token text NOT NULL`; `label text NOT NULL`.
- `currency char(3) NOT NULL`; `status enum('ACTIVE','CLOSED')`.
- `created_by`, `created_at`, `updated_at`.
- Unique `(borrower_id, facility_reference_token)`; index `(borrower_id,status)`.

### `documents`
- `id uuid PK`; `borrower_id`, `facility_id` FKs; `uploaded_by` FK profiles.
- `original_filename text` (sanitize; never include sensitive content); `mime_type`; `size_bytes bigint`; `page_count int`.
- `storage_key text NOT NULL` points to ciphertext only; `sha256_ciphertext`, `content_hmac` (keyed HMAC of plaintext content; do not store an unkeyed plaintext hash that could enable document-guessing attacks).
- `status enum('UPLOADED','PROCESSING','REDACTION_REVIEW','READY','FAILED','SHREDDED')`.
- `created_at`, `updated_at`; unique `(borrower_id,facility_id,sha256_ciphertext)`.

### `analysis_runs`
- `id uuid PK`; `borrower_id`, `facility_id`, `document_id` FKs.
- `run_number int NOT NULL`; `status` using state machine; `created_by` FK profiles.
- `serv_trace_id text nullable`; `provider_trace jsonb` contains request IDs/model IDs/timing/token counts but no prompt text.
- `terms_version int`; `financial_inputs_hash text`; `result_code enum('COMPLIANT','BREACH','UNKNOWN') nullable`.
- `failure_code text nullable`; `started_at`, `completed_at`, `created_at`, `updated_at`.
- Unique `(facility_id,run_number)`; index `(status,created_at)`, `(borrower_id,created_at DESC)`.

### `covenant_terms`
- `id uuid PK`; `analysis_run_id uuid FK UNIQUE`.
- `covenant_type` fixed to `DEBT_TO_ADJUSTED_EBITDA`; `comparator` fixed to `LTE`.
- `threshold_bps int NOT NULL`; `debt_definition text`; `ebitda_definition text`.
- `permitted_addbacks jsonb NOT NULL`; `testing_date date nullable`; `cure_rights_summary text nullable`.
- `evidence jsonb NOT NULL`; `confidence numeric(4,3)`; `uncertainty_notes jsonb`.
- `review_status enum('PENDING','CONFIRMED','REJECTED')`; `reviewed_by`, `reviewed_at`; `created_at`.

### `financial_inputs`
- `id uuid PK`; `analysis_run_id uuid FK UNIQUE`; `currency char(3)`.
- `encrypted_payload bytea NOT NULL`; `nonce bytea`; `auth_tag bytea`; `financial_inputs_hash char(64) NOT NULL`.
- The encrypted payload contains reported EBITDA, total debt, add-back amounts and adjusted EBITDA; backend decrypts only for authorized Analyst/calculation/proof operations.
- `attested_by uuid FK profiles`; `attested_at timestamptz`; `created_at`.
- Decrypted values must validate nonnegative debt and positive adjusted EBITDA; unique one confirmed snapshot per run.

### `scenario_results`
- `id uuid PK`; `analysis_run_id uuid FK`; `scenario enum('BASELINE','EBITDA_DOWN_10','DEBT_UP_10')`.
- `encrypted_payload bytea NOT NULL` contains debt/EBITDA/ratio/headroom details; `nonce bytea`; `auth_tag bytea`.
- `result enum('COMPLIANT','BREACH')` stores the non-sensitive categorical outcome; `risk_band enum('LOW','MEDIUM','HIGH')` may be exposed to Manager if product policy permits.
- `created_at`; unique `(analysis_run_id,scenario)`. Exact values are decrypted server-side only for Analyst response.

### `proof_artifacts`
- `id uuid PK`; `analysis_run_id uuid FK UNIQUE`; `circuit_version text`; `verification_key_hash text`.
- `proof_storage_key text`; `public_signals jsonb`; `witness_commitment text`; `verified boolean NOT NULL`.
- `verified_at`, `created_at`; never store private witness in a public table or response.

### `approvals`
- `id uuid PK`; `analysis_run_id uuid FK`; `manager_id uuid FK profiles`.
- `decision enum('APPROVE','REJECT')`; `risk_acknowledged boolean DEFAULT false`; `rationale text nullable`.
- `proof_artifact_id uuid FK`; `analysis_version int`; `created_at`.
- Unique `(analysis_run_id)` ensures one decision per immutable run; index `(manager_id,created_at DESC)`.

### `audit_events`
- `id uuid PK`; `borrower_id uuid FK`; `sequence_no bigint`; `event_type text`; `actor_id uuid nullable`.
- `previous_hash char(64)`; `ciphertext bytea`; `nonce bytea`; `auth_tag bytea`; `event_hash char(64)`; `signature bytea`; `metadata jsonb` (non-sensitive only); `created_at`.
- Unique `(borrower_id,sequence_no)`; index `(borrower_id,sequence_no)`.

### `borrower_keys`
- `borrower_id uuid PK FK borrowers`; `wrapped_dek bytea NOT NULL`; `wrap_nonce bytea`; `wrap_tag bytea`.
- `key_version int`; `status enum('ACTIVE','SHREDDED')`; `created_at`; `shredded_at nullable`.
- Delete/zeroize wrapped key material on demo shred; keep a non-sensitive shredded marker.

### `redaction_revisions`
- `id uuid PK`; `analysis_run_id uuid FK`; `revision int`; `redacted_text_storage_key text` (encrypted or protected); `encrypted_token_map bytea`; `reviewed_by`; `reviewed_at`; `created_at`.
- Unique `(analysis_run_id,revision)`.

### `feedback_records`
- `id uuid PK`; `analysis_run_id uuid FK`; `created_by`; `correction_type text`; `before_value jsonb`; `after_value jsonb`; `synthetic_only boolean NOT NULL DEFAULT true`; `created_at`.
- No raw document text or personally identifying content.

### `reppo_evaluations`
- `id uuid PK`; `feedback_record_id uuid FK`; `provider_eval_id text`; `status enum('PENDING','COMPLETED','FAILED')`.
- `score int`; `decision text`; `confidence text`; `critique jsonb`; `route text`; `submitted_at`, `completed_at`; `provider_cost numeric(12,6)`.
- Unique `provider_eval_id`; index `(status,submitted_at)`.

### `kite_sessions` and `kite_payments` (conditional integration)
- `kite_sessions`: `id uuid PK`; `external_session_id text UNIQUE`; `approved_by uuid FK profiles`; `asset text`; `per_payment_cap_minor numeric(24,0)`; `total_cap_minor numeric(24,0)`; `expires_at`; `status`; `created_at`.
- `kite_payments`: `id uuid PK`; `session_id uuid FK`; `idempotency_key text UNIQUE`; `service_id text`; `amount_minor numeric(24,0)`; `asset text`; `provider_receipt jsonb`; `status enum('PENDING','SUCCEEDED','FAILED','RECONCILIATION_REQUIRED')`; `created_at`.

### `jobs`
- `id uuid PK`; `job_type text`; `payload jsonb` with IDs only, no document content; `status enum('QUEUED','RUNNING','RETRY','SUCCEEDED','FAILED','CANCELLED')`.
- `attempts int`; `max_attempts int`; `locked_at`; `locked_by`; `next_run_at`; `last_error_code`; `created_at`; `updated_at`.
- Index `(status,next_run_at)`; claim using `FOR UPDATE SKIP LOCKED`.

### `idempotency_records`
- `id uuid PK`; `actor_id`; `key text`; `method`; `route`; `request_hash`; `response_status`; `response_resource_type`; `response_resource_id`; `created_at`; unique `(actor_id,key)`. Avoid storing sensitive response bodies in the idempotency table.

## 7.2 Relationships

```text
profiles ──< borrowers.created_by
borrowers ──< facilities ──< documents
       │             └────< analysis_runs >──── documents
       │                         │
       │                         ├──1 covenant_terms
       │                         ├──1 financial_inputs
       │                         ├──< scenario_results
       │                         ├──0..1 proof_artifacts ──< approvals
       │                         └──< feedback_records ──< reppo_evaluations
       ├──1 borrower_keys
       └──< audit_events
kite_sessions ──< kite_payments
jobs / idempotency_records are operational tables
```

## 7.3 Data classification

- **Never public:** original agreements, raw financial figures, token-to-identity map, provider keys, wrapped encryption keys, proof witnesses, session tokens, private audit ciphertext.
- **Analyst-only:** original agreement, redaction spans, token map resolution, detailed financial inputs, exact ratios and dollar amounts.
- **Manager:** covenant limit and evidence needed for approval, baseline compliant/breach result, proof verification status, scenario classifications and risk bands; no raw amounts or names.
- **Auditor:** pseudonymous IDs, event metadata, signatures/hashes, proof status, approver identity and timestamps; no raw borrower details by default.
- **Admin:** account/role and provider health metadata; no borrower-content access by default.
- **Demo public:** synthetic fixture records, UI screenshots and carefully redacted demo captures only.

---

# 8. System architecture

## 8.1 Architecture choice

A small, separated web application with a Node API, a durable PostgreSQL job queue and a private Presidio service. Do not introduce microservices for each partner, Redis, Kafka, Kubernetes or an event bus.

```text
Browser (Next.js on Vercel)
  | HTTPS + Supabase Auth access token
  v
Assay API (Fastify / Node.js on Render)
  |-- auth/JWT + RBAC
  |-- domain services + state machine
  |-- deterministic calculation engine
  |-- SERV reasoning adapter (structured reasoning nodes)
  |-- NEAR AI inference adapter (tokenized agreement only)
  |-- Reppo adapter (synthetic feedback only)
  |-- Kite adapter (optional x402, strict policy gate)
  |-- encrypted Supabase Storage access
  |-- Postgres jobs table + worker loop in same service
  v
Supabase Postgres + private Storage + Auth
  ^
  | worker claims jobs with SKIP LOCKED
  |
Python Presidio service (Render Web Service; server-to-server token)

Proof worker: Circom circuit + SnarkJS within the worker/runtime image
External providers: OpenServ SERV; NEAR AI Cloud (Layer 2); OpenRouter (general); Reppo; Kite (optional)
```

## 8.2 Responsibilities

- **Frontend:** present workflows, validate form shape for UX, display progress and role-appropriate data. It never authoritatively decides permissions, compliance, spending or approval.
- **Fastify API:** authentication verification, RBAC, state transitions, transactions, document upload, provider routing, audit events and REST contracts.
- **Job worker:** asynchronous parsing, redaction, extraction, proof generation and Reppo polling. Jobs are durable in Postgres and claimed with row locks. Worker restart resumes queued/retry jobs.
- **Presidio:** PII detection and anonymization only. It is not an authorization or data-governance engine.
- **SERV:** bounded reasoning/model orchestration on explicit graph steps. Application code owns the workflow state machine and deterministic acceptance checks.
- **NEAR AI:** Layer 2 sensitive extraction through its TEE-attested gateway. It receives tokenized agreement text and structured financial figures only, never token maps or direct identity fields. Attestation evidence must be verified.
- **Circom/SnarkJS:** fixed proof predicate, independent of the LLM.
- **Supabase:** Auth, Postgres and private Storage. Service role is server-only.
- **Reppo:** independent scoring of synthetic/de-identified traces; it does not alter production prompts on its own.
- **Kite:** optional spending-session and x402 enforcement, distinct from credit approval.

## 8.3 SERV is a core dependency, not a decorative integration

The application defines a bounded reasoning graph with named nodes, typed input/output schemas, deterministic transition conditions and validation checks. SERV is used for the interpretation/routing nodes, with all model calls routed through the SERV reasoning endpoint configured for the workspace. At minimum:

1. `INTERPRET_COVENANT`: interprets structured extracted clause facts and chooses supported / analyst review / unsupported.
2. `CLASSIFY_ADDBACKS`: determines whether entered lines match agreement-confirmed categories; returns schema-valid classifications.
3. `ROUTE_RESULT`: deterministic application logic routes the authoritative calculation into `COMPLIANT`, `BREACH_REVIEW` or `UNCERTAIN`; it is a graph transition, not a third LLM call.

Before each result is accepted, Zod schemas and deterministic invariants are checked. Store graph version, node ID, provider request ID, model ID and token/cost metadata, but not raw prompts or document contents in general logs. Where the account exposes SERV shadow verification/PromptGuard capabilities, enable them and record the actual status. Do not claim that a platform capability was used merely because it exists in a marketing page.

## 8.4 Job processing

Use a Postgres `jobs` table with `FOR UPDATE SKIP LOCKED`, lease expiry and bounded retries. No Redis required. API creates the job and state transition in one transaction. Worker claims a job, checks current analysis state, performs one step, writes result and next state in a transaction, then marks job complete. A retry is safe only for idempotent reads/model calls; a Kite payment job requires provider receipt reconciliation before retry.

## 8.5 Storage and encryption

- Supabase Storage bucket: `assay-private-documents`, private, no public URLs.
- Upload to backend; backend encrypts before upload. Store only ciphertext in object storage.
- One random 256-bit DEK per borrower. Wrap with AES-256-GCM under a server-side KEK from Render secret store. Persist only wrapped DEK, nonce and tag.
- Use borrower DEK for document ciphertext, encrypted token map and audit payloads with unique nonces.
- Never reuse a nonce for a given key. Use `crypto.randomBytes(12)` for GCM nonce.
- Decryption only in server memory for authorized Analyst operations. Do not create persistent plaintext temp files.
- On demo shred, remove wrapped DEK and mark key shredded. Retain non-sensitive hashes/metadata. This is crypto-shred, not proof of erasure from provider backups or all infrastructure.

## 8.6 Audit integrity

For each borrower, serialize event creation in a DB transaction with a row lock. Compute `event_hash = SHA-256(canonical(metadata || previous_hash || ciphertext || nonce || tag))`; sign the hash with Ed25519 using a private signing key stored in secret manager/environment; persist signature and chain index. Verification checks hash sequence and signature. Encrypt sensitive payload before hashing. Hash-chain is tamper-evident but not immutable against a fully compromised application/signing key.

## 8.7 Observability

Use Pino JSON logs with request ID, route, status, duration, job ID, provider request ID and error code. Redact Authorization headers, cookies, keys, document text, financial amounts and prompt bodies. Add `/health/live` and `/health/ready`; the latter checks DB and essential service configuration without exposing secret values. Render logs are the MVP log sink. External error tracking is optional and disabled unless approved.

---

# 9. Technology stack (fixed)

| Layer | Decision | Responsibility / rationale |
|---|---|---|
| Monorepo | pnpm workspaces | One repo, separate frontend/API/Presidio/circuit packages; no Turborepo needed. |
| Frontend | Next.js 16.x App Router + React + TypeScript | Route structure, SSR where useful, accessible dashboard UI; use latest patched stable 16.x and lock exact version. |
| Styling | Tailwind CSS 4.x + shadcn/ui + Radix primitives + Lucide | Consistent temporary system, accessible primitives, reference-image-led final execution. |
| Frontend data | TanStack Query + Zod | Server-state caching, retries and shared response parsing; no client-authoritative domain state. |
| Backend | Fastify 5.x + TypeScript | Small API service, schema validation, clear plugin boundaries and background-worker hosting. |
| Validation | Zod | Request/response and provider payload schemas. |
| Database | Supabase-managed PostgreSQL | Persistent relational storage and Supabase Auth integration. Use SQL migrations in repo. |
| ORM / SQL | Drizzle ORM + `pg` | Typed schema and explicit SQL transactions/row locking where required. |
| Auth | Supabase Auth | Invite-only staff login; API validates signed JWT and profile role. |
| Object storage | Supabase private Storage | Encrypted PDF/TXT objects, private bucket. |
| Jobs | Postgres `jobs` table + custom SKIP LOCKED worker | No Redis/queue service required; robust enough for single-instance MVP. |
| PII | Microsoft Presidio Analyzer + Anonymizer in Python 3.12 service | Standard recognizers plus custom finance-domain recognizers. |
| PDF text | `pdfjs-dist` in isolated backend worker | Text-layer extraction; reject scan-only documents, no OCR in MVP. |
| AI client | OpenAI SDK-compatible client | Single client wrapper with provider-specific base URL/model. SERV orchestrates reasoning nodes; NEAR AI handles Layer 2 extraction; OpenRouter handles structured judgement/generation. |
| Proofs | Circom 2.x + SnarkJS | One fixed circuit for one covenant predicate; pin exact tool versions and circuit artefacts. |
| Crypto | Node `crypto` (AES-256-GCM, SHA-256, Ed25519) | Encryption, hash chain and signed event hashes. |
| API docs | OpenAPI generated from Fastify schemas | Accurate API documentation. |
| Tests | Vitest + Testcontainers or Supabase local + Playwright | Unit/integration/E2E. Use deterministic fixtures. |
| Frontend hosting | Vercel preview/deployment | Early navigable UI and stable preview URL. |
| API/Presidio hosting | Render Web Services | No Railway. Use free tier only if limits permit; never start paid services without approval. |
| Database/Auth/Storage | Supabase | Free tier suited only to demo; free project pause/storage limits documented. |
| Video | Playwright + FFmpeg + Google Gemini TTS free tier where currently available | Capture real journeys, generate narration, synchronize and review. |

**Runtime versions:** use Node.js 24 LTS for app/API, Python 3.12 for Presidio, and exact patch versions pinned in lockfiles/images. Current Node release data shows 26 is Active LTS, but 24 remains supported Maintenance LTS; 24 is selected for broader compatibility with the current package/circuit stack. Use a patched stable Next.js 16.x release, not canary. Do not upgrade major versions mid-build without a documented compatibility/security need.

**Rejected alternatives:** Railway is unavailable to the operator. Avoid a separate Redis/Kafka service, Kubernetes, separate microservice per partner, custom auth implementation, unverified database hosting and an LLM-driven arithmetic engine. Render free Postgres is rejected for persistent application data because its documented free database expires after 30 days; use Supabase Postgres instead. Vercel is not used for long-running processing; API/worker work stays on Render.

---

# 10. API specification

Base path `/v1`. JSON responses use camelCase. All authenticated routes require `Authorization: Bearer <Supabase access token>`. All IDs are UUIDs. `Idempotency-Key` required for run creation, payment execution and other retry-sensitive POSTs.

## 10.1 Common error shape

```json
{
  "error": {
    "code": "ANALYSIS_STATE_CONFLICT",
    "message": "This analysis is no longer in a state that permits approval.",
    "requestId": "req_...",
    "details": {"currentState": "PROOF_FAILED"}
  }
}
```

Do not return stack traces, DB messages, secret values, provider raw errors or protected financial content in error responses.

## 10.2 Endpoint inventory

| Method / path | Purpose | Role / controls |
|---|---|---|
| `GET /health/live` | Liveness | Public, no dependency details |
| `GET /health/ready` | Readiness | Public, only aggregate status |
| `GET /v1/me` | Current profile/role | Authenticated |
| `GET /v1/borrowers` | List borrowers | Analyst/Manager/Auditor/Admin; role-shaped fields |
| `POST /v1/borrowers` | Create borrower | Analyst/Admin; idempotency |
| `GET /v1/borrowers/:id` | Borrower detail | Role-scoped response |
| `PATCH /v1/borrowers/:id` | Edit alias/status | Analyst/Admin; audit |
| `POST /v1/borrowers/:id/facilities` | Create facility | Analyst/Admin |
| `GET /v1/facilities/:id` | Facility detail | Authenticated role filter |
| `POST /v1/facilities/:id/documents` | Upload encrypted file | Analyst; multipart 10 MiB cap; rate limit |
| `GET /v1/documents/:id` | Metadata/status | Analyst; manager may see metadata only |
| `GET /v1/documents/:id/preview` | Decrypted preview | Analyst only; no caching; no range requests initially |
| `POST /v1/analysis-runs` | Create immutable run | Analyst; Idempotency-Key |
| `GET /v1/analysis-runs/:id` | Run status/details | Role-shaped fields |
| `POST /v1/analysis-runs/:id/redaction-review` | Confirm/edit redactions | Analyst; revision number required |
| `POST /v1/analysis-runs/:id/extraction` | Start AI extraction | Analyst; only confirmed redacted payload |
| `POST /v1/analysis-runs/:id/terms-review` | Confirm/edit extracted terms | Analyst; evidence required |
| `PUT /v1/analysis-runs/:id/financial-inputs` | Save and attest figures | Analyst; strict numeric validation |
| `POST /v1/analysis-runs/:id/calculate` | Calculate/scenarios | Analyst; idempotent; transaction |
| `GET /v1/analysis-runs/:id/report` | Role-filtered report | Analyst full; Manager restricted; Auditor evidence-only |
| `POST /v1/analysis-runs/:id/proof` | Request proof | Worker; app-triggered, no witness returned |
| `GET /v1/analysis-runs/:id/proof` | Proof status | Manager/Analyst/Auditor; no private witness |
| `GET /v1/approvals/queue` | Pending manager decisions | Manager only |
| `POST /v1/analysis-runs/:id/approvals` | Approve/reject | Manager only; proof precondition; Idempotency-Key |
| `GET /v1/borrowers/:id/audit-events` | Audit timeline | Role-specific redacted metadata |
| `POST /v1/borrowers/:id/audit/verify` | Verify chain | Analyst/Manager/Auditor/Admin; read-only |
| `POST /v1/demo/borrowers/:id/shred` | Demo-only key shred | Admin + demo feature flag + typed confirmation |
| `POST /v1/feedback` | Record analyst correction | Analyst; synthetic-only |
| `POST /v1/integrations/reppo/evaluations` | Submit safe trace | Analyst; provider active; cost gate |
| `GET /v1/integrations/reppo/evaluations/:id` | Poll evaluation | Authenticated; role-shaped |
| `GET /v1/integrations/status` | Provider availability | Admin/Analyst; no secrets |
| `POST /v1/integrations/kite/benchmark-requests` | Optional x402 purchase | Analyst; active session + strict deterministic policy + idempotency |

## 10.3 Representative payloads

Create borrower:
```json
{"displayAlias":"Borrower Demo 01","referenceToken":"BOR-001"}
```

Create analysis:
```json
{"facilityId":"uuid","documentId":"uuid","idempotencyKey":"run-001"}
```

Financial inputs:
```json
{
  "currency":"USD",
  "reportedEbitdaMinor":"100000000",
  "totalDebtMinor":"325000000",
  "addbacks":[{"code":"RESTRUCTURING","amountMinor":"5000000","sourceReference":"fixture:p4"}],
  "attest":true,
  "termsVersion":1
}
```

Manager approval:
```json
{"decision":"APPROVE","proofArtifactId":"uuid","analysisVersion":1,"riskAcknowledged":true,"rationale":"Downside sensitivity reviewed; baseline covenant proof verified."}
```

The API must ignore user-supplied `role`, `approvedBy`, `resultCode`, `proofVerified`, `remainingBudget` or any field that is authoritative only on the server.

## 10.4 Special controls

- Rate limit login-adjacent routes, uploads, analysis creation and AI-provider calls per user and IP.
- Idempotency is mandatory for analysis-run creation, proof requests, approvals and Kite payments.
- Upload has streaming size cap and file-type validation.
- Approval and payment use transaction locks.
- Audit verify endpoint is read-only and rate-limited.
- Public health routes reveal no provider configuration or database names.

---

# 11. Database operations and concurrency

- **Create borrower + facility:** one DB transaction; insert borrower, facility, audit event and idempotency response; rollback all on failure.
- **Upload document:** encrypt and upload object first; then DB transaction inserts metadata and job. If DB transaction fails, delete orphan ciphertext; if object cleanup fails, record orphan for cleanup.
- **Enqueue job:** state transition and job insert in same transaction; job payload contains IDs only.
- **Claim job:** `SELECT ... FOR UPDATE SKIP LOCKED`; mark `RUNNING`, assign worker ID and lease timestamp. Reclaim expired leases.
- **Persist extraction:** store raw provider output only in encrypted evidence payload; schema validation and analysis state transition occur transactionally; never overwrite confirmed terms.
- **Calculate:** read immutable terms + financial snapshot; compute results in domain service; insert all scenarios and run result atomically; audit event inserted in same transaction.
- **Generate proof:** proof generated outside transaction; final verification metadata and state transition commit only if analysis version/hash remains unchanged. If inputs changed, discard proof.
- **Approve:** lock analysis row; validate proof, analysis hash/version and state; insert approval with unique analysis_run_id; update run and audit in one transaction. Unique constraint plus row lock prevents concurrent double approval.
- **Audit chain:** lock borrower key/head row; allocate sequence; read previous hash; encrypt payload and sign; insert. Serialize concurrent writes per borrower.
- **Crypto-shred:** lock borrower key row; require demo mode and typed confirmation; mark shredded and delete wrapped key material. Audit event uses separate signing key and non-sensitive payload. Operation is irreversible and must be explicitly authorized.
- **Kite payment:** lock session budget; check local reservation; issue provider request with idempotency; reconcile provider receipt; finalize payment/budget in transaction. On timeout after submission, state becomes `RECONCILIATION_REQUIRED`; never blindly retry.

---

# 12. Authentication and authorization

Supabase Auth is the identity provider. Signup is disabled. Admin creates staff identities out of band and assigns a profile role. The frontend sends an access token; Fastify validates JWT signature/issuer/audience/expiry using Supabase's supported key discovery/JWKS and then loads current profile status/role from Postgres on protected requests (or a very short role cache invalidated by admin action).

Every service method receives an authenticated principal and resource ID. Authorization is checked on the server against the database record and role before returning any data. Never authorize by hidden UI controls, request-body role, URL UUID alone or client-side ownership claims. Role-shaped serializers ensure Manager/Auditor endpoints cannot accidentally include analyst-only columns.

Supabase `service_role` key, database password and signing/encryption keys are server-only. If browser direct access to tables is not needed, do not expose sensitive tables via public client queries. Enable RLS on exposed Supabase tables and private Storage policies even if the main API uses the server connection. No public bucket.

Account lifecycle: invited → active → disabled. Disabling a user blocks API access immediately on the next request. Role changes are admin-only, audited and cannot be done through user profile edit.

---

# 13. Security architecture

| Risk | Mitigation / required test |
|---|---|
| Authentication bypass / weak sessions | Supabase Auth, signed JWT validation, expiry/issuer/audience validation, secure cookies, no local custom passwords; test invalid/expired/revoked sessions. |
| IDOR / cross-user access | Load each resource from DB and authorize role before query result serialization; negative E2E tests with a second account and guessed UUIDs. |
| Privilege escalation | Ignore client roles and `approvedBy`; role from trusted profile table; audit every role change. |
| SQL injection | Drizzle parameterized statements; no string-built SQL from user input; test malformed filters. |
| XSS | React escaping, no `dangerouslySetInnerHTML`; render extracted PDF text as plain text; CSP; test script payloads in borrower labels and PDF text. |
| CSRF | Bearer-token API and strict CORS; use secure SameSite cookies where SSR session requires them; CSRF tokens for cookie-authenticated mutations. |
| CORS abuse | Exact Vercel preview and production origins from env; no wildcard with credentials. |
| Brute force / enumeration | Supabase Auth protection, rate limits, generic login errors; do not reveal whether borrower/email exists. |
| File upload attack | Strict type/magic-byte/size/page limit, encrypted storage, isolated parser, no filesystem execution, text-only PDF; reject encrypted/scanned/unsupported files. |
| Prompt injection | Treat agreement text as untrusted evidence, never as instructions; fixed system messages; extraction output schema validation; PromptGuard only if verified; deterministic tool allowlist; no model-directed arbitrary tool use. |
| Data exfiltration | Presidio redaction and stable tokens; outbound request builder allowlists fields; no token map to model; only synthetic Reppo payloads. |
| SSRF | No user-provided URL fetch in MVP; provider hostnames fixed in configuration allowlist; block arbitrary redirect targets. |
| Provider compromise / logging | Use only verified partner endpoint and documented data terms; redact identities; synthetic-only MVP; short payload retention by app; never imply no-log from an API-compatible interface. |
| Secret leakage | Render/Vercel secrets; `.env.example` placeholders only; secret scanning; never log headers/env; rotate leaked keys. |
| Webhook spoof / replay | No inbound webhooks required for core MVP. If provider webhook added, verify signature, timestamp, body hash and idempotency. |
| Race conditions | DB transactions, row locks, unique constraints, idempotency keys; concurrency tests on approval and payment. |
| Proof manipulation | Pin circuit version and verification key hash; verify proof server-side; bind proof to terms/financial hash/run ID; proof does not validate source evidence. |
| Audit tampering | SHA-256 chain plus Ed25519 signature; ciphertext hashed; test single-byte modification and chain reordering. |
| Crypto-shred misuse | Demo-only flag, Admin role, typed confirmation, synthetic records only; explicit authorization; no production endpoint. |
| Payment manipulation | Deterministic Kite policy before network call; per-payment cap, total session cap, expiry, allowed asset/service and idempotency; no LLM decision. |
| Reppo feedback poisoning | Synthetic-only examples; rate limits; human must approve prompts/model changes; store provenance and evaluation outcome. |
| Logging sensitive data | Structured logs with field redaction; never log prompt/document/financial inputs; test logs with sentinel secrets. |
| Dependency/supply-chain | Lockfile, dependency review, `npm audit`/OSV scan, pinned Python dependencies, minimal containers, no arbitrary skill instructions. |

**Privacy wording allowed:** “Assay redacts detected identity fields before model submission, encrypts stored documents and audit payloads, and uses a fixed ZK circuit to prove a defined covenant predicate.”  
**Wording prohibited without independent evidence:** “TEE-secured”, “guaranteed zero retention”, “GDPR compliant”, “impossible to reconstruct”, “cryptographically proves financial truth”, “DP protected” when the implementation is only synthetic data.

---

# 14. UI/UX architecture

The exact final visual system is reference-image-led. No reference image is attached to the current request; this is an explicit Phase 0 blocker and is recorded in `REFERENCE_ASSETS.md`. Until then, Phase 1 uses a neutral, consistent temporary design system and clearly labelled placeholders.

## 14.1 Routes and screen behavior

| Route | Purpose / role | Key components and actions | Data / states / E2E |
|---|---|---|---|
| `/login` | Staff sign-in | Email/password or configured Supabase Auth control; errors; show product identity | Auth session; invalid/inactive/loading/success; E2E login and sign-out |
| `/` | Role-specific dashboard | Summary cards, recent borrowers/analyses, pending manager reviews, provider health indicator | API summary; skeleton, empty, error; verify role-specific card visibility |
| `/borrowers` | Borrower list | Search by alias/token, status filter, create button for Analyst/Admin | Paginated API list; empty/error/loading/denied; E2E create/list |
| `/borrowers/new` | Create synthetic borrower | Alias/reference fields, validation, save/cancel | POST borrower; field errors and duplicate state |
| `/borrowers/[id]` | Borrower and facility detail | Facility cards, analysis timeline, upload CTA; no manager raw data | Role-filtered API; not-found/denied states |
| `/facilities/[id]` | Facility workspace | Agreement upload, runs, current status, create analysis | Facility data; upload progress/fail/duplicate states |
| `/analyses/[id]` | Analyst workflow | Stepper: document → redaction → terms → figures → calculation → proof → approval | Run state and backend jobs; all step-specific loading/errors; E2E full analyst journey |
| `/analyses/[id]/redaction` | Redaction review | Text viewer with highlights, entity list, correction and confirm | Redaction revision; no results until confirmed |
| `/analyses/[id]/terms` | Covenant extraction review | Structured form, source quotes/page references, confidence and uncertainty; edit/confirm | CovenantTerms schema; invalid evidence, unsupported covenant |
| `/analyses/[id]/financials` | Enter figures | Currency, debt, EBITDA, add-back rows, source refs, attestation checkbox | FinancialInputs schema; numeric validation and cap errors |
| `/analyses/[id]/results` | Analyst detail | Baseline result, exact ratio/headroom, scenario chart/table, proof status, reasoning trace | Analyst-only response; no calculations in client; loading/failed/unknown/breach |
| `/reviews` | Manager approval queue | Pseudonymous borrower, compliance status, proof, scenario risk badges | Manager-only; empty/loading/denied |
| `/reviews/[id]` | Manager decision | Restricted report, proof details, stress acknowledgement, rationale, approve/reject | Approval API; reject invalid proof/stale run; E2E manager approval |
| `/audit` | Audit event list | Filter by borrower token/type/date, verification action | Redacted metadata; chain broken warning; role access |
| `/audit/[borrowerId]` | Audit detail | Ordered events, hash/signature status, proof and approval events | No decrypted private event content for Auditor; chain verify E2E |
| `/settings` | Profile/integration status | User role read-only; integration availability; admin user controls | Never show secret values; admin-only edits where supported |
| `/not-found` | Invalid route | Clear return navigation | 404; no data leak |

## 14.2 Navigation

- Primary nav: Overview, Borrowers, Analyses, Reviews (Manager only), Audit, Settings.
- Role-aware nav hides inaccessible destinations, but API authorization remains mandatory.
- Footer: product version, Documentation link to verified `/docs` destination or repository docs, GitHub link only if repo is public and confirmed, Privacy/Terms/Contact only if real destinations exist. No fake links or `href="#"`.
- Page title, meta description, OpenGraph image and favicon/app icon required; metadata must not include private borrower values.

## 14.3 Responsive behavior and accessibility

Desktop-first for analyst work, fully usable at tablet/mobile widths. Tables become stacked cards or horizontally scrollable with clear labels; forms become one column; fixed action bars do not obscure fields. Use semantic landmarks, labels, keyboard navigation, visible focus, status text not color alone, accessible dialogs and WCAG AA color contrast where measurable. Respect reduced motion. Loading/error states must be announced via appropriate live regions.

## 14.4 UI quality gate

Critical analyst and manager journeys must pass E2E before final reference-led UI refinement. After refinement, rerun every critical E2E journey and responsive/accessibility checks. Do not turn temporary placeholders into apparently working controls.

---

# 15. Reference-image-led UI and required skill

- Required asset: at least one operator-supplied UI reference image, attached during Phase 0. Record exact filename/path, provenance/ownership, intended route(s), visual observations and any prohibited elements.
- Current status: **NOT YET SUPPLIED**. Do not invent a path or claim the asset exists. No final UI work can begin until supplied or the operator explicitly authorizes an agent-generated reference image.
- The agent inspects the original image file directly; extracts layout, hierarchy, spacing, typography, palette, component density, navigation and interactions; maps those observations to the screen inventory; implements the actual interface directly.
- Do not create a separate mockup/prototype, image approval phase or design-signoff stop. Do not reproduce third-party logos, protected assets, proprietary copy or distinctive trade dress.
- At the start of Phase 6 run exactly:

```bash
npx skills add benjitaylor/skills --skill stageshow
```

- Inspect the installed skill's instructions. Follow relevant guidance only where it does not conflict with this blueprint, security, accessibility or repository policy. The agent may find other reputable, directly relevant UI skills, but must inspect their trustworthiness and reject conflicting instructions. If install fails, log exact error in `docs/BUILD_LOG.md` and proceed with the principles above.
- Record image paths and interpretations in `REFERENCE_ASSETS.md` and `docs/DESIGN_NOTES.md`.

---

# 16. Third-party integrations

## Mandatory

### Supabase
Purpose: Auth, Postgres and private file storage.  
Auth: project URL and anon key in frontend; service role/database credentials server-only.  
Data: user identity/roles, application entities and encrypted document blobs.  
Failure: database unavailable → readiness false and writes blocked; storage unavailable → upload not accepted.  
Security: private bucket, server-side access, strict JWT validation, no service-role key in browser.

### OpenServ SERV Reasoning
Purpose: core bounded reasoning nodes.  
Base URL from current OpenServ public materials: `https://inference-api.openserv.ai/v1`; authentication via SERV API key; OpenAI-compatible client pattern.  
Data: structured, non-identifying calculation facts. SERV nodes route tokenized agreement text only to NEAR AI; general judgement/generation receives structured data from OpenRouter.  
Failure: no fake success; bounded transient retry; mark SERV validation pending/failed and block final “SERV completed” status.  
Security: no raw token map, no real PII in MVP, provider/model/trace metadata only in logs.

### NEAR AI Cloud (Layer 2 confidential extraction)
Purpose: structured extraction of tokenized credit-agreement text.  
Base URL: `https://cloud-api.near.ai/v1`; bearer auth via `NEARAI_API_KEY`. Select only models with `verifiable: true` and `attestationSupported: true`; request fresh Intel TDX/NVIDIA NRAS evidence with a client-supplied nonce.  
Data: tokenized agreement text and structured financial figures only; no token map, borrower identity or raw document.  
Failure: adapter disabled or run routed to manual review if key, credit, attestation or model verification fails. Never silently route sensitive prompts to a different provider.

## Conditional / SHOULD HAVE

### Reppo Evaluation API
Current public API documentation advertises `POST https://eval.reppo.xyz/api/v1/agents/eval-requests/submit`, `GET .../{evalId}`, API-key bearer auth, structured verdicts, confidence, critiques and route; free 10 evaluations are advertised, then launch pricing of $0.01/evaluation. Verify current quota, payload terms and rate limits during intake.  
Data: only synthetic/de-identified correction or trace; max payload per current docs 50 KB; no original borrower text or exact financial figures.  
Failure: pending/failed displayed honestly; retry safely; no fabricated verdict. Human approves any prompt/model change.

### Kite Passport / x402
Purpose: optional paid external benchmark/data retrieval under a spending session.  
Current Kite docs describe passkey-approved task sessions with per-payment limit, total budget and expiry; payments can be made to x402 services.  
Data: service id, quote, asset, session ID, payment receipt; no borrower raw data unless provider contract and legal controls are explicitly approved (not in MVP).  
Failure: deny by deterministic policy; if CLI/SDK command names or network are unclear, do not build against guessed names.  
Authorization: no testnet spend until operator specifies exact cap, asset, wallet, session owner and permitted catalog service.

### Google Gemini TTS (demo production only)
Use the then-current Google AI Studio free TTS tier only after checking free quota and terms. Current official pricing shows a free tier for Gemini TTS models but indicates free-tier inputs may be used to improve products; send only the public demo narration script, never credentials or borrower data. If the free option is unavailable/over quota or terms are unsuitable, use a genuinely free local TTS fallback and document it. No paid tier or billing enablement without explicit authorization.

## No webhooks in core MVP
No external webhook is required for the core app. If Reppo or Kite later needs callback handling, validate signatures/timestamps/body digest, enforce idempotency and do not trust callback fields without server-side provider reconciliation.

---

# 17. AI architecture

## 17.1 Responsibilities

AI may:
- Extract candidate covenant definitions, threshold, comparator, permitted add-back categories, testing date, cure-right summary and page evidence from redacted agreement text.
- Classify a user-entered add-back against the already-confirmed permitted category list, with evidence and uncertainty.
- Interpret structured analysis metadata to suggest a workflow route or summarize a result for human review.
- Draft a concise explanation using deterministic calculations supplied by the application.

AI may not:
- Create or change borrower/facility ownership.
- Authoritatively calculate financial ratios or compliance.
- Change covenant threshold after analyst confirmation.
- Invent missing financial values or evidence.
- Approve/reject/override a credit decision.
- Initiate or authorize a payment.
- Change its own prompts/model/schema without human approval.

## 17.2 Routing

- **NEAR AI (Layer 2):** tokenized agreement extraction only, using TEE-verifiable models and fresh attestation evidence.
- **OpenRouter (general):** structured judgement and generation nodes only; never raw documents.
- **SERV:** all structured reasoning/decision routing nodes; requests to the current SERV endpoint and selected model catalog entry. No direct provider bypass in normal flow.
- **No model call:** calculation, scenario arithmetic, proof generation/verification, RBAC, state transitions, spending limits, audit-chain verification.

## 17.3 Prompt and schema controls

- Store versioned prompts in `packages/prompts/` with reviewed changes.
- System prompt clearly separates instruction from untrusted quoted agreement text.
- Use strict Zod schemas, max output tokens, low temperature for extraction and JSON mode only if provider actually supports it.
- Preserve exact evidence snippets and page references; reject hallucinated or absent references.
- One schema-repair attempt maximum; do not loop indefinitely.
- Route ambiguity or low confidence to human review; confidence alone never authorizes acceptance.
- Keep prompts and model outputs out of logs. Store necessary evidence encrypted and with retention controls.

## 17.4 Cost and rate limits

- Default budget: one NEAR AI extraction call, up to two SERV/OpenRouter reasoning calls, and at most one schema-repair call total; Reppo evaluation is separate and explicitly gated.
- Configurable max document chars/pages; 10 MiB/40-page upload cap.
- Provider timeout 45 seconds; one transient retry; per-user request rate limit.
- Record model ID, request ID, token usage and estimated provider cost only.
- No paid top-ups or billing activation without intake authorization.

## 17.5 Fallback

- For tests: deterministic fixtures.
- For operator demo: provider must be marked `LIVE` or `FIXTURE` in UI state; fixtures are not presented as live inference.
- If NEAR AI is unavailable, analyst may manually input covenant terms and the UI displays “AI extraction unavailable”; core calculation may still proceed, but SERV workflow and manual review must be accurately recorded. Do not route sensitive text to a substitute provider.
- If SERV unavailable, never claim SERV reasoning completed. Preserve entered data and mark run `SERV_PENDING` or blocked from final approval according to the configured acceptance gate.

---

# 18. Payments / financial logic

There is no customer billing, subscription, borrower payment, escrow, payout, refund, custody or balance system in the MVP. Assay does not process loan proceeds or financial transfers.

The only possible money movement is an optional Kite Passport x402 payment for one external data/benchmark service on Kite testnet. It is treated as an agent expense, not a credit approval. The app must show service, quoted amount, asset, cap and remaining budget before execution. A deterministic policy module checks operator-approved allowlist, per-payment cap, total budget, expiry and idempotency. No payment is executed in the absence of an active owner-approved session and explicit operator authorization. If Kite cannot be activated safely, disable the feature.

---

# 19. Admin and operations

Admin MVP features: list active staff, deactivate account, assign one of the approved roles, view integration health (configured/disabled/error, never secret contents), and inspect audit-verification status. No general admin console for editing borrower data. No user-facing secret editor. Provider secrets are configured in Vercel/Render/Supabase environment settings.

Operational controls:
- Health endpoints and deploy metadata.
- Queue backlog/failed-job counters.
- Provider quota/balance status only if provider exposes safe aggregate metadata.
- One-click retry for retryable jobs, with idempotency safeguards.
- Demo fixture reset and crypto-shred only in demo environment, never production.
- Database migrations are committed and repeatable.
- Daily export/backup process documented; production-grade backup/restore is future scope.

---

# 20. Error and edge-case matrix

| Area | Invalid / missing | Duplicate / concurrent | Provider / network failure | Recovery |
|---|---|---|---|---|
| Login | Invalid credential or inactive profile → generic 401/403 | Multiple sessions allowed under Auth policy | Supabase unavailable → sign-in unavailable | Retry; no local bypass |
| Borrower | Missing alias/reference → 422 | Unique reference and idempotency | DB fail → transaction rollback | Correct input/retry same key |
| Upload | Wrong type, >10 MiB, >40 pages, scan-only, password-protected → 422 | Checksum duplicate → 409 | Storage outage → 503, cleanup orphan | Re-upload after fixing; no plaintext fallback |
| Redaction | Span out of range or unresolved PII → block | Same revision idempotent; changed revision increments | Presidio down → stop before inference | Retry service; manual redaction only if explicitly permitted and logged |
| Extraction | Schema/evidence missing → repair once then manual review | Duplicate extraction returns same job/result | 429/5xx/timeout → bounded retry | Manual term entry with explicit AI-unavailable label |
| Financials | Negative debt, zero EBITDA, currency mismatch, invalid add-back → 422 | Version lock prevents double save | DB outage → no calculation | Correct and submit a new snapshot |
| Calculation | Overflow or inconsistent invariant → fail closed | unique scenario keys prevent duplicates | SERV unavailable → preserve calc but not completed status | Retry SERV node; do not change arithmetic result |
| Proof | Circuit compile/witness/proof fail → PROOF_FAILED | One proof per snapshot; concurrent request coalesced | worker interruption → retry job safely | Recalculate only if snapshot hash matches |
| Approval | Wrong role, breach, failed proof, stale run → 403/409 | row lock + unique approval constraint | DB error → rollback; no partial approval | Reload queue and retry with idempotency key |
| Audit | Hash/signature mismatch → incident status | row lock sequence per borrower | signing key unavailable → fail closed, preserve event queue | restore key securely; never write unsigned success event |
| Shred | Production mode or wrong confirmation → 403 | repeated shred returns already-shredded | key-store/db outage → no false success | retry only after verifying key status; irreversible warning |
| Reppo | >50KB, contains disallowed fields → reject preflight | provider ID unique | pending/timeout/429 → poll/retry per docs | retain PENDING/FAILED status; no fabricated result |
| Kite | no active session, wrong asset or over cap → deny | idempotency + budget lock | timeout after 402/settlement → reconciliation required | query provider receipt; do not blind retry |
| Frontend | invalid form fields → inline errors | duplicate clicks disable while pending but API still idempotent | API offline → explicit error state | retry action; preserve unsent form data safely |

---

# 21. Test strategy

## Unit tests

- Money parsing and minor-unit validation.
- Add-back eligibility/caps and adjusted EBITDA.
- Leverage comparison without floating-point rounding.
- Headroom and scenario rounding rules.
- State transition guard matrix.
- Role capability matrix and serializers.
- Prompt output schemas and evidence/page bounds.
- Redaction tokenization and stable token mapping.
- AES-GCM encrypt/decrypt/tamper rejection and key-wrapping logic.
- Audit canonicalization/hash/signature/chain verification.
- Crypto-shred behavior (key cannot decrypt old ciphertext after deletion).
- ZK input range and public threshold comparator.
- Kite policy budget/expiry/asset/idempotency logic.
- Reppo payload scrubber and size cap.

## Integration tests

- Supabase Auth JWT validation and disabled-user rejection.
- Postgres migrations and FK/unique/check constraints.
- Private Storage encryption upload/download and access restrictions.
- Jobs queue transaction, worker lease expiry and retry.
- Presidio service returns spans/custom recognizers; backend blocks raw entity values in outbound payload.
- SERV adapter request/response against sandbox or contract fixture; verify required graph trace metadata.
- NEAR AI adapter contract using sandbox/synthetic tokenized text and attestation fixtures; do not use production borrower data.
- Circom compile + SnarkJS proof generation/verification.
- Reppo sandbox submit/poll; test failure status.
- Kite sandbox/testnet policy + receipt reconciliation only if credentials are authorized.

## E2E critical journeys

1. Analyst sign-in → create borrower/facility → upload synthetic PDF → review redaction → extraction → confirm terms → enter financials → calculate → verify scenarios → generate proof.
2. Manager sign-in → view restricted queue → inspect proof and risk flags → approve eligible run → confirm approval event.
3. Breach scenario → no compliance proof → manager cannot approve → analyst sees breach review.
4. Auditor sign-in → view event chronology → verify audit chain → tamper fixture test detects corruption.
5. Admin demo-only shred → confirmation → key removed → chain still verifies; production-mode request blocked.
6. Provider failure → explicit unavailable state; no invented success; core unaffected screens remain usable.
7. Keyboard/mobile pass through login, upload status, review and manager approval.

## Security tests

- IDOR using second user and random known IDs.
- Role bypass with forged JSON role and direct endpoint calls.
- XSS text in alias, PDF extraction, evidence quote and error strings.
- SQL injection probes.
- Oversized/malformed/malicious PDF and zip bomb-like structures (bounded parse time/memory).
- Prompt injection content in uploaded agreement.
- Search/log scanning for sentinel PII/API secrets.
- Invalid/expired JWT, CORS origin denial, CSRF checks where cookie-auth path applies.
- Concurrent approval double-submit and duplicate payment simulation.
- Audit ciphertext byte tamper/signature removal/sequence reordering.
- Proof mutation and public threshold substitution.

## Acceptance gate

All unit/integration tests pass; primary E2E flows pass on deployed preview; no unresolved critical/high security issue; preview URL and exact commit recorded; all external integrations show real/disabled/fixture status accurately; no production secret/data is exposed. Only then proceed to final visual refinement.

---

# 22. Repository structure

```text
Assay/
├── README.md
├── MASTER_BLUEPRINT.md
├── PROJECT_SPEC.md
├── ARCHITECTURE.md
├── IMPLEMENTATION_PLAN.md
├── AGENTS.md
├── AI_HANDOFF.md
├── OPERATOR_INTAKE.md
├── REFERENCE_ASSETS.md
├── DEMO_VIDEO_PLAN.md
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── .gitignore
├── .env.example
├── apps/
│   ├── web/                    # Next.js UI
│   └── api/                    # Fastify API + Postgres worker loop
├── services/
│   └── presidio/               # Python Presidio API, Dockerfile, custom recognizers
├── packages/
│   ├── domain/                 # states, rules, pure calculations
│   ├── contracts/              # Zod schemas, API DTOs
│   ├── db/                     # Drizzle schema, migrations, seeds
│   ├── crypto/                 # encryption, signatures, audit chain
│   ├── ai/                     # SERV/NEAR AI/OpenRouter/Reppo/Kite adapters + prompts
│   ├── proof/                  # Circom source, scripts, verifier
│   └── test-fixtures/          # synthetic documents and financial scenarios
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── security/
├── scripts/                    # seed/reset/migrate/check commands
├── artifacts/
│   └── demo/                   # final MP4, captions, script, notes
└── docs/
    ├── SETUP.md
    ├── CONFIGURATION.md
    ├── TESTING.md
    ├── DEPLOYMENT.md
    ├── TROUBLESHOOTING.md
    ├── DESIGN_NOTES.md
    ├── OPERATOR_GUIDE.md
    ├── API.md
    ├── DATA_MODEL.md
    ├── SECURITY.md
    ├── INTEGRATIONS.md
    └── BUILD_LOG.md
```

No `Cline` instructions or `.clinerules` are needed. Use `AGENTS.md` as the persistent agent instruction. The coding workflow uses OpenCode or the operator's specified coding agent; the exact CLI is an operator intake detail. Windows command examples use `npm.cmd` where npm is used; this stack standardizes on pnpm, so use `pnpm.cmd` in PowerShell and check `$LASTEXITCODE` after CLI commands.

---

# 23. Environment variables

All secrets are server-only unless explicitly marked `NEXT_PUBLIC_`.

| Variable | Required | Used by | Exposure |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Web | Client-safe URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Web | Client-safe public anon key; RLS required |
| `SUPABASE_URL` | Yes | API | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | API | Secret; never client |
| `DATABASE_URL` | Yes | API/worker | Secret Postgres connection string |
| `SUPABASE_STORAGE_BUCKET` | Yes | API | Server config, default `assay-private-documents` |
| `SUPABASE_JWKS_URL` | Yes | API | Public URL, server config |
| `SERV_BASE_URL` | Yes | AI adapter | Default `https://inference-api.openserv.ai/v1` |
| `SERV_REASONING_API_KEY` | Yes | API/worker | Secret |
| `SERV_MODEL` | Yes | API/worker | Non-secret model identifier confirmed in catalog |
| `NEARAI_BASE_URL` | Yes | AI adapter | Default `https://cloud-api.near.ai/v1` |
| `NEARAI_API_KEY` | Yes | API/worker | Secret |
| `NEARAI_MODEL` | Yes | API/worker | TEE-verifiable model ID confirmed from catalog metadata |
| `NEARAI_ATTESTATION_REQUIRED` | Yes | API/worker | Boolean, default true; fail closed on missing/invalid attestation |
| `OPENROUTER_BASE_URL` | Yes | AI adapter | Default `https://openrouter.ai/api/v1` |
| `OPENROUTER_API_KEY` | Yes | API/worker | Secret |
| `OPENROUTER_MODEL_JUDGEMENT` | Yes | API/worker | Model ID confirmed in catalog |
| `OPENROUTER_MODEL_GENERATION` | Yes | API/worker | Model ID confirmed in catalog |
| `REPPO_API_KEY` | Optional | API/worker | Secret |
| `REPPO_ENABLED` | Optional | API | Boolean, default false |
| `KITE_ENABLED` | Optional | API/worker | Boolean, default false |
| `KITE_CLI_PATH` | Optional | API/worker | Server config, if approved CLI integration is selected |
| `KITE_ALLOWED_SERVICE_IDS` | Optional | API | Non-secret allowlist |
| `KITE_ALLOWED_ASSETS` | Optional | API | Non-secret allowlist |
| `KITE_MAX_PER_PAYMENT_MINOR` | Optional | API | Numeric hard cap, must be approved in intake |
| `KITE_MAX_TOTAL_MINOR` | Optional | API | Numeric hard cap, must be approved in intake |
| `PRESIDIO_URL` | Yes | API | Private service URL; server-only |
| `PRESIDIO_SERVICE_TOKEN` | Yes | API/Presidio | Secret shared service token |
| `DATA_KEK_BASE64` | Yes | API | Secret 32-byte key-encryption key |
| `AUDIT_SIGNING_PRIVATE_KEY_BASE64` | Yes | API | Secret Ed25519 private key |
| `AUDIT_SIGNING_PUBLIC_KEY_BASE64` | Yes | API | Public verification key |
| `APP_ENV` | Yes | All | `development`, `preview`, `demo`, `production` |
| `ENABLE_DEMO_SHRED` | Yes | API | Boolean; must be false outside demo |
| `CORS_ALLOWED_ORIGINS` | Yes | API | Comma-separated exact origins |
| `API_PUBLIC_URL` | Yes | Web | Client-safe API URL |
| `NEXT_PUBLIC_APP_URL` | Yes | Web | Client-safe frontend URL |
| `MAX_UPLOAD_BYTES` | Yes | API | Default 10485760 |
| `MAX_PDF_PAGES` | Yes | API | Default 40 |
| `AI_MAX_CALLS_PER_RUN` | Yes | API | Default 4 total (1 NEAR AI extraction + up to 2 SERV/OpenRouter calls + 1 repair) |
| `AI_PROVIDER_TIMEOUT_MS` | Yes | API | Default 45000 |
| `GOOGLE_GENAI_API_KEY` | Optional | Demo tooling only | Secret; public narration only; free tier validated before use |
| `DEMO_FIXTURES_ENABLED` | Yes | API | Boolean, preview/demo only |
| `DEMO_ADMIN_USER_ID` | Optional | API | UUID of seeded demo admin; server-only |

`.env.example` contains empty values/placeholders only. Validate all required env at process boot with Zod. Do not log values. Frontend variables must be explicitly allowlisted; never prefix a secret with `NEXT_PUBLIC_`.

---

# 24. Autonomous implementation plan

**Required order:** complete operator intake → early skeletal frontend deployment → core functionality → end-to-end verification → reference-image-led UI implementation → frontend/docs/footer completeness → demo video → final regression and authorized release.

## Phase 0 — Operator Intake / Readiness

**Objective:** collect all required product/access/reference/credential/budget/authority inputs in one consolidated intake.  
**Tasks:** read this package and repository metadata without editing; fill every field in `OPERATOR_INTAKE.md`; inspect reference image(s); validate repository access; verify Vercel, Render and Supabase access; verify OpenServ and partner credentials; confirm no-cost boundaries; confirm preview and production permissions; establish demo audience/output.  
**Files:** update `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `AI_HANDOFF.md`.  
**Tests/evidence:** auth/provider test calls; deployment permission check; secret presence checks (never print values); cost/plan review.  
**Acceptance:** every critical item marked verified; reference image supplied or explicit authorization for agent-generated reference; no unknown production authority; no unbounded cost.  
**Git:** intake docs commit only.  
**Next:** Phase 1. If a critical dependency is missing, request all missing inputs together and do not begin implementation. Optional integrations remain disabled and do not block core work.

## Phase 1 — Repository/platform foundation + skeletal frontend deployment

**Objective:** create the clean monorepo and navigable UI shell; deploy the first preview.  
**Tasks:** inspect clean Git status; scaffold pnpm workspaces; create Next app routes and responsive shell; login placeholder, role-aware nav placeholders, loading/error/empty states clearly marked nonfunctional; API skeleton and health endpoint; configure Vercel frontend and Render API placeholder; configure safe Supabase project and CORS.  
**Expected files:** repo manifests, app shells, route placeholders, CI basics, `.env.example`, initial docs updates.  
**DB/API/UI:** minimal health/profile route; no borrower data seeded beyond safe fixtures.  
**Tests:** lint/typecheck/build; Playwright smoke for route navigation; `/health/live`; verify no secrets bundled.  
**Acceptance:** stable navigable preview URL; exact deployed commit in `AI_HANDOFF.md`; every unfinished control labelled placeholder/disabled; no production credentials/data.  
**Commit:** `feat: establish app shell and preview deployment`.

## Phase 2 — Backend/data/auth foundation

**Objective:** set up database, auth, storage, encryption and job processing.  
**Tasks:** Drizzle schema/migrations; Supabase Auth integration; role middleware; private bucket; encryption envelope service; audit hash/signature core; Postgres jobs queue and worker lease; Presidio service container and custom recognizers; health/readiness.  
**Tests:** migration tests; auth/RBAC; key wrap/unwrap; AES-GCM tamper; audit chain; job lease/retry; private storage.  
**Acceptance:** no public data endpoints; role denial tests pass; test file stored as ciphertext; job resumes after worker restart.  
**Commit:** `feat: add auth data and security foundations`.

## Phase 3 — Core domain behavior and APIs

**Objective:** implement the full domain engine and provider adapters.  
**Tasks:** borrower/facility/doc upload; parsing; redaction review; bounded SERV graph; NEAR AI extraction adapter with attestation verification; OpenRouter judgement/generation routing; terms review; financial inputs; deterministic calculation/scenarios; Circom circuit/proof; manager approval; audit timeline/verify; Reppo and Kite adapters behind feature flags.  
**Tests:** unit + integration per FR; provider contract fixtures; proof mutation tests; concurrency tests.  
**Acceptance:** all MUST HAVE API-level flows pass; unsupported/unavailable providers are explicit; no fake integrations.  
**Commit:** `feat: implement covenant analysis workflow`.

## Phase 4 — Functional frontend integration

**Objective:** connect all screens to real API behavior.  
**Tasks:** upload, job progress, redaction correction, extraction review, financial forms, results, proof status, manager queue, audit, feedback, provider state.  
**Tests:** route/API contract tests; form edge cases; E2E analyst and manager path using temporary consistent UI.  
**Acceptance:** no critical button is inert; all actions produce real API state or are visibly disabled with reason.  
**Commit:** `feat: connect analyst and manager workflows`.

## Phase 5 — End-to-end functionality gate

**Objective:** demonstrate complete MVP functionality before final visual work.  
**Tasks:** seed deterministic synthetic dataset; run all critical E2E and failure tests on deployed preview; inspect provider and privacy logs; fix regressions; confirm proof and audit verifications; verify role isolation.  
**Acceptance:** unit/integration/E2E pass; no unresolved critical/high security issue; exact preview URL/commit and test evidence recorded; preview integrations remain sandbox/dry-run.  
**Commit:** `test: verify primary covenant analysis journeys`.

## Phase 6 — Reference-image-led final UI implementation

**Objective:** implement the real final visual design from supplied image(s).  
**Tasks:** run the required `npx skills add benjitaylor/skills --skill stageshow`; inspect the skill; inspect reference images; record interpretation; implement routes/components/responsive states; apply accessibility and interaction detail. No mockup/approval phase.  
**Tests:** Playwright visual smoke, accessibility checks, regression E2E.  
**Acceptance:** reference-derived design applied; all behaviors preserved; skill status and deviations recorded.  
**Commit:** `feat: implement reference-led product interface`.

## Phase 7 — Frontend and documentation completion

**Objective:** complete the product presentation and documentation.  
**Tasks:** footer/navigation, responsive breakpoints, keyboard/accessibility, metadata/favicon/icons, verified support/privacy/terms links as appropriate, real Documentation/GitHub links only if public, README, all `docs/` guides, operator guide, API/data-model/security docs.  
**Tests:** dead-link scan, no `href="#"`, no inert controls, responsive viewport suite, docs commands verified.  
**Acceptance:** documentation is understandable to users and developers; all links resolve; no false claims; docs and UI match behavior.  
**Commit:** `docs: complete user and developer documentation`.

## Phase 8 — Demo video production

**Objective:** record and deliver a polished <=180-second demo.  
**Tasks:** clean browser profile; seed demo fixtures; Playwright captures real live app behavior; write 90–150 second script; check Google Gemini TTS free availability/quota/terms; generate narration; fallback to free permitted local TTS if required; align cuts and narration; add captions; redact private URLs/secrets; render with FFmpeg; inspect audio/video end-to-end.  
**Outputs:** `artifacts/demo/assay-demo.mp4`, `assay-demo-script.md`, `.srt`, `production-notes.md`.  
**Acceptance:** duration <=180s; narration matches visible actions; no clipped audio, long silent gaps, secrets or private data; media plays from start to end.  
**Commit:** `docs: add reviewed product demo`.

## Phase 9 — Final regression, security and authorized release

**Objective:** final test and deploy only within explicit authority.  
**Tasks:** full test matrix; dependency scan; final security pass; preview smoke; production deploy only if intake explicitly authorizes; otherwise provide staging build and exact release steps.  
**Acceptance:** no unresolved critical/high issues; release commit tagged; deploy URL and smoke evidence recorded; production authority respected.  
**Commit:** `chore: prepare verified release`.

### Internal checkpoint ritual (every phase)

`IMPLEMENT → TEST → INSPECT → FIX → COMMIT → UPDATE AI_HANDOFF.md + docs/BUILD_LOG.md → CONTINUE`.

Phase boundaries are not human approval gates. Stop only for a genuine blocker: indispensable credentials/access unavailable, unsafe data-loss/security risk, provider/dependency unavailable with no safe fallback, budget/scope boundary reached, or action outside exact granted authority. Continue unaffected work wherever possible.

---

# 25. PROJECT_SPEC.md

The full product requirements, functional scope, roles, data constraints and acceptance criteria are maintained in `PROJECT_SPEC.md`. It must be read before any implementation. Its content is included in this package.

# 26. ARCHITECTURE.md

The complete runtime, services, provider routing, storage/encryption, job queue, proof and audit design is maintained in `ARCHITECTURE.md`. Architecture is fixed unless a real compatibility/security blocker is documented and resolved with the operator.

# 27. IMPLEMENTATION_PLAN.md

The phase plan, checkpoint criteria, commits and required sequence are maintained in `IMPLEMENTATION_PLAN.md`. Do not request routine phase approvals.

# 28. AGENTS.md

Persistent coding-agent instructions are maintained in `AGENTS.md`. They are binding for implementation.

# 29. AI_HANDOFF.md

The current state and resumable next task are maintained in `AI_HANDOFF.md`. At blueprint handoff, it is initialized as “not started; waiting for complete intake.”

# 30. Final pre-implementation audit

| Audit item | Status / evidence |
|---|---|
| Product definition and boundaries explicit | PASS — sections 1–2 / PROJECT_SPEC.md |
| MVP scope controlled | PASS — one covenant, synthetic-only, no lending decisions |
| Roles and permissions explicit | PASS — section 3 and permission matrix |
| Main flows and failure states explicit | PASS — section 4 and error matrix |
| Arithmetic deterministic and precise | PASS — section 6 |
| Data model, relationships and sensitivity explicit | PASS — section 7 / docs/DATA_MODEL.md |
| Architecture and stack fixed | PASS — sections 8–9 / ARCHITECTURE.md |
| API endpoints and controls defined | PASS — section 10 / docs/API.md |
| DB transaction/concurrency rules explicit | PASS — section 11 |
| Auth/RBAC and IDOR mitigation explicit | PASS — section 12 |
| Security risks and mitigations documented | PASS — section 13 / docs/SECURITY.md |
| Screens/routes/states/E2E planned | PASS — section 14 |
| Reference images supplied | **PENDING — critical intake blocker** |
| Reference-led direct UI; no mockup gate | PASS — section 15 |
| Stageshow command included | PASS — section 15 |
| External partner endpoint/credential verification | **PENDING — intake; NEAR AI/OpenRouter/SERV keys, credits and attestation require validation** |
| Kite spend boundary | PASS — default disabled; operator must authorize exact cap |
| Reppo privacy and quota boundary | PASS — synthetic-only; current quota verify at intake |
| Payment authority explicit | PASS — no payment absent exact session and spend authority |
| Preview deployment planned early | PASS — Phase 1 |
| Core functionality before final visual work | PASS — Phase 5 before Phase 6 |
| README/docs first-class deliverables | PASS — Phase 7 |
| Demo video <=180 seconds using Playwright/TTS | PASS — Phase 8 |
| Production authority restricted | PASS — preview only by default; production opt-in |
| `AI_HANDOFF.md` + build log updated each checkpoint | PASS — every phase |
| Coding agent start point precise | PASS — below |

## CODING AGENT START POINT

**Exact first task:** Read `AGENTS.md`, `PROJECT_SPEC.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md`, `OPERATOR_INTAKE.md`, `REFERENCE_ASSETS.md`, `DEMO_VIDEO_PLAN.md` and this blueprint. Inspect the repository and Git status without modifying files. Then complete one consolidated **Operator Intake / Readiness Check**: collect all missing product facts, the required UI reference image(s), credentials, account/service permissions, deployment access, budget limits, production authority, data restrictions and demo requirements; verify provider endpoints and current service terms; record each answer/source, required/optional status and verification result in `OPERATOR_INTAKE.md`. Do not begin implementation while a critical input or required reference image is missing. Once intake passes, execute Phase 1 onward autonomously and sequentially, with test/inspect/fix/commit/handoff updates at every checkpoint and no routine approval stops.
