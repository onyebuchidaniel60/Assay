# Arc Mainnet x402 payment — verified evidence

Date: 20 November 2026 (UTC)
Environment: production Render API + Vercel frontend
Mode: standard onchain x402 `exact` (USDC EIP-3009), Arc Mainnet

## Authorization

- Authorized amount: **0.05 USDC** (50,000 atomic units)
- Per-payment cap: 0.05 USDC
- Aggregate session cap: 0.05 USDC
- Session: `assay-arc-mainnet-session-2026-11-20`
- Provider: LoneStar Oracle EquityScope
- Endpoint: `https://equity.lonestaroracle.xyz/equity?ticker=AAPL`
- Network: `eip155:5042`
- Asset: USDC `0x3600000000000000000000000000000000000000`
- Recipient: `0xeF2a4B6756895aAf1374640dcFCD4947959442ab`
- Payer: `0xDff5469Ee2DD3f600ED5e216AD89705A08a85491`
- Scheme: `exact`
- Transfer method: EIP-3009 (`extra.assetTransferMethod: eip3009`)

The fresh 402 response was parsed and checked before signing. A second
onchain payment was prevented by the 50,000 atomic-unit session cap.

## Settlement

- Status: **CONFIRMED**
- Transaction: `0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134`
- Explorer: https://explorer.arc.io/tx/0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134
- Block: 32,259,804
- Method: `transferWithAuthorization`
- USDC Transfer log: payer `0xDff5469Ee2DD3f600ED5e216AD89705A08a85491` → recipient
  `0xeF2a4B6756895aAf1374640dcFCD4947959442ab`, amount `50,000` atomic units (0.05 USDC)
- EIP-3009 authorization nonce:
  `0xbe48dd8f6c0579bebf5ad15bf4d02547a209cce7bd592b18cb5ac55b80daf76b`
- `authorizationState(payer, nonce)` on the USDC contract: `true`
- Provider receipt: `{"payer":"0xdff5469ee2dd3f600ed5e216ad89705a08a85491","amount":"50000","network":"eip155:5042","success":true,"transaction":"0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134"}`
- Wallet USDC before: 0.93
- Wallet USDC after: 0.88
- Gas was paid by the seller facilitator; the payer wallet paid only the 0.05 USDC amount.

## Retrieval

- Retrieved at: `2026-11-20T17:42:30.381Z`
- Publisher: LoneStar Oracle
- Kind: `EQUITY_FUNDAMENTALS`, FY2025
- Raw response SHA-256: `7c2bd462724ad0b45210f785085cd2471ec36d0fe98e8de90746a648b1483697`
- Validation status: `VALID`
- Evidence ID: `7a2a8ee0-d78b-40df-9003-229181cf1576`
- Payment intent: `3a972fdf-c09f-49c7-949b-97441e24efe1`
- Analysis run: `856a437a-0449-4d2e-8cab-024fc0fa8140`

Returned Apple Inc. facts (normalized, source-linked):

| Fact | Value |
|---|---:|
| price | 345.935 USD |
| analyst_target | 345.631 USD |
| upside_pct | -0.1 percent |
| market_cap | 5,027,190,538,240 USD |
| pe_trailing | 38.52 ratio |
| pe_forward | 32.72 ratio |
| eps | 8.98 USD |
| week52_high | 360.83 USD |
| week52_low | 243.42 USD |
| day_change_pct | -0.94 percent |
| health_score | 10 score |
| dividend_yield_pct | 0.3 percent |
| volume | 25,839,059 shares |

The raw provider response is stored encrypted with the normalized payload.

## Audit trail

The borrower chain contains the following signed events for this payment:

| Seq | Event |
|---:|---|
| 0027 | PAYMENT_PROPOSED |
| 0028 | PAYMENT_AUTHORIZED |
| 0029 | PAYMENT_CONFIRMED |
| 0030 | EXTERNAL_EVIDENCE_RETRIEVED |
| 0031–0032 | EXTERNAL_EVIDENCE_REPROCESSED (normalization correction from the stored raw response; no provider call and no payment) |

Server-side chain verification: **VALID — 32 events checked** (signatures and
recomputed hash chain both pass).

## Screenshots

- `deployed-mainnet-status.png` — deployed integration status before execution
- `quote-policy-approved.png` — policy-approved quote
- `authorized-queued.png` — authorized and queued
- `live-payment-result.png` — confirmed payment and retrieved evidence
- `final-run-verified.png` — deployed run after the final redeploy
- `audit-chain-verified.png` — audit chain verification for BOR-004
