# Arc payments and external financial evidence

**Status:** implemented; one real Arc Mainnet x402 payment and LoneStar Oracle
retrieval completed on 20 November 2026. Execution is disabled again.
**Last verified:** 21 November 2026.

This document replaces the removed Kite Passport integration. Kite is not an
active dependency, credential or route. Historical Kite notes remain in the
build log and handoff for development history only.

## Two Arc rails, deliberately separate

| | Arc Mainnet | Arc Testnet |
|---|---|---|
| CAIP-2 network | `eip155:5042` | `eip155:5042002` |
| Chain ID | `5042` | `5042002` |
| USDC | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| Settlement | Standard onchain x402 `exact`, USDC EIP-3009 | Circle Gateway batched x402 |
| Provider | `ArcX402ExactProvider` | `ArcCircleGatewayProvider` |
| Selector | `ARC_NETWORK=eip155:5042`, `ARC_SETTLEMENT_MODEL=x402-exact` | `ARC_NETWORK=eip155:5042002`, `ARC_SETTLEMENT_MODEL=circle-gateway` |
| Live use | One authorized 0.05 USDC LoneStar Oracle purchase | Preserved for compatible testnet merchants; no live financial-data merchant was available |

The adapters share the same `PaymentProvider` interface, deterministic policy,
session budget, idempotency, jobs queue, audit events and evidence linkage. A
Mainnet/Testnet mismatch fails closed because the runtime derives the chain from
`ARC_NETWORK` and the provider verifies its own network and asset.

## Implementation map

| Area | Decision | Notes |
| --- | --- | --- |
| Kite SDK / Passport / wallet / sessions | **Removed** | No Kite package, `PIEUSD`, `gokite.ai`, passkey session, wallet, route, environment variable or active setup instruction remains. |
| Deterministic spending policy | **Preserved and generalised** | `packages/domain/src/payment-policy.ts` checks provider, endpoint, network, asset, recipient, per-payment cap, aggregate budget, expiry, idempotency and duplicate nonce. |
| Payment DB records | **Added** | `payment_sessions`, `payment_intents` and `payment_authorizations`. Every proposed, rejected, authorised, submitted, confirmed, failed or reconciled payment is persisted. |
| Payment API routes | **Added** | Run-scoped external-evidence quote, free retrieval, authorise, reconcile and read routes. |
| Frontend | **Updated** | Integrations page shows the active Arc rail, wallet balance, caps, remaining budget and provider compatibility. |
| Audit | **Preserved and extended** | Payment and evidence events use the signed, hash-chained borrower audit trail. |
| Jobs | **Preserved** | Payment execution and reconciliation run on the Postgres `jobs` queue with `FOR UPDATE SKIP LOCKED`. No Redis/Kafka. |
| External data | **Added** | SEC EDGAR, Financial Datasets and LoneStar Oracle adapters; deterministic planner; encrypted evidence linked to an analysis run. |
| Manager approval | **Unchanged** | A manager approval is not a payment authorisation, and a payment authorisation is not a manager approval. |

## Verified Arc Mainnet configuration

| Setting | Value | Verified source |
| --- | --- | --- |
| Chain ID | `5042` | Arc Mainnet RPC `eth_chainId` |
| Network | `eip155:5042` | x402 CAIP-2 network in LoneStar's live 402 response |
| USDC | `0x3600000000000000000000000000000000000000` | Arc contract address and live 402 |
| USDC decimals | `6` | Arc docs and balance check |
| Scheme | `exact` | Live 402 response |
| Transfer method | `eip3009` | Live 402 `extra.assetTransferMethod` |
| Seller facilitator | LoneStar's x402 facilitator | Transaction `from` in the settlement; Circle Gateway is not used on Mainnet |
| Payer | `0xDff5469Ee2DD3f600ED5e216AD89705A08a85491` | Locally derived from the server-side key and checked against config |
| Merchant | `0xeF2a4B6756895aAf1374640dcFCD4947959442ab` | Live 402 `payTo` and merchant metadata |
| Price | `50000` atomic USDC = `0.05 USDC` | Live 402 `amount` |
| Explorer | https://explorer.arc.io | Arc Blockscout |

`packages/payments/src/arc-config.ts` checks the official SDK chain config and
USDC constants at provider construction. `ArcX402ExactProvider` additionally
checks the live quote's network, asset, recipient, amount and EIP-3009 method
before signing.

### Production Mainnet session used for the one authorized payment

| Setting | Value |
| --- | --- |
| Session key | `assay-arc-mainnet-session-2026-11-20` |
| Per-payment cap | `50000` atomic = 0.05 USDC |
| Aggregate cap | `50000` atomic = 0.05 USDC |
| Allowed providers | `lonestar-oracle` |
| Allowed endpoint | `https://equity.lonestaroracle.xyz/equity` |
| Allowed recipient | `0xeF2a4B6756895aAf1374640dcFCD4947959442ab` |
| Allowed network | `eip155:5042` |
| Allowed asset | `0x3600000000000000000000000000000000000000` |
| Execution | enabled only for the authorized window; disabled immediately after settlement |

The 50,000/50,000 caps mean a second payment cannot pass the policy without an
explicit operator change to the session. The spent amount is now 0.05 USDC and
the remaining amount is 0.

### Arc Testnet configuration (preserved)

| Setting | Value |
| --- | --- |
| Chain ID | `5042002` |
| Network | `eip155:5042002` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Gateway Wallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| Gateway Minter | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` |
| Gateway domain | `26` |
| Facilitator | `https://gateway-api-testnet.circle.com` |
| SDK | `@circle-fin/x402-batching@4.0.0` |

The Testnet adapter rejects a network, asset, Gateway Wallet or facilitator that
does not match the verified constants. On 20 November 2026 Circle Discovery
listed zero `FINANCIAL_ANALYSIS` services on Arc Testnet, so the live
financial-data proof uses Mainnet; the Gateway adapter remains available for
compatible testnet merchants.

## Architecture

```
Analyst / bounded workflow
  -> evidence planner (deterministic, no payment authority)
  -> provider quote (real HTTP 402 or free public API)
  -> deterministic payment policy
       -> reject: persist POLICY_REJECTED; never call the execution layer
       -> allow: persist PROPOSED
  -> analyst explicitly authorises
       -> lock payment session row; reserve budget
       -> persist AUTHORIZED + payment_authorizations
       -> enqueue payment.execute on the Postgres jobs table
  -> worker re-evaluates the full policy at execution time
       -> if the session, caps or allowlists changed, release and fail; do not sign
  -> worker signs and submits the x402 authorization
       -> Arc Mainnet: standard EIP-3009 payload, seller facilitator settles
       -> Arc Testnet: Circle Gateway batched payment
       -> CONFIRMED only with a verifiable provider receipt
       -> RECONCILIATION_REQUIRED on timeout/unknown; lookup by nonce, never repay
       -> FAILED on definitive rejection; release the reservation
  -> evidence stored encrypted and linked to the analysis run
  -> signed audit events for proposal, rejection, authorisation, settlement,
     reconciliation, retrieval and failure
```

### Services and files

- `packages/payments/src/arc-mainnet-provider.ts` — `ArcX402ExactProvider`.
- `packages/payments/src/arc-provider.ts` — `ArcCircleGatewayProvider`.
- `packages/payments/src/arc-config.ts` — verified chain constants and SDK checks.
- `packages/domain/src/payment-policy.ts` — pure deterministic policy, no I/O and no LLM input.
- `apps/api/src/lib/payment-service.ts` — session lock, proposal, authorisation, budget reservation and replay.
- `apps/api/src/lib/payment-execution.ts` — worker execution, receipt handling, evidence storage, reconciliation and no-blind-retry behaviour.
- `apps/api/src/lib/evidence-service.ts` — encrypted evidence storage, provenance and audit events.
- `apps/api/src/routes/external-evidence.ts` — analyst/admin APIs for plan, free retrieval, quote, authorise and reconcile.
- `packages/financial-data` — SEC EDGAR, Financial Datasets and LoneStar Oracle adapters plus the deterministic evidence planner.

### Payment statuses

`PROPOSED` → `POLICY_REJECTED` or `AUTHORIZED` → `SUBMITTING` → `CONFIRMED` / `FAILED` / `RECONCILIATION_REQUIRED` → `RECONCILED`.

A policy approval is not a payment receipt. An HTTP 200 is not settlement proof.
`CONFIRMED` requires `PAYMENT-RESPONSE.success === true` on Mainnet or a
reconciled Gateway transfer on Testnet. A transaction hash is stored only if the
provider returns a 32-byte `0x` hash; a Gateway settlement UUID is stored
separately as `providerTransaction`/`transferId`.

### Policy checks

1. Provider allowlist.
2. Endpoint allowlist (origin + path; query selects the data, not the destination).
3. Network allowlist for the active session.
4. Asset allowlist for the active network.
5. Recipient allowlist (exact EVM address, case-insensitive).
6. `exact` scheme only.
7. Maximum amount per transaction.
8. Maximum aggregate session budget (spent + reserved + new amount).
9. Session/authorisation expiry.
10. Required idempotency key.
11. Idempotency conflict detection.
12. Duplicate payment / duplicate nonce rejection.
13. Rejection of a changed quote, recipient, network or amount before signing.

The policy never reads an amount, recipient, token or network supplied by an
LLM. It evaluates the provider's actual 402 requirement and the
operator-managed session row.

### Wallet security

- Mainnet key is read only from `ARC_MAINNET_PRIVATE_KEY`; Testnet key from
  `ARC_TESTNET_PRIVATE_KEY`. Only the key for the selected chain is loaded.
- Keys are held in ECMAScript private class fields and are not serialisable
  through `toJSON`.
- Keys are never sent to the frontend, stored in the database or logged.
- The provider derives the payer address from the key and rejects a mismatched
  configured payer address.
- The signing key is optional; without it, the status page can inspect the
  public payer address and balance but cannot execute a payment.
- Execution is disabled by default; `PAYMENT_EXECUTION_ENABLED=true` and
  `PAYMENT_DRY_RUN=false` are both required.
- The operator disabled execution immediately after the single authorized
  payment; the session budget is exhausted.

## Live LoneStar Oracle payment and retrieval

The fresh 402 response was fetched from
`https://equity.lonestaroracle.xyz/equity?ticker=AAPL` and parsed. The accepted
Arc Mainnet requirement was:

- network `eip155:5042`
- asset `0x3600000000000000000000000000000000000000`
- amount `50000` (0.05 USDC)
- `payTo` `0xeF2a4B6756895aAf1374640dcFCD4947959442ab`
- scheme `exact`
- `extra.assetTransferMethod: eip3009`

The deterministic policy approved the quote, the analyst authorized one
payment, and the worker submitted it. Settlement and retrieval:

- Status `CONFIRMED`
- Transaction `0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134`
- Explorer https://explorer.arc.io/tx/0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134
- Method `transferWithAuthorization`
- USDC transfer of `50,000` atomic (0.05 USDC) to the verified merchant
- `authorizationState(payer, nonce)` = `true`
- Provider receipt `success: true`
- Wallet balance before/after: `0.93` / `0.88` USDC
- Raw response SHA-256 `7c2bd462724ad0b45210f785085cd2471ec36d0fe98e8de90746a648b1483697`
- Evidence `VALID`; Apple facts include price, analyst target, market cap, trailing/forward P/E, EPS, 52-week range and volume
- Audit chain `VALID:32` including `PAYMENT_PROPOSED`, `PAYMENT_AUTHORIZED`, `PAYMENT_CONFIRMED` and `EXTERNAL_EVIDENCE_RETRIEVED`

The full evidence record is
[docs/evidence/payments-2026-11-20/EVIDENCE.md](evidence/payments-2026-11-20/EVIDENCE.md).

## Financial-data provider selection

### LoneStar Oracle EquityScope (live Arc Mainnet provider)

Circle Discovery lists `https://equity.lonestaroracle.xyz/equity` with Base,
Solana, Arc Mainnet (`eip155:5042`) and another EVM option. Its Arc Mainnet
option is USDC `0x3600…0000`, 0.05 USDC, `scheme: exact`, and
`extra.assetTransferMethod: eip3009`. This is **standard onchain x402 exact**,
not Circle Gateway batching.

Assay's response is to sign EIP-3009 against the USDC token, send the standard
x402 payload, verify the seller receipt, and reconcile with
`authorizationState(from, nonce)` if the response is uncertain. The live
payment and retrieval above are the proof.

### Financial Datasets (Base only; not Arc-compatible)

The inspected 402 returns Base mainnet (`eip155:8453`) USDC and Base `payTo`. It
does not offer Arc and does not support Circle Gateway on Arc. Assay implements
the adapter, marks it **not Arc-compatible**, and rejects it at the deterministic
network check. It does not bridge funds, relabel a Base payment as Arc, or claim
integration success. No key is configured.

### SEC EDGAR (free public verification)

The SEC provider resolves a ticker or CIK, fetches `companyfacts` and
`submissions`, extracts annual USD facts deterministically, validates the
requested fiscal year, and stores source URL, reporting period, retrieval time,
content hash and limitations.

From this development host, SEC returned **HTTP 403 from AkamaiGHost** for both
`www.sec.gov/files/company_tickers.json` and
`data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` on 20 November 2026,
even with a descriptive User-Agent and contact. The deployed Render egress
returned the same HTTP 403. The adapter reports `PROVIDER_UNAVAILABLE` rather
than inventing data. Fixture tests exercise the parser and validation; live SEC
retrieval is **not claimed**.

## Evidence linkage

- Evidence is sealed with the borrower's data-encryption key before storage.
- Every record carries source URL, publisher, reporting period, retrieval time,
  SHA-256, validation status/errors, limitations and the linked field.
- The analysis-run page shows why the evidence was proposed, what was retrieved,
  how it is linked, and the explicit limitation that public-company data is not
  proof of a private borrower's position.
- No evidence is auto-substituted into the deterministic covenant calculation.
  The analyst must review and use it explicitly.
- Duplicate content for the same run is prevented by a unique
  `(analysis_run_id, content_sha256)` index.
- The two `EXTERNAL_EVIDENCE_REPROCESSED` audit events record a normalization
  correction derived from the stored raw response. No provider call and no
  payment occurred during reprocessing.

## Reproducing the flow safely

1. Configure the intended chain and settlement model explicitly:
   `ARC_NETWORK=eip155:5042`, `ARC_SETTLEMENT_MODEL=x402-exact`,
   `PAYMENT_ALLOWED_NETWORKS=eip155:5042`,
   `PAYMENT_ALLOWED_ASSETS=0x3600...0000`.
2. Set the provider, endpoint, recipient and a session budget that is no larger
   than the spend you are prepared to authorize.
3. Keep `PAYMENT_EXECUTION_ENABLED=false` and `PAYMENT_DRY_RUN=true` while
   deploying and checking provider status.
4. Fetch a fresh 402 quote through the deployed UI, inspect the network, asset,
   recipient, amount, scheme and EIP-3009 flag, and let the deterministic policy
   evaluate it.
5. Only after explicit operator authorization, enable execution for the narrow
   window, authorize exactly one intent, and disable execution again immediately.
6. Verify the provider receipt, the onchain transfer and the authorization state
   before treating the payment as settled. A timeout is reconciled, never repaid.
7. For Testnet, use the Gateway adapter and fund the testnet payer separately.
   Do not substitute a Mainnet or Base payment for a Testnet proof.

## Honest limitations

1. Only one Arc Mainnet payment was authorized (0.05 USDC). Execution is now
   disabled and the session budget is exhausted.
2. Financial Datasets x402 is Base mainnet only; no key is configured and no Arc
   payment is claimed for it.
3. SEC EDGAR returned HTTP 403 from this host and the earlier Render probe; no
   live SEC result is claimed.
4. The live LoneStar data is public-company market data, not an audited financial
   statement and not proof of a private borrower's position.
5. The audit chain is signed and tamper-evident; it is not claimed immutable
   against a fully compromised signing key.
6. The workspace is synthetic-data only and has no public signup.
7. Payer secrets are local to the server and are excluded from Git, logs,
   screenshots, the frontend and the demo video.
