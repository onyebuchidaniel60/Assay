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
7. Run calculation and inspect baseline and two stress scenarios.
8. Submit eligible compliant result to manager review.

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
- Reppo/Kite integrations are optional and appear disabled when not configured.

## Support

Use the actual support/contact destination configured by the repository owner. Do not invent an email address or contact link. See `docs/TROUBLESHOOTING.md` for common issues.
