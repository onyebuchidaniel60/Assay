# Troubleshooting

| Symptom | Likely cause | Safe response |
|---|---|---|
| Frontend cannot reach API | API sleeping, wrong `API_PUBLIC_URL`, CORS mismatch | Check Render service health and exact origin allowlist; do not use wildcard CORS. |
| API readiness fails | DB credentials, Neon pause, migration mismatch | Inspect safe health logs and provider dashboard; never print secrets. |
| Login works but API returns 401 | Expired JWT, wrong Neon project/issuer, JWKS config | Verify token issuer/audience and project config; re-authenticate. |
| User receives 403 | Missing/disabled profile or insufficient role | Check profile role/status through Admin path; do not change role from browser. |
| PDF upload rejected | File too large, wrong magic bytes, >40 pages, scanned/encrypted | Use a text-based PDF/TXT under limits; OCR is out of scope. |
| Redaction service unreachable | Presidio sleep/deploy/token mismatch | Check service health and shared token; no inference request until redaction confirmed. |
| Extraction JSON invalid | Provider JSON mode/format drift or prompt mismatch | Run one schema-repair attempt; then route to manual review; record provider model/version. |
| NEAR AI extraction unavailable | Missing key, starter credit exhausted, model not TEE-verifiable or attestation failed | Keep the run in manual-review state; do not route sensitive text to another provider or claim TEE completion without fresh attestation. |
| OpenRouter judgement/generation unavailable | Missing key, quota, model unavailable or provider error | Keep the SERV node pending/failed visibly; do not substitute a different provider or invent output. |
| SERV status pending | SERV key/credits/model unavailable or call failed | Check account and trace; do not mark graph complete if no SERV node ran. |
| Proof generation fails | Circuit version/key artefact mismatch, invalid witness bounds | Compare circuit version/hash and input commitment; regenerate only for same immutable snapshot. |
| Audit chain fails verification | DB tampering, missing signature/key, serialization drift | Stop approvals for affected borrower; preserve evidence; do not rewrite history. |
| Reppo evaluation pending | Provider queue or polling window | Keep `PENDING`; poll every 60 s within the chosen 10/15/30-minute cap. A timeout is not a verdict. |
| Reppo submission failed | Client payload/key/credits or provider failure | Read `errorCode`/`errorMessage` and the side recorded; do not retry blindly. |
| Arc payment timed out | Unknown settlement state | Set `RECONCILIATION_REQUIRED`; the worker looks up the original nonce/transfer. Never submit a second payment. |
| Arc facilitator unreachable | Cannot verify supported network | Check the active chain config, seller 402 terms and provider status. Mainnet uses the seller facilitator; Testnet uses `CIRCLE_GATEWAY_FACILITATOR_URL`. Payment execution fails closed. |
| Mainnet payment already spent | 50,000/50,000 session cap exhausted | Do not create another session or raise caps without explicit operator authorization. Verify the existing `CONFIRMED` intent and onchain transaction. |
| Arc signing key missing | `PAYMENT_SIGNER_NOT_CONFIGURED` | Set `ARC_MAINNET_PRIVATE_KEY` or `ARC_TESTNET_PRIVATE_KEY` for the selected chain, server-side; keep execution disabled unless an isolated funded wallet and explicit authorization exist. |
| SEC EDGAR HTTP 403 | Akamai blocks the egress IP | Set a descriptive `SEC_EDGAR_USER_AGENT`; probe from the deployed host. Do not scrape around the block or fabricate data. |
| Financial Datasets rejected | Base mainnet only | Do not bridge or relabel. Use an Arc-compatible provider or a licensed API key outside the Arc flow, with explicit disclosure. |
| Demo capture slow | Render free-service sleep or cold Presidio service | Warm preview before capture, then reload from clean browser profile. |
| ElevenLabs narration fails | Key missing permission, voice not found or quota exhausted | Check the exact API error and key permissions. Do not switch provider or voice without operator approval; the final narration uses the approved ElevenLabs voice and `eleven_v4`. |

For every production-like incident, capture request/job IDs and safe error codes, not user payloads. Update `docs/BUILD_LOG.md` for build-related incidents.
