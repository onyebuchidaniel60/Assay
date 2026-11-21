# Assay — final demo script

**Runtime:** 2:57.5  
**Narration:** ElevenLabs `eleven_v4`, voice **George - Warm, Captivating Storyteller** (`JBFqnCBsd6RMkjVDRZzb`)  
**Visuals:** real deployed Assay app, plus the real Arc explorer transaction detail. No mock UI and no fabricated terminal output.

| Time | Section | Narration |
|---|---|---|
| 0:00–0:15 | The problem | Credit teams still piece covenant analysis together from documents, spreadsheets, and screenshots. The numbers may be right, but the trail is hard to verify. Assay makes every figure evidence-linked and every payment bounded by policy. |
| 0:15–0:30 | Workspace | This is the covenant operations workspace: borrowers, facilities, runs, approvals, and audit evidence in one view. The workspace is synthetic by design, with no public signup and no autonomous credit decision. |
| 0:30–0:55 | Analysis | Inside a completed run, Assay shows the confidential inference attestation, the financial snapshot, and the covenant calculation. Baseline leverage is 3.07 times against a 3.50 times threshold, with stress cases beside it. Deterministic code performs the arithmetic. A zero-knowledge proof verifies the private inputs, and a credit manager records the approval. |
| 0:55–1:12 | Privacy | Privacy is enforced before reasoning. Documents are redacted with Presidio, encrypted in private storage under a borrower-specific key, and tokenized. Only structured, extracted data reaches the reasoning model. Audit events are hash-chained and signed. |
| 1:12–1:47 | Agentic payment | For market context, Assay's planner proposed a paid provider, and the analyst selected LoneStar Oracle. LoneStar returned a real x402 requirement: 0.05 USDC on Arc Mainnet, standard exact, EIP-3009. Assay checked provider, endpoint, recipient, network, asset, amount, budget, expiry, and idempotency before signing. One payment was authorized, confirmed by a provider receipt, and the Apple fundamentals were stored as encrypted evidence. |
| 1:47–2:03 | Onchain proof | On Arc Mainnet, the explorer shows a successful transferWithAuthorization of 0.05 USDC from Assay's payer wallet to the verified merchant. The wallet moved from 0.93 to 0.88 USDC. |
| 2:03–2:25 | Evidence | The evidence record carries the source URL, retrieval time, a SHA-256 hash of the raw response, validation status, and the payment intent. Price, analyst target, market cap, P/E, EPS, and the 52-week range are shown as financial facts, not model prose. |
| 2:25–2:43 | Audit and trust | Assay separates policy approval, payment settlement, calculation, proof, and human approval. A timeout becomes reconciliation required, never an automatic retry. The audit chain verifies all thirty-two events for this borrower, including the payment and evidence retrieval. |
| 2:43–2:57 | Closing | Assay: evidence-linked analysis, bounded agentic payments, and an audit trail you can verify. The model interprets. Code calculates. Cryptography proves. A human approves. |

## Facts shown on screen

- Covenant: baseline 3.07x, threshold 3.50x, stress 3.41x and 3.37x, `COMPLIANT`.
- Proof: `VERIFIED`, public signals `1 · 35000`, circuit `leverage-v1`.
- Payment: `CONFIRMED`, 0.05 USDC, `eip155:5042`, tx `0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134`.
- Retrieved facts: AAPL price 345.935 USD, analyst target 345.631 USD, market cap 5,027,190,538,240 USD, trailing P/E 38.52, forward P/E 32.72, EPS 8.98, 52-week range 360.83 / 243.42 USD.
- Audit: `VALID:32`, including `PAYMENT_PROPOSED`, `PAYMENT_AUTHORIZED`, `PAYMENT_CONFIRMED`, `EXTERNAL_EVIDENCE_RETRIEVED`.
