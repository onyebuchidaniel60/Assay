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
- No raw document, financials, prompts, token map, auth tokens or provider keys in logs.

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

## Verified controls and required remaining tests

Verified locally: unauthenticated `/v1/me` returns 401; analyst approval attempt returns 403; manager-only queue; tenant-scoped queries; upload magic-byte/page/scan rejection; role-shaped manager/auditor DTOs; idempotency replay/conflict; versioned run transitions; stressed-breach risk acknowledgement; duplicate approval conflict; signature/hash-chain verification after a real signed event sequence; proof public-signal check; production-mode shred denial (demo flag).

Still required before production release: IDOR matrix across every route, XSS review of rendered evidence, SQL-injection probes, prompt-injection fixtures, CORS/token-expiry tests, secret scanning in CI, log-redaction review, concurrent approval stress, Kite duplicate-payment reconciliation, audit-tamper fixtures, proof-mutation fixtures, and a full production-mode shred denial test on the deployed stack.

## Incident response

If unauthorized access, raw-data leakage, key compromise, audit tampering or unexplained payments are detected: stop affected processing, disable provider/payment feature flags, preserve safe metadata/evidence, rotate compromised keys through operator-authorized procedure, and notify operator. Do not silently repair or delete the evidence.
