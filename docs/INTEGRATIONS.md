# Third-party Integrations

## OpenServ SERV Reasoning — mandatory

Use the current OpenServ inference base URL confirmed in public materials: `https://inference-api.openserv.ai/v1`. Verify model catalog, key and credits in the actual account before implementation. SERV is the bounded reasoning layer; application code owns the domain state machine and deterministic checks. Never claim a graph/shadow agent/PromptGuard feature was executed unless account/runtime evidence confirms it.

## Dolphin @dphnAI — required for AI extraction feature

The Assay handoff identifies the hackathon partner as `@dphnAI` and links to `dphn.ai/API`. During intake, verify exact base URL, model ID, OpenAI-compatible behavior, auth, JSON support, rate limits, pricing, retention/no-log/E2EE terms and request-size limits. Current public results for `dolphinllm.com` advertise a different `uncensored` model API; this is not a safe substitute for the hackathon partner. Keep `DOLPHIN_PRIVACY_TERMS_VERIFIED=false` and adapter disabled until verified.

## Reppo — optional

Current public Evaluation API documentation advertises bearer authentication, `POST /api/v1/agents/eval-requests/submit`, `GET /{evalId}`, structured score/decision/confidence/critique/route, 10 free evaluations and then launch pricing of $0.01 per evaluation. Confirm current docs/quota/terms at setup time. Send only synthetic/de-identified content; do not send original credit agreements or actual financials.

## Kite Passport / x402 — optional

Kite documentation describes passkey-approved spending sessions with a per-payment cap, total budget and expiry, and payment for x402 services. Confirm current CLI/SDK commands, testnet, supported assets and catalog services. The deterministic Assay policy engine must check service allowlist, asset, per-payment cap, total remaining budget, session expiry and idempotency. No wallet funding or testnet spend without explicit operator authorization.

## Presidio — mandatory local service

Use Microsoft Presidio Analyzer and Anonymizer. Add custom recognizers for the demo's borrower reference, loan/facility reference and account-like patterns. Analysts must review redaction; unresolved cases block model calls.

## Supabase — mandatory platform dependency

Auth, Postgres and private Storage. Service-role/database secrets remain server-only. Preview and development use separate projects. No public object bucket.

## Google Gemini TTS — demo only

Check current official Gemini TTS model availability and free-tier limits on the day of production. Use only public narration text because Google's free tier may use input for product improvement. No billing/paid plan without permission. If unavailable or unsuitable, use a local free TTS model/tool with checked license.
