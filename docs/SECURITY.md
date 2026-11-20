# Security Architecture and Verification

See `MASTER_BLUEPRINT.md` §13 for the risk/mitigation matrix. This file records the mandatory review checklist.

## Identity and access

- Neon Auth session resolved server-side by Fastify; the current profile status and membership role are loaded from Postgres on every protected request.
- Invite-only accounts; no public signup. Neon Auth `disableSignUp` is enabled and a direct sign-up probe returns `EMAIL_PASSWORD_SIGN_UP_DISABLED`. Staff identities are provisioned by an administrator through Neon, then matched to an active profile/membership.
- Resource ownership, organization scope and role checks run in the API/service layer, not UI alone. Every tenant query is organization-scoped.
- Role-shaped response DTOs prevent raw amount leakage into Manager/Auditor views.

## Data protection

- Synthetic-only MVP.
- Documents encrypted before private object storage.
- Per-borrower DEK wrapped by server-only KEK; token maps and sensitive audit payloads encrypted.
- Presidio review required before any external inference. The deployed service is `REDUCED_PII_MODE` and analyst review is mandatory.
- NEAR AI receives only redacted agreement text for Layer 2 extraction. Each extraction asserts the configured model is `verifiable` and `attestationSupported`, fetches a fresh report with a 32-byte nonce, verifies Intel TDX evidence via `@phala/dcap-qvl`, verifies NVIDIA NRAS, checks the TDX report data binds the response signer + nonce, verifies the response ECDSA signature and both request/response hashes, and checks the compose-manager quote. Any failure blocks terms and leaves a visible failed state.
- OpenRouter receives only structured, already-extracted data for SERV judgement/generation; never raw documents.
- Dolphin is removed and must not be used.
- Reppo payloads contain synthetic/de-identified examples only.
- No raw document, financials, prompts, token map, auth tokens, payment private keys or provider keys in logs.

## Payment and external-evidence controls

- The Arc payer private key is server-side only, read from `ARC_TESTNET_PRIVATE_KEY`, held in ECMAScript private fields, excluded from `toJSON`, never stored in Postgres, never sent to the browser and never logged.
- Payment execution is disabled by default. Live signing requires `PAYMENT_EXECUTION_ENABLED=true` and `PAYMENT_DRY_RUN=false`.
- The provider validates the Arc Testnet chain ID, USDC contract, Gateway Wallet and hosted facilitator against the official Circle SDK values. A mismatch fails closed.
- The deterministic policy checks provider, exact endpoint origin/path, network, USDC asset, recipient, per-payment cap, aggregate budget, session expiry, idempotency and duplicate nonce. No LLM supplies any of these values.
- A policy rejection is persisted and audited and never reaches the execution service. An authorisation locks the session row and reserves budget in the same transaction that queues execution. The worker re-evaluates the full policy against the current session and allowlists immediately before signing; a changed session/cap/allowlist releases the reservation and aborts.
- A timeout or unknown provider result becomes `RECONCILIATION_REQUIRED`. The worker looks up the original nonce/transfer; it never submits a second payment.
- `CONFIRMED` requires a verifiable provider receipt (`PAYMENT-RESPONSE.success === true`) or a reconciled Gateway transfer. A transaction hash is stored only when it is a 32-byte `0x` hash; a settlement UUID is stored separately.
- External evidence is sealed under the borrower DEK, content-hashed, tenant-scoped and role-shaped in API responses. Public-company limitations are stored with the evidence.
- SEC/public-data providers receive only a public ticker/CIK and period. A private borrower is never sent as a public-company lookup.

## Model and file defenses

- PDF/TXT only, 10 MiB max, 40 pages max, text-based PDFs only.
- No arbitrary URL fetching or user-directed tool calls.
- Treat document text as untrusted data; reject prompt instructions embedded in the document.
- Schema validation, evidence page/quote validation and a single bounded repair attempt.
- No model authority over arithmetic, approval, state transitions, permissions or payments.

## Cryptographic controls

- AES-256-GCM with a fresh random 96-bit nonce per encryption under each borrower DEK. A separate HKDF-derived key produces the document content HMAC.
- Per-borrower SHA-256 hash chain over canonical envelope metadata and a ciphertext digest; sealed payloads never need decryption during chain verification.
- Ed25519 signatures using server-held private key.
- Fixed circuit version and verification-key hash; proof bound to the immutable snapshot hash and threshold. The witness is passed to a one-shot proof process over stdin and never written to disk, argv or a table.
- Demo shred requires `APP_ENV=demo`, `ENABLE_DEMO_SHRED=true`, an Admin role, a synthetic `BOR-*` reference and the typed confirmation phrase. The wrapped DEK is deleted; ciphertext remains undecryptable through the application key store.

## Verified controls

Verified locally and on the deployed stack: unauthenticated `/v1/me` returns 401; analyst approval attempt returns 403; manager-only queue; tenant-scoped queries; upload magic-byte/page/scan rejection; role-shaped manager/auditor DTOs; idempotency replay/conflict; versioned run transitions; stressed-breach risk acknowledgement; duplicate approval conflict; signature/hash-chain verification after a real signed event sequence; production-mode shred denial (demo flag).

Phase 9 final evidence: full cross-tenant IDOR matrix `404` on every borrower/facility/document/preview/run/report/redaction/proof/audit route and `403` on shred; malformed/expired/revoked sessions `401`; prompt-injection fixture extracted the true `32500` bps rather than the injected `9999`; forced attestation failure logs contained no document marker, email, account, amount, reference or token-map value; a mutated stored proof returned `422 PROOF_FAILED` and blocked approval with `409`; Gitleaks and `pnpm audit` found no real secret or high/critical dependency. Arc payment-policy and mock-x402 tests cover provider/endpoint/network/asset/recipient/cap/budget/expiry/idempotency/duplicate nonce, receipt confirmation, missing receipt, timeout and no-blind-retry. No live paid retrieval or provider receipt is claimed.

## Incident response

If unauthorized access, raw-data leakage, key compromise, audit tampering or unexplained payments are detected: stop affected processing, disable provider/payment feature flags, preserve safe metadata/evidence, rotate compromised keys through operator-authorized procedure, and notify operator. Do not silently repair or delete the evidence.
