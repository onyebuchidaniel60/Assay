# Payment and data compatibility evidence — 20 November 2026

All values below were captured from this environment on 20 November 2026. No secrets, private keys or funded transactions are included.

| File | What it shows |
| --- | --- |
| `arc-config.json` | Arc Testnet SDK constants match the official Circle values; facilitator is reachable and supports `eip155:5042002` USDC. |
| `circle-discovery-financial-arc-testnet.json` | Circle Discovery returned **0** `FINANCIAL_ANALYSIS` services on Arc Testnet (`total: 0`). |
| `circle-discovery-financial-arc-mainnet.json` | Financial-analysis providers with Arc mainnet support (e.g. LoneStar Oracle). |
| `circle-discovery-all-arc-testnet.json` | Full Arc Testnet catalogue (134 entries): Quicknode JSON-RPC and BotPay infrastructure only, no financial-data provider. |
| `sec-companyfacts.status.txt` / `.headers.txt` / `.body.txt` | SEC EDGAR returned HTTP 403 from AkamaiGHost for `CIK0000320193` on this host. No SEC data was fabricated. |
| `arc-policy-rejection.png` | Local UI showing the real LoneStar Oracle quote rejected by the deterministic Arc Testnet policy with `payment_network_forbidden`. |
| `sec-provider-failure.png` | Local UI showing the visible SEC 403 provider failure. |
| `deployed-integrations.png` | Deployed Vercel UI: Arc Testnet / Circle Gateway, DRY RUN, SEC EDGAR, Financial Datasets, LoneStar Oracle, no Kite. |
| `deployed-policy-rejection.png` | Deployed run page showing `POLICY_REJECTED` / `payment_network_forbidden`. |
| `deployed-sec-attempt.png` | Deployed run page showing the Render-side SEC HTTP 403 and no fabricated evidence. |
| `provider-compatibility.json` | Read-only re-check: 0 Arc-Testnet financial-analysis services, 193 Arc-mainnet listings, Financial Datasets Base-mainnet only, LoneStar Oracle Arc-mainnet option. |

## Reproduce

```bash
node scripts/check-arc-config.mjs

curl -sS --compressed \
  "https://api.circle.com/v2/x402/discovery/resources?category=FINANCIAL_ANALYSIS&network=eip155:5042002&limit=200"

curl -sS -D - \
  "https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json" \
  -H "User-Agent: Assay synthetic-data demo (https://github.com/onyebuchidaniel60/Assay; contact: onyebuchidaniel60@users.noreply.github.com)" \
  -H "Accept: application/json" \
  -o /dev/null
```

## Local policy evidence

- Run: `856a437a-0449-4d2e-8cab-024fc0fa8140`
- Payment intent: `86907190-500c-434d-ac4a-73f526aa7a38`
- Status: `POLICY_REJECTED`
- Code: `payment_network_forbidden`
- Network: `eip155:5042` (Arc mainnet)
- Amount: `50000` atomic USDC (0.05 USDC)
- Recipient: `0xeF2a4B6756895aAf1374640dcFCD4947959442ab`
- Execution jobs: none
- Audit chain: `VALID`, 22 events
- SEC failure event: `EXTERNAL_EVIDENCE_FAILED` with `PROVIDER_UNAVAILABLE`
- Render egress SEC probe: HTTP 403 as well; no live SEC evidence
- Deployed build: `https://assay-uhhh2.vercel.app` at `9e9f054`; Render API `https://assay-api-7hy0.onrender.com`
- Runnable testnet payer address (unfunded): `0x16CCd81145AF27fB3Aba157d907611863FDc28E1`
