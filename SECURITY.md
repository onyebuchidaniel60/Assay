# SECURITY.md — Threat model and controls

## Security objectives and trust boundaries
Protect borrower/facility/contract/financial data; prevent cross-tenant access; prevent unsupported covenant declarations; enforce human authorization; preserve traceable records. Browser, public internet, uploaded documents, model output and client-supplied IDs/statuses are untrusted. Worker and web are trusted code with least privilege. DB and Object Storage are sensitive stores. Human approvals are authenticated but must be snapshot-bound.

## Threat and mitigation matrix

| Threat | Required mitigation | Verification |
|---|---|---|
| Brute-force/credential stuffing | Better Auth secure password hashing, rate limit/backoff, generic auth error, HTTPS | Repeated invalid attempts throttle; no account enumeration |
| Invitation token theft/replay | 256-bit random token in URL fragment, hash-only persistence, 72-hour expiry, one-time consume, email match, immediate history cleanup, no third-party scripts/analytics, no-referrer policy, no token logging | Replayed/expired/wrong-email token rejected; concurrent accept has one winner |
| Session theft | Secure/HttpOnly/SameSite cookies, session expiry/revocation, TLS | Cookie flags, logout/password reset revokes session |
| CSRF | SameSite + Origin and CSRF token checks on mutations | Cross-origin mutation rejected |
| IDOR/cross-tenant leakage | org scope on every query/join; membership and permission middleware; IDs are not auth | Swap IDs for every resource from second org; no data leakage |
| Privilege escalation | Server role map; org admin != credit approver; maker-checker | Analyst approval request gets 403; self-approval rejected |
| SQL injection | Drizzle parameterized queries; allowlist filters/sorts; no AI-generated SQL | Injection payload cannot alter query |
| XSS | React escaping; no raw HTML in Markdown; safe URL scheme; CSP | Stored script in borrower/note/memo never executes |
| Malicious PDF/polyglot | PDF magic/MIME checks, 25MB/200-page limits, ClamAV, isolated parser, timeout | EICAR/malformed/oversize/encrypted docs rejected safely |
| Parser exploit/resource exhaustion | Non-root isolated container, read-only FS, no external egress, CPU/memory/PID/time limits | Fuzz/timeout does not impact web/DB |
| SSRF | PDF text parser never fetches embedded links; parser network disabled; no user URL fetch | Embedded URL in PDF is never requested |
| Prompt injection | Source text explicitly untrusted; extraction model has no write tools/secrets; bounded task | “ignore instructions/exfiltrate” text cannot trigger action |
| Hallucinated citation | page must exist; quote must match normalized page text | Invented page/quote rejected |
| Model drift/fallback | Zod schema, prompt version, model response ID equality check, eval | Unknown model fallback flagged; invalid JSON rejected |
| Wrong arithmetic | Decimal DSL, approved formula version, independent recompute, golden tests | Tampered calculation fails verifier |
| Stale/replayed approval | payload hash + dependency versions + idempotency + one-time CAS | Evidence change invalidates pending request; replay rejected |
| Races | DB transactions, optimistic version, row locks, unique constraints | Concurrent approvals produce one decision |
| Secret exposure | runtime server-only secrets, `.env` ignored, redacted logs, bundle scan | sentinel secret absent from build/logs |
| Object-store exposure | private bucket, least-privilege key, auth before short signed URL, no CDN | unauthenticated object read denied; signed link expires |
| Audit modification | append-only events, DB privileges, per-org hash chain, transactional append | payload modification fails chain check |
| Log/telemetry leakage | Pino redaction, no raw document/prompt by default | automated log scan |
| Dependency supply chain | lockfile, patched versions, audit, inspect new skills | dependency scan and exception report |
| VM/network compromise | Vultr Firewall + host firewall, SSH key only, restricted source IP, non-root containers | external port scan confirms only approved ports |
| Backup leak | encrypted backup, private bucket, restricted credentials, restore test | restore into isolated DB and verify |

## Authorization contract
Every business API calls `requireSession`, `requireOrganizationMembership`, `requirePermission`. Service receives `AuthContext(userId, organizationId, role, permissions)`; arbitrary org ID is never authority. Repository methods require org context and include it in every query/join.

- ORG_ADMIN: workspace/member management and authorized read; no inherent credit approval.
- CREDIT_ANALYST: borrower/facility/document/evidence/case/memo create and analysis; no covenant activation/critical approval.
- CREDIT_MANAGER: analyst rights plus covenant activation, critical approval, case assignment/closure and memo approval.
- PORTFOLIO_MANAGER: portfolio/facility/case read; scenario create only if explicit permission; no credit approval default.
- AUDITOR: read-only records and audit verification.
- Platform operator/support: no default customer-content access. Any later support access time-bounded, explicitly authorized and audited.

## Financial integrity
- Input monetary amounts are decimal strings.
- Formula version must be manager-approved and immutable.
- Only confirmed evidence is used.
- Input snapshot and formula hash are retained.
- Verifier recomputes independently.
- AI cannot assign calculation value, breach status, approval status or audit payload.
- Forecast is separately tagged and displayed.

## Document and AI safeguards
- No OCR; scan PDFs require manual review.
- Extract only selected pages/fields; no cross-tenant/cross-facility retrieval.
- Document text is delimited and labelled untrusted.
- No secrets, DB strings, storage credentials or hidden system prompts in model context.
- No privileged tools or arbitrary URL fetch exposed to LLM.
- Model `response.model` must equal requested configured ID. On mismatch fail; do not accept fallback response.
- Invalid output, quote, page, value or schema => NEEDS_REVIEW.

## Web/infrastructure safeguards
- Caddy TLS, HTTPS redirect, HSTS after TLS verified, secure cookies, security headers and CSP.
- Public ports 80/443; SSH restricted; DB/parser/scanner/worker not public.
- No wildcard CORS; same-origin only.
- Rate limits on auth/upload/inference/memo; e.g. initial demo 5 failed logins per 15 min per account/IP, 10 uploads/hour/user, configurable after tests.
- Containers non-root, capabilities dropped, resource limits, pinned images.
- Readiness endpoints disclose generic status only.
- Encrypted daily `pg_dump` private backup; restore test before backup claim.

## Privacy and retention
Hackathon data is synthetic only. This blueprint does not certify Vultr Inference as approved for real confidential lender/borrower documents. Before real data: verify contractual authority, data processing/retention terms, jurisdiction, customer policy, deletion, access control and legal/compliance approval. Demo data retained until operator cleanup; production retention not defined and requires approval. Do not log raw document bodies or full prompts. User offboarding revokes sessions; financial/audit dependencies are archived/retained, not cascade-deleted.

## Security release gate
All auth/RBAC/IDOR tests; CSRF/XSS/injection tests; file and parser tests; prompt injection/citation tests; model mismatch; calculation tamper; approval replay/race/staleness; audit tamper; dependency scan; secret and bundle scan; external port/TLS scan. No unresolved critical/high issue. If restore test not completed, label backup unverified. Production release only if exact action is explicitly authorized in intake.
