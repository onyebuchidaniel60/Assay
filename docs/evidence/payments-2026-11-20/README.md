# Payment and external-data evidence — 20 November 2026

This directory contains the real production evidence for Assay's Arc Mainnet
x402 payment and LoneStar Oracle retrieval. No private key, seed phrase or
credential is stored here.

## Primary evidence

- **[EVIDENCE.md](EVIDENCE.md)** — settlement, provider receipt, authorization
  state, retrieved facts, audit events and screenshot index.
- `lonestar-arc-mainnet-quote.json` — live 402 requirement returned by LoneStar.
- `arc-mainnet-wallet.json` — public payer address and key-file location; no key material.
- `arc-mainnet-funding.json` — funding transaction and balance verification.
- `quote-policy-approved.png` — deployed UI: quote accepted by deterministic policy.
- `authorized-queued.png` — deployed UI: authorized and queued for the worker.
- `live-payment-result.png` — deployed UI: `CONFIRMED`, transaction hash, retrieved evidence.
- `final-run-verified.png` — deployed run after the final redeploy.
- `audit-chain-verified.png` — server-side chain verification: `VALID:32`.
- `deployed-mainnet-status.png` — deployed integration configuration before execution.
- `provider-compatibility.json` — read-only provider/network compatibility.
- `sec-companyfacts.*` and `deployed-sec-attempt.png` — historical SEC EDGAR
  403 evidence from this host; no SEC result was fabricated.

## Dedicated Arc Mainnet payer

- Public address: `0xDff5469Ee2DD3f600ED5e216AD89705A08a85491`
- Private key: `/root/assay-secrets/arc-mainnet-payer.env` (mode 600, outside Git).
  The key was never printed, committed, sent to the frontend or logged.
- Network: `eip155:5042` (Arc Mainnet).
- Token: USDC `0x3600000000000000000000000000000000000000` (6 decimals).
- Settlement: standard onchain x402 `exact`, USDC EIP-3009.
- Merchant: `0xeF2a4B6756895aAf1374640dcFCD4947959442ab`.
- Price: `50000` atomic USDC = `0.05 USDC`.
- Current wallet balance after the single payment: **0.88 USDC**.
- Execution is disabled again (`PAYMENT_EXECUTION_ENABLED=false`,
  `PAYMENT_DRY_RUN=true`) and the session budget is fully spent.

## Historical pre-payment evidence

The earlier Arc Testnet/Circle Gateway policy-rejection and SEC 403 captures are
kept for the build history in this directory. They describe the state before the
operator authorized the narrow Arc Mainnet session and must not be read as the
current production status.

- `arc-policy-rejection.png` — earlier LoneStar quote rejected by the testnet policy.
- `deployed-policy-rejection.png` — earlier deployed policy rejection.
- `deployed-integrations.png` — earlier Arc Testnet / Circle Gateway status.
