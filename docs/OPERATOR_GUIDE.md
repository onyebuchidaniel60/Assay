# Operator Guide

## Safe use of the MVP

Use synthetic borrower identities and synthetic agreement/financial fixtures only. Do not upload real borrower agreements, personal data, bank statements or customer information. The MVP is not cleared for live credit operations.

## Analyst workflow

1. Sign in using an invited staff account.
2. Create a synthetic borrower and facility.
3. Upload a text-based PDF or TXT agreement within the documented limits.
4. Review every redaction and confirm before extraction.
5. Review the extracted covenant threshold, definitions, permitted add-backs and source quotes. Correct any mistake.
6. Enter total debt, EBITDA and permitted add-back amounts from the synthetic test fixture. Confirm currency and attest to input values.
7. Optionally review the external-evidence plan. Link a public ticker/CIK only if it is genuinely the intended public reference; retrieve free SEC evidence or request a paid quote. A paid quote is not a payment; authorise only a policy-approved quote and only when execution is enabled.
8. Run calculation and inspect baseline and two stress scenarios.
9. Submit eligible compliant result to manager review.

## External-evidence and payment operations

- Free SEC evidence: requires `SEC_EDGAR_USER_AGENT`. The current host is blocked by SEC/Akamai (HTTP 403); do not scrape around it or fabricate data. Probe from the deployed egress.
- Paid providers: provider terms are fetched live and evaluated by the deterministic policy. `POLICY_REJECTED` means no execution. `PROPOSED` means the policy approved the quote but no payment exists yet.
- Authorisation is explicit and distinct from manager approval. It reserves budget and queues `payment.execute`.
- `CONFIRMED` requires a verifiable provider receipt or a reconciled Gateway transfer. `RECONCILIATION_REQUIRED` means look up the original authorization; never press pay again.
- Execution is disabled by default. Do not enable it without an isolated funded test wallet, a new session ID, allowlists, caps and an expiry.
- Do not deploy `ARC_TESTNET_PRIVATE_KEY` to a shared environment without explicit operator key-management authority. The status page works with only a public payer address.
- Deposit/withdraw are manual scripts under `scripts/` and require `--confirm`. The agent never deposits automatically.

## Manager workflow

1. Open Reviews.
2. Inspect proof verification, covenant status and scenario risk flags.
3. If a stress case breaches, acknowledge the risk and add a rationale.
4. Approve or reject. A baseline breach or failed/unverified proof cannot be approved.

## Auditor workflow

Open the audit timeline, inspect event metadata and run chain verification. Auditors do not see raw financial values or original documents by default.

## Privacy and limitations

- Presidio can miss or misclassify entities; analyst review is mandatory.
- Model extraction is a candidate interpretation, not legal advice or an unquestionable truth.
- Deterministic arithmetic proves the formula was applied to the confirmed inputs; it does not prove the figures were accurate.
- ZK proof verifies the defined inequality for a private witness; it does not prove agreement authenticity or input-source truth.
- Hash chain is tamper-evident; it is not an immutable public ledger.
- Demo crypto-shred removes the application-wrapped key for synthetic data; it is not a legal erasure certification.
- Reppo is live for synthetic feedback evaluation. Arc Testnet / Circle Gateway is implemented with deterministic policy and mock-x402 tests; no live paid financial-data retrieval is claimed. SEC EDGAR is implemented but returned HTTP 403 from this host. Never present a policy approval, an HTTP 200 or a blocked provider as a settled payment.

## Support

Use the actual support/contact destination configured by the repository owner. Do not invent an email address or contact link. See `docs/TROUBLESHOOTING.md` for common issues.
