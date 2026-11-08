# Operator guide — CovenantOps demo environment

This guide is intended for a credit analyst/manager using the synthetic hackathon workspace. It is not a legal, credit-policy or production deployment manual.

## 1. Understand the status labels

- **COMPLIANT:** a supported actual covenant assessment was calculated and independently verified to satisfy the contractual threshold.
- **BREACHED:** a supported actual covenant assessment was calculated and independently verified to violate the contractual threshold.
- **INDETERMINATE:** evidence, contractual definition or verification is insufficient; do not infer compliance or breach.
- **NOT_ASSESSED:** no valid actual assessment exists for the relevant testing period.
- **AT_RISK:** a separate forecast scenario indicates a potential future threshold violation. It is not an actual breach.
- **STALE:** an underlying formula/evidence/document version changed; the prior assessment cannot authorize a new action.

A red warning is not a substitute for reading the underlying reason and verification checklist.

## 2. Onboard a borrower and facility

Create a borrower with a unique internal reference, then create the credit facility under that borrower. Confirm facility currency, agreement date, maturity and amount. Use synthetic information in the demo environment. A borrower may have multiple facilities; covenant obligations are facility-specific.

## 3. Upload documents

Upload an unencrypted text-based PDF within 25 MiB and 200 pages. Choose the correct document category and reporting/as-of period. The platform stores an immutable private version and SHA-256 hash. It scans the document before parsing. A scanned image-only PDF, malformed PDF, encrypted PDF or unavailable scanner/parser will be held for review or rejected; it must not produce a trusted covenant result.

## 4. Review the covenant definition

AI extraction is a proposal, not contractual approval. Check the page and exact source clause, maximum/minimum operator, threshold, required financial inputs, measurement period, exclusions and adjustments. If the agreement contains a complex or ambiguous definition the supported formula DSL cannot represent safely, mark it for review rather than simplifying it. A credit manager activates the exact reviewed version.

## 5. Review financial evidence

Every extracted metric must show its source document, version, page/quote, currency/unit and reporting period. Confirm the metric only when it matches the document and contractual definition. Conflicting or missing values must be resolved before a final actual assessment. Manual evidence requires a reason and reviewer attribution.

## 6. Run an actual assessment

Select the contractual test date and confirmed evidence versions. The platform snapshots the formula and evidence versions, calculates using deterministic decimal arithmetic and independently verifies the result. Inspect the calculation trace and verification checklist. If a result is INDETERMINATE, FAILED, INCOMPLETE or STALE, do not describe it as compliant or breached and do not attempt to bypass the gate.

## 7. Run a forecast scenario

Enter explicit forecast assumptions and horizon. The scenario result is shown separately from actual compliance. A projected threshold violation is AT_RISK; it does not change the actual assessment.

## 8. Manage a breach case

A verified actual breach can create an exception case. Assign an owner, document investigation notes and collect required information. The agent can draft an evidence-backed internal memo. Review every factual assertion and source. A credit manager approves or rejects the exact memo/action version. MVP does not send external notices or execute legal remedies.

## 9. Understand stale approvals

If a source financial figure or covenant definition changes, dependent assessments become stale and pending approvals are invalidated. Reassess using the new version and request a new approval. A historical approved decision remains in the audit trail but cannot authorize a new action against changed evidence.

## 10. Audit and support

Use the audit view to inspect actor, timestamp, entity, version and event hash. The hash chain is tamper-evident but does not independently prove a legal signature or trusted timestamp. If verification fails, preserve the records and escalate; do not rebuild or edit history.

## 11. Demo environment restrictions

Use synthetic test borrowers and documents only. Do not upload real borrower financials, legal agreements or personally identifiable customer data. No payments, external emails, legal notices or production actions are available in the MVP. Report application errors using the request ID; do not share secrets, private signed URLs or unredacted documents.
