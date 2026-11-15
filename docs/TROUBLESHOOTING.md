# Troubleshooting

| Symptom | Likely cause | Safe response |
|---|---|---|
| Frontend cannot reach API | API sleeping, wrong `API_PUBLIC_URL`, CORS mismatch | Check Render service health and exact origin allowlist; do not use wildcard CORS. |
| API readiness fails | DB credentials, Supabase pause, migration mismatch | Inspect safe health logs and provider dashboard; never print secrets. |
| Login works but API returns 401 | Expired JWT, wrong Supabase project/issuer, JWKS config | Verify token issuer/audience and project config; re-authenticate. |
| User receives 403 | Missing/disabled profile or insufficient role | Check profile role/status through Admin path; do not change role from browser. |
| PDF upload rejected | File too large, wrong magic bytes, >40 pages, scanned/encrypted | Use a text-based PDF/TXT under limits; OCR is out of scope. |
| Redaction service unreachable | Presidio sleep/deploy/token mismatch | Check service health and shared token; no inference request until redaction confirmed. |
| Extraction JSON invalid | Provider JSON mode/format drift or prompt mismatch | Run one schema-repair attempt; then route to manual review; record provider model/version. |
| NEAR AI extraction unavailable | Missing key, starter credit exhausted, model not TEE-verifiable or attestation failed | Keep the run in manual-review state; do not route sensitive text to another provider or claim TEE completion without fresh attestation. |
| OpenRouter judgement/generation unavailable | Missing key, quota, model unavailable or provider error | Keep the SERV node pending/failed visibly; do not substitute a different provider or invent output. |
| SERV status pending | SERV key/credits/model unavailable or call failed | Check account and trace; do not mark graph complete if no SERV node ran. |
| Proof generation fails | Circuit version/key artefact mismatch, invalid witness bounds | Compare circuit version/hash and input commitment; regenerate only for same immutable snapshot. |
| Audit chain fails verification | DB tampering, missing signature/key, serialization drift | Stop approvals for affected borrower; preserve evidence; do not rewrite history. |
| Reppo evaluation pending | Evaluation settlement interval or quota | Poll per current API docs; keep `PENDING`; do not fabricate a score. |
| Kite payment timed out | Unknown settlement state | Set `RECONCILIATION_REQUIRED`; query provider receipt; never blindly retry. |
| Demo capture slow | Render free-service sleep or cold Presidio service | Warm preview before capture, then reload from clean browser profile. |
| TTS quota unavailable | Free-tier rate/availability changed | Use a permitted local TTS fallback; do not enable billing without approval. |

For every production-like incident, capture request/job IDs and safe error codes, not user payloads. Update `docs/BUILD_LOG.md` for build-related incidents.
