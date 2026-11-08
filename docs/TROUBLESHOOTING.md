# Troubleshooting guide

This guide specifies expected diagnostics; exact run commands must match the implemented repository scripts and must be verified before documentation is finalized.

| Symptom | Likely cause | Safe diagnosis | Recovery |
|---|---|---|---|
| App not ready | DB unavailable/migration missing | Check readiness and sanitized logs | Restore DB connectivity; run approved migration sequence |
| Login fails | Auth origin/secret/cookie mismatch | Check base URL, cookie flags and secret presence (never print secret) | Correct environment and rotate if compromised |
| Upload rejected | Invalid file, size or policy | Inspect sanitized validation code and file metadata | Provide supported unencrypted text PDF within configured limits |
| Processing stuck | Queue/worker/scanner unavailable | Inspect job state, worker health and queue age | Restart only failed service; retry idempotently |
| Scanner unavailable | ClamAV down | Health-check scanner and worker log | Keep document quarantined; restore scanner; do not bypass scan |
| PDF has no usable text | Scanned/encrypted/unsupported PDF | Inspect parser diagnostics and page text availability | Mark NEEDS_REVIEW; human provides supported accessible text/source; OCR is outside MVP |
| AI response malformed | Provider/model/schema or transient issue | Inspect request ID, model ID, sanitized error and schema result | Retry only transient failures within capped policy; otherwise NEEDS_REVIEW |
| Model ID mismatch | Provider fallback or invalid config | Compare configured ID to returned ID/catalog | Reject output; validate available model and operator-authorized config |
| Covenant result indeterminate | Missing/ambiguous definition or evidence | Inspect checklist and source references | Resolve through human review; do not guess |
| Approval invalidated | Dependency version changed | Compare approval snapshot with current dependency versions | Reassess and request new approval |
| Presigned download fails | Wrong S3 endpoint/region/clock/permissions | Inspect sanitized S3 error and expiry | Correct region/clock/credentials; mint new short-lived URL after permission check |
| Audit verify fails | Event modified/reordered/incorrect canonicalization | Preserve evidence; inspect hash version/head and event sequence | Treat as integrity incident; never rebuild/overwrite history to hide it |
| Preview inaccessible | DNS/firewall/TLS/Caddy | Verify DNS, 80/443 exposure and Caddy certificate logs | Fix within explicit preview/network authority; do not open DB/parser ports |
| Disk/memory pressure | Documents, logs or parser workload | Inspect metrics and bounded job queues | Apply configured retention/limits; scale only within budget authority |

All troubleshooting must preserve documents, audit records and evidence. Never disable authorization, antivirus, verification or TLS as a workaround.
