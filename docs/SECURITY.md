# Security Architecture and Verification

See `MASTER_BLUEPRINT.md` §13 for the risk/mitigation matrix. This file records the mandatory review checklist.

## Identity and access

- Signed Supabase JWT verified by API; current profile role checked server-side.
- Invite-only accounts; no public signup.
- Resource ownership and role checks in API/service layer, not UI alone.
- Role-shaped response DTOs prevent raw amount leakage into Manager/Auditor views.

## Data protection

- Synthetic-only MVP.
- Documents encrypted before private object storage.
- Per-borrower DEK wrapped by server-only KEK; token maps and sensitive audit payloads encrypted.
- Presidio review required before any external inference.
- Reppo payloads contain synthetic/de-identified examples only.
- No raw document, financials, prompts, token map, auth tokens or provider keys in logs.

## Model and file defenses

- PDF/TXT only, 10 MiB max, 40 pages max, text-based PDFs only.
- No arbitrary URL fetching or user-directed tool calls.
- Treat document text as untrusted data; reject prompt instructions embedded in the document.
- Schema validation, evidence page/quote validation and a single bounded repair attempt.
- No model authority over arithmetic, approval, state transitions, permissions or payments.

## Cryptographic controls

- AES-256-GCM with unique 96-bit nonce per encryption under each DEK.
- SHA-256 hash chain over canonical metadata and ciphertext.
- Ed25519 signatures using server-held private key.
- Fixed circuit version and verification-key hash; proof bound to immutable input snapshot.
- Demo shred disabled outside demo environment.

## Required security tests

IDOR, role forgery, XSS, SQL injection, upload validation, prompt injection, CORS, token expiry, secret scanning, log redaction, concurrent approval, duplicate payment, audit tampering, proof mutation, and production-mode shred denial.

## Incident response

If unauthorized access, raw-data leakage, key compromise, audit tampering or unexplained payments are detected: stop affected processing, disable provider/payment feature flags, preserve safe metadata/evidence, rotate compromised keys through operator-authorized procedure, and notify operator. Do not silently repair or delete the evidence.
