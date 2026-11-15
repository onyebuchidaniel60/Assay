# Assay

**Privacy-conscious, AI-assisted covenant monitoring for credit teams.**

Assay helps a credit analyst review one maximum Debt / Adjusted EBITDA covenant from a credit agreement, calculate compliance using deterministic arithmetic, inspect two downside scenarios, and route an eligible result to a manager for approval with a verifiable proof and tamper-evident audit record.

> **MVP limitation:** Assay is a demonstration/workflow prototype using synthetic data only. It is not a lending decision system, legal interpretation service, full credit-underwriting platform or production compliance certification. Do not upload real borrower information.

## What Assay does

1. A credit analyst creates a synthetic borrower and facility.
2. The analyst uploads a text-based PDF or TXT agreement.
3. Assay encrypts the document before private storage, parses its text and uses Presidio to detect/tokenize identifying fields.
4. The analyst reviews redaction before any model call.
5. AI extracts a single Debt / Adjusted EBITDA covenant, its threshold and permitted add-back definitions, with supporting quote/page evidence. Sensitive extraction is routed to NEAR AI Cloud's TEE-attested gateway only after redaction; SERV Reasoning orchestrates the graph and routes structured judgement/generation to OpenRouter. The analyst confirms the result.
6. The analyst enters total debt, reported EBITDA and permitted add-backs.
7. Assay calculates leverage and headroom deterministically, then runs an EBITDA-downside and debt-upside scenario.
8. A fixed ZK circuit proves the baseline inequality when compliant. A manager approves or rejects from a restricted view; proof verification is required before approval.
9. Assay records material events in an encrypted, signed hash chain that can be verified.

## What Assay does not do

- It does not decide whether to lend, underwrite the borrower or recommend a credit limit.
- It does not support arbitrary covenant families.
- It does not autonomously extract financial statement amounts from any arbitrary document; the analyst enters and attests those values.
- It does not support production borrower data, multi-tenant access, a borrower portal or mobile apps.
- It does not custody funds or make customer payments.
- It does not claim TEE-grade security, legal compliance, absolute zero retention or differential privacy unless separately implemented and verified.

## User roles

- **Credit Analyst:** creates records, uploads agreements, reviews redaction/terms, enters figures and runs analysis.
- **Credit Manager:** sees a limited compliance summary and approves/rejects eligible runs.
- **Auditor:** reads audit metadata, signatures, proof and approval evidence.
- **Workspace Admin:** manages staff access and integration health; no default access to financial content.

## Getting started

The repository is structured as a pnpm monorepo. The implementation team must complete the one-time `OPERATOR_INTAKE.md` before coding. Required access and secrets are never committed to Git.

See:
- [Complete implementation blueprint](MASTER_BLUEPRINT.md)
- [Setup](docs/SETUP.md)
- [Configuration](docs/CONFIGURATION.md)
- [API](docs/API.md)
- [Data model](docs/DATA_MODEL.md)
- [Security](docs/SECURITY.md)
- [Integrations](docs/INTEGRATIONS.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operator guide](docs/OPERATOR_GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Developer quick start

Prerequisites: Node.js 24 LTS, pnpm, Python 3.12 for the Presidio service, Docker where containerized services are used, Circom 2.x and SnarkJS. Neon provides the managed Postgres/Auth layer. Exact patch versions are pinned in lockfiles and image definitions.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

`pnpm dev` starts the Next.js app on `http://localhost:3000` and the Fastify API on `http://localhost:3001`. Neon Postgres/Auth, private S3-compatible storage, encryption, signed audit events, the Postgres job worker and the `REDUCED_PII_MODE` Presidio service are wired. Covenant domain/API routes are the next Phase 3 deliverable. Use `.env.example` as a variable catalogue; copy it to `.env.local` only for local work and never commit the real file. The API validates variables at startup.

Phase 1 preview: **https://assay-guyo5yh6z-uhhh2.vercel.app** (protected by Vercel Authentication). It is a labelled shell, not a live covenant engine.

## Development operating modes

- **Local development:** Next.js shell + Fastify API; synthetic fixtures; provider calls disabled until credentials and adapters are verified.
- **Preview:** Vercel frontend + Render API/Presidio + authorized database; synthetic data only; sandbox providers only; `ENABLE_DEMO_SHRED=false` unless an explicitly authorized demo session requires it.
- **Production:** authorized by the operator, but release remains gated on the full Phase 5/9 test and security matrix. No production deployment is currently claimed.

## Documentation and demo

README and `docs/` are maintained alongside functionality. The final submission includes a real, reviewed demo video under `artifacts/demo/` (maximum 180 seconds), its script, captions and production notes. The video must show real application behavior and must not present fixtures as live provider results.

## Project status

Phases 1–2 are implemented: a pnpm monorepo with a route-complete Next.js shell, Fastify API foundation, Neon Postgres/Auth, private S3-compatible storage, envelope encryption, signed audit chain, Postgres job worker, `REDUCED_PII_MODE` Presidio service, CI and tests. NEAR AI, OpenRouter and SERV live checks passed; Kite testnet is enabled with the payment path provider-blocked. The protected Vercel Phase 1 preview remains online. Phase 3 domain/API routes are next. Check `docs/BUILD_LOG.md` and `AI_HANDOFF.md` for exact evidence.

## License

To be selected by the repository owner before public release. Do not invent or add a license without operator authorization.
