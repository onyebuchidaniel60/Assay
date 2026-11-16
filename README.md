# <img src="apps/web/public/brand/assay-logo.png" alt="Assay logo" width="72" align="left" /> Assay



**AI-assisted covenant monitoring for credit teams.** The model interprets, deterministic code calculates, ZK proofs verify compliance without exposing figures, and a human approves.

[Live app](https://assay-uhhh2.vercel.app) · [Demo video](https://github.com/onyebuchidaniel60/Assay/releases) · [Docs](docs/)

---

## 🔑 Try it — demo accounts

The app is invite-only and contains **synthetic data only**. Sign in with any of these:

| Role | Email | Password | What you can do |
|---|---|---|---|
| **Analyst** | `analyst@assay.test` | `AnalystDemo2026!` | Upload agreements, review redactions, confirm terms, enter financials, calculate, generate proofs |
| **Manager** | `manager@assay.test` | `ManagerDemo2026!` | Review the restricted compliance summary and approve/reject eligible runs |
| **Auditor** | `auditor@assay.test` | `AuditorDemo2026!` | Inspect the signed audit chain and verify events |

**Fastest path to see it work:** sign in as **Analyst** → open a pre-seeded borrower (e.g. **BOR-018**) → you'll see a completed run with a verified ZK proof and a manager approval in the audit trail.

**To walk the full workflow:** sign in as Analyst in one browser, sign in as Manager in a second incognito window, then submit an analysis and approve it.

> These accounts are seeded fixtures for evaluation. No real borrower data exists in this deployment.





**Covenant operations with evidence, deterministic arithmetic, proof-backed controls and human approval.**

<br clear="left" />

Credit teams still reconcile maximum-leverage covenants across PDFs, spreadsheets and email. Generic AI can summarize a clause, but it cannot be trusted to do the arithmetic, preserve the evidence trail, or decide whether a manager may approve. Assay makes that workflow explicit and auditable using synthetic data only.

## The problem

A single maximum Debt / Adjusted EBITDA covenant requires an analyst to find the right clause, confirm definitions and permitted add-backs, attest the financial figures, calculate leverage and stress cases, and hand a manager a decision they can defend. Most tools compress that into a chat answer with no source binding, no arithmetic control and no approval evidence.

## Who it is for

Credit analysts, credit managers and auditors at a lender or credit fund who need a reviewable covenant workflow. The demonstration uses a synthetic workspace; it is not a production credit decision system.

## What it does

1. **Create a synthetic borrower and facility.** A per-borrower data key and a signed audit chain are created transactionally.
2. **Upload a text-based PDF or TXT agreement.** Assay validates magic bytes, size and page count, rejects scanned or password-protected PDFs, encrypts the bytes and writes only ciphertext to private object storage.
3. **Review redaction.** Presidio runs in a deliberately reduced profile; the analyst confirms the redacted text before any model call.
4. **Extract one covenant.** NEAR AI Cloud extracts a single maximum Debt / Adjusted EBITDA covenant from redacted text. Every request verifies the TEE-verifiable model, fresh Intel TDX and NVIDIA NRAS evidence, nonce binding, the response ECDSA signature and request/response hashes. SERV Reasoning gates the structured branch; the analyst confirms terms and source quotes.
5. **Attest financial inputs.** Total debt, reported EBITDA and permitted add-backs are converted to integer minor units, sealed under the borrower DEK and hashed.
6. **Calculate deterministically.** Decimal arithmetic and an independent BigInt verifier produce the baseline and two stress scenarios. A fixed Groth16 circuit proves the baseline inequality when compliant.
7. **Approve with maker-checker control.** The manager sees a restricted view with no raw amounts or named counterparties. The server re-locks the run and re-verifies the stored proof before one decision is written.
8. **Verify the audit chain.** Per-borrower events are encrypted, hash-chained and Ed25519-signed. The chain remains verifiable after a demo crypto-shred.
9. **Evaluate synthetic feedback.** An analyst correction can be submitted to Reppo as a de-identified field-level trace. The real verdict is displayed; Reppo never approves the covenant.

## Architecture

```mermaid
flowchart LR
  A[Analyst / Manager / Auditor] --> W[Next.js 16 workspace]
  W -->|Neon Auth session| API[Fastify 5 API]
  API --> DB[(Neon Postgres + jobs)]
  API --> S3[(Private S3-compatible storage)]
  API --> P[Presidio REDUCED_PII_MODE]
  API --> N[NEAR AI Cloud\nTDX + NRAS attestation]
  API --> S[SERV Reasoning]
  S --> O[OpenRouter\nstructured judgement]
  API --> R[Reppo Eval Router]
  API --> K[Kite x402 policy]
  API --> Z[Circom / SnarkJS\nfixed leverage circuit]
  DB --> J[Postgres FOR UPDATE SKIP LOCKED worker]
  J --> API
```

- **Deterministic code owns** arithmetic, business rules, approval checks, audit verification and spending policy.
- **No LLM can calculate authoritatively, approve a credit decision or pay.**
- **Postgres is the queue.** No Redis, Kafka or Kubernetes.
- **Provider failures are visible.** There is no fabricated verdict, receipt or proof.

## Track declaration

- **PRIMARY: Open Track**
- **SECONDARY: Reppo** — feedback evaluation is live (one real synthetic evaluation completed: score 98, decision `accept`, confidence `low`, route `review`).
- **SECONDARY: Kite** — deterministic x402 session/cap/asset/expiry policy is implemented and the over-cap rejection is verified. Payment remains **provider-blocked**: the first documented testnet endpoint returned an upstream internal error, and the second (`x402.dev.gokite.ai`) did not resolve (DNS `ENOTFOUND`) on 16 November 2026. No payment is claimed.
- **NOT CLAIMED: Dolphin** — evaluated and rejected because its confidentiality mechanism is unverified: no TEE, no MPC and no verified zero-retention guarantee. No Dolphin adapter, key, endpoint or model is present.

## Security and privacy summary

- Synthetic data only; invite-only accounts; public sign-up disabled at Neon Auth.
- Documents, financial snapshots, scenario details, redaction objects and audit payloads are encrypted with AES-256-GCM under a per-borrower DEK wrapped by a server-side KEK.
- Private object storage holds ciphertext only. No plaintext temporary files.
- Uploaded content is treated as hostile, untrusted data. Extraction uses strict schemas, page/quote validation and a single bounded repair attempt.
- NEAR AI receives only redacted agreement text. Each extraction is bound to fresh, nonce-bound Intel TDX and NVIDIA NRAS attestation and a signed provider response.
- OpenRouter receives structured, already-extracted data only.
- Presidio is a **reduced-model profile**, not full-strength Presidio; analyst review remains mandatory.
- The proof proves the fixed compliance predicate over the submitted witness, not the truth of the source figures.
- The audit chain is signed and tamper-evident; it is not claimed immutable against a fully compromised signing key.
- Reppo receives only field-level, de-identified correction traces, never agreement text, borrower identity, token maps or raw financial figures.

## Quick start

Prerequisites: Node.js 24 LTS, pnpm 10.34.5, Python 3.12 for Presidio, Circom 2.x and SnarkJS for circuit setup. Neon provides Postgres and managed Better Auth.

```bash
git clone https://github.com/onyebuchidaniel60/Assay.git
cd Assay
pnpm install --frozen-lockfile
cp .env.example .env.local   # fill development/test values only; never commit
pnpm --filter @assay/db migrate
pnpm --filter @assay/api dev
pnpm --filter @assay/web dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Presidio: see [docs/SETUP.md](docs/SETUP.md)
- Proof artifacts: `packages/proof/artifacts/`

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for every variable and [docs/SETUP.md](docs/SETUP.md) for the exact verified setup.

## Verified deployment

- **Production:** `https://assay-uhhh2.vercel.app` (public; stable alias of `https://assay-omega-gray.vercel.app`)
- **API health:** `https://assay-api-7hy0.onrender.com/health/live`
- **Presidio:** `https://assay-presidio.onrender.com/health`
- **Demo video:** [public release asset](https://github.com/onyebuchidaniel60/Assay/releases/download/demo-v1/assay-demo-final.mp4) · [local copy](artifacts/demo/assay-demo-final.mp4)
- **Repository:** `https://github.com/onyebuchidaniel60/Assay`

The production deployment is public; the workspace itself requires an invited synthetic account. The public API health endpoint is available for availability checks; the demo video is the primary public walkthrough.

## Documentation

- [Setup](docs/SETUP.md)
- [Configuration](docs/CONFIGURATION.md)
- [API reference](docs/API.md)
- [Data model](docs/DATA_MODEL.md)
- [Security architecture](docs/SECURITY.md)
- [Integrations](docs/INTEGRATIONS.md)
- [Testing and evidence](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operator guide](docs/OPERATOR_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Design notes](docs/DESIGN_NOTES.md)
- [Research notes](docs/RESEARCH_NOTES.md)
- [Build log](docs/BUILD_LOG.md)
- [Submission write-up](docs/SUBMISSION.md)
- [Complete implementation blueprint](MASTER_BLUEPRINT.md)

## Project status

Phases 1–9 are complete and production is deployed at commit `60fac34`: full API and authenticated analyst/manager/auditor workspace, encrypted ingestion, reduced-PII review, attested extraction, deterministic calculation and SERV gate, fixed-circuit proof, maker-checker approval, signed audit chain, Postgres worker, a live Reppo feedback evaluation, Kite policy with a provider-blocked payment path, the logo, a real captured demo, and a passing final regression/security matrix. Evidence is recorded in [AI_HANDOFF.md](AI_HANDOFF.md) and [docs/BUILD_LOG.md](docs/BUILD_LOG.md).

## License and attribution

No open-source license has been selected by the repository owner; do not redistribute the repository or assets without permission. The Assay logo is operator-supplied and committed at `apps/web/public/brand/assay-logo.png`. The four AVIF design inspiration references under `design/reference/` are licensed inspiration only, are Git-ignored, and are not redistributed. Third-party libraries retain their own licenses; see lockfiles and package metadata.
