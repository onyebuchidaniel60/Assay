# Archived: Kite Passport / x402 provider-blocked evidence

**Status:** archived 20 November 2026. Kite is no longer an active dependency, route, credential or setup requirement. This file preserves the failed-integration history; it is not an implementation instruction.

## What was attempted

Kite Passport provided passkey-approved spending sessions with a per-payment cap, total budget and expiry. Assay implemented a deterministic local policy and attempted a testnet x402 payment.

### Testnet state — 15 November 2026

- Testnet user: `user_01a1dfab-06b7-7b42-b03c-111a2805c175`.
- Testnet wallet funded with `100 PIEUSD` from the faucet.
- Active session: `agent_session_01a1dfc3-794e-70cb-bde8-90c6315736cf`.
- Delegation: `5 PIEUSD` per transaction, `20 PIEUSD` total, `24h` TTL, asset `PIEUSD`; expired `2026-11-16T15:11:32.17177Z`.
- The deterministic policy enforced the caps before the provider call.

### Provider-blocked evidence

1. `https://passport.dev.gokite.ai/x402/test` (`2026-11-15T15:29:37Z`, idempotency key `assay-kite-smoke-1457e791-3c4f-45f9-ade5-16e0749b117c`) — upstream internal error (`exit 1`, `status: error`, `"internal error"`).
2. `https://x402.dev.gokite.ai/api/weather` (`2026-11-16T07:54:29Z`) — authoritative DNS NODATA across local `systemd-resolved`, Google Public DNS and Cloudflare, all returning `NOERROR` with `ANSWER: 0` and only the `dev.gokite.ai` SOA record from Route53.
3. `https://kite-live-dns.sakurasoga7.workers.dev/v1/dns?name=example.com&type=A` (`2026-11-16T07:55:19Z`, idempotency key `assay-kite-dns-fbe236f8-c046-48a6-a978-9219e9306023`) — direct `GET` returned `HTTP/2 402` with `payment-required` (`eip155:2368`), but `kpass session execute` failed with `payment_target_forbidden` / `sandbox_merchant_not_allowlisted`. The 48-service catalog required mainnet USDC/Tempo rather than testnet `PIEUSD`.
4. The over-cap policy test succeeded: a temporary `0.05 PIEUSD` session rejected a `0.1 PIEUSD` request with `session_rule_exceeded` (exit 6) and no payment event (`spent_total: 0`).

No successful payment, transaction hash or provider receipt was ever obtained. The integration was removed rather than represented as working.

## Replacement

Arc Testnet / Circle Gateway is the active payment rail. See [../PAYMENTS_ARCHITECTURE.md](../PAYMENTS_ARCHITECTURE.md). The old Kite code, env vars, routes, wallet material, UI strings and setup instructions were removed.
