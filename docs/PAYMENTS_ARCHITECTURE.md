# Arc payments and external financial evidence

**Status:** implemented and unit/integration tested; **no live paid financial-data retrieval is claimed**.  
**Last verified:** 20 November 2026.

This document replaces the removed Kite Passport integration. Kite is not an active dependency, credential or route. Historical Kite notes remain in the build log and handoff for development history only.

## Implementation map

| Area | Decision | Notes |
| --- | --- | --- |
| Kite SDK / Passport / wallet / sessions | **Removed** | No Kite package, `PIEUSD`, `gokite.ai`, passkey session, wallet, route, environment variable or active setup instruction remains. |
| Deterministic spending policy concepts | **Preserved and generalised** | `packages/domain/src/payment-policy.ts` keeps the `session_rule_exceeded` rejection code and adds provider, endpoint, network, asset, recipient, aggregate-budget, expiry, idempotency and duplicate-nonce checks. |
| Payment DB records | **Replaced / extended** | New `payment_sessions`, `payment_intents` and `payment_authorizations` tables. Every proposed, rejected, authorised, submitted, confirmed, failed or reconciled payment is persisted. |
| Payment API routes | **Replaced** | `/v1/integrations/kite/*` removed. New run-scoped external-evidence quote, authorise, reconcile and read routes. |
| Kite frontend status | **Replaced** | Integrations page now shows Arc Testnet / Circle Gateway, provider compatibility and financial-data providers. No crypto dashboard. |
| Audit | **Preserved and extended** | Payment and evidence events use the existing signed, hash-chained borrower audit trail. |
| Jobs | **Preserved** | Payment execution and reconciliation run on the existing Postgres `jobs` queue with `FOR UPDATE SKIP LOCKED`. No Redis/Kafka. |
| External data | **Added** | SEC EDGAR free provider; Financial Datasets and LoneStar Oracle adapters; deterministic evidence planner; encrypted evidence records linked to an analysis run. |
| Manager approval | **Unchanged** | A manager approval is not a payment authorisation and a payment authorisation is not a manager approval. |

## Verified Arc Testnet configuration

| Setting | Value | Verified source |
| --- | --- | --- |
| Chain ID | `5042002` | Circle Gateway SDK, Arc docs, Circle contract reference |
| Network | `eip155:5042002` | x402 CAIP-2 network and Circle SDK |
| USDC | `0x3600000000000000000000000000000000000000` | Arc contract addresses and Circle SDK `CHAIN_CONFIGS.arcTestnet` |
| USDC decimals (ERC-20) | `6` | Arc docs / Circle SDK |
| Gateway Wallet | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` | Circle Gateway contract reference and Arc docs |
| Gateway Minter | `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B` | Circle Gateway contract reference |
| Gateway domain | `26` | Circle SDK `GATEWAY_DOMAINS.arcTestnet` |
| Hosted testnet facilitator | `https://gateway-api-testnet.circle.com` | Circle buyer quickstart and SDK client |
| SDK | `@circle-fin/x402-batching@4.0.0` | npm and Circle SDK reference |
| Signing | EIP-3009 `TransferWithAuthorization`, EIP-712 domain `GatewayWalletBatched` | Circle EIP-3009 how-to and SDK `BatchEvmScheme` |

`packages/payments/src/arc-config.ts` compares the SDK's own `CHAIN_CONFIGS.arcTestnet` and `GATEWAY_DOMAINS.arcTestnet` against these constants at provider construction. A mismatch throws and prevents signing.

The provider also rejects a custom facilitator unless `allowCustomFacilitator` is explicitly set for an isolated test, and rejects any network, asset or Gateway Wallet other than the verified Arc Testnet values.

## Architecture

```
Analyst / bounded workflow
  -> evidence planner (deterministic, no payment authority)
  -> provider quote (real HTTP 402 or free public API)
  -> PaymentPolicyService (deterministic)
       -> reject: persist POLICY_REJECTED; never call the execution layer
       -> allow: persist PROPOSED
  -> analyst explicitly authorises
       -> lock payment session row; reserve budget
       -> persist AUTHORIZED + payment_authorizations
       -> enqueue payment.execute on the Postgres jobs table
  -> worker executes the signed x402 authorisation
       -> CONFIRMED only with a verifiable provider receipt
       -> RECONCILIATION_REQUIRED on timeout/unknown; lookup by nonce, never repay
       -> FAILED on definitive rejection; release the reservation
  -> evidence stored encrypted and linked to the analysis run
  -> signed audit events for proposal, rejection, authorisation, settlement,
     reconciliation, retrieval and failure
```

### Services and files

- `packages/payments` — `PaymentProvider` interface and `ArcCircleGatewayProvider` using the official Circle SDK and viem.
- `packages/domain/src/payment-policy.ts` — pure deterministic policy, no I/O and no LLM input.
- `apps/api/src/lib/payment-service.ts` — session lock, proposal, authorisation, budget reservation and replay.
- `apps/api/src/lib/payment-execution.ts` — worker execution, receipt handling, evidence storage, reconciliation and no-blind-retry behaviour.
- `apps/api/src/lib/evidence-service.ts` — encrypted evidence storage, provenance and audit events.
- `apps/api/src/routes/external-evidence.ts` — analyst/admin APIs for plan, free retrieval, quote, authorise and reconcile.
- `packages/financial-data` — SEC EDGAR, Financial Datasets and LoneStar Oracle adapters plus the deterministic evidence planner.

### Payment statuses

`PROPOSED` → `POLICY_REJECTED` or `AUTHORIZED` → `SUBMITTING` → `CONFIRMED` / `FAILED` / `RECONCILIATION_REQUIRED` → `RECONCILED`.

A policy approval is not a payment receipt. An HTTP 200 is not settlement proof. `CONFIRMED` requires `PAYMENT-RESPONSE.success === true` or a reconciled Gateway transfer. A transaction hash is stored only if the provider returns a 32-byte `0x` hash; a Gateway settlement UUID is stored separately as `providerTransaction`/`transferId`.

### Policy checks

1. Provider allowlist.
2. Endpoint allowlist (origin + path; query selects the data, not the destination).
3. Network allowlist (`eip155:5042002` by default).
4. Asset allowlist (Arc Testnet USDC contract).
5. Recipient allowlist (exact EVM address, case-insensitive).
6. `exact` scheme only.
7. Maximum amount per transaction.
8. Maximum aggregate session budget (spent + reserved + new amount).
9. Session/authorisation expiry.
10. Required idempotency key.
11. Idempotency conflict detection.
12. Duplicate payment / duplicate nonce rejection.
13. Rejection of a changed quote, recipient, network or amount before signing.

The policy never reads an amount, recipient, token or network supplied by an LLM. It evaluates the provider's actual 402 requirement and the operator-managed session row.

### Wallet security

- Private key is read only from `ARC_TESTNET_PRIVATE_KEY` on the server.
- It is held in ECMAScript private class fields and is not serialisable through `toJSON`.
- It is never sent to the frontend and never stored in the database.
- The provider derives the payer address from the key and rejects a mismatched `ARC_TESTNET_PAYER_ADDRESS`.
- The signing key is optional; without it, the status page can still inspect the public payer address and Gateway balance but cannot execute a payment.
- Execution is disabled by default; `PAYMENT_EXECUTION_ENABLED=true` and `PAYMENT_DRY_RUN=false` are both required.
- Deposit/withdraw are explicit operational scripts, not automatic agent actions.

## Financial-data provider selection

### Financial Datasets (preferred candidate — not Arc-compatible)

The live 402 response was inspected on 20 November 2026:

- `network: eip155:8453` (Base mainnet)
- `asset: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base USDC)
- `payTo: 0xC45E70793C01C6Ae4336dd5a5503baC958d32403`
- `scheme: exact`
- documented licence: Non-Professional unless a Professional plan is purchased

It does **not** offer Arc Testnet and does not support Circle Gateway batching on Arc. Assay therefore:

- implements the provider and quote parser,
- marks it **not Arc-compatible** in the UI and status API,
- rejects it at the deterministic network check,
- does not bridge funds, relabel a Base payment as Arc, or claim an integration success.

An API-key path exists in the adapter, but no `FINANCIAL_DATASETS_API_KEY` is configured in this environment, so no retrieval is claimed.

### LoneStar Oracle EquityScope (Arc-compatible quote, mainnet only)

Circle Discovery lists `https://equity.lonestaroracle.xyz/equity` with:

- Base, Solana and **Arc mainnet** (`eip155:5042`) options,
- Arc mainnet USDC `0x3600000000000000000000000000000000000000`,
- 0.05 USDC per request,
- `scheme: exact`.

This is the closest real third-party financial-data provider with an Arc option. It is **Arc mainnet**, not testnet. Assay's default policy allows only `eip155:5042002`, and no production funds are authorised, so the quote is persisted as `POLICY_REJECTED` with `payment_network_forbidden`. No mainnet payment was made.

### SEC EDGAR (free public verification)

The SEC provider resolves a ticker or CIK, fetches `companyfacts` and `submissions`, extracts annual USD facts deterministically, validates the requested fiscal year, and stores source URL, reporting period, retrieval time, content hash and limitations.

From this development host, SEC returned **HTTP 403 from AkamaiGHost** for both `www.sec.gov/files/company_tickers.json` and `data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json` on 20 November 2026, even with a descriptive User-Agent and contact. The adapter therefore reports `PROVIDER_UNAVAILABLE` rather than inventing data. Fixture tests exercise the parser and validation; the deployed Render host has a different egress and must be probed independently before claiming live SEC retrieval.

### Circle Discovery compatibility finding

On 20 November 2026:

- `category=FINANCIAL_ANALYSIS&network=eip155:5042002` returned **0** services.
- The Arc Testnet catalogue contained only Quicknode JSON-RPC proxies and BotPay infrastructure.
- Financial-analysis providers with Arc support listed **Arc mainnet** (`eip155:5042`), not testnet.

This is the exact reason a live paid financial-data retrieval cannot be demonstrated on Arc Testnet with a genuine third-party financial-data merchant today. The Arc rail itself can be exercised against a compatible testnet merchant such as Quicknode when testnet funds are supplied; that is a payment-rail test, not financial evidence.

## Evidence linkage

- Evidence is sealed with the borrower's data-encryption key before storage.
- Every record carries source URL, publisher, reporting period, retrieval time, SHA-256, validation status/errors, limitations and the linked field.
- The analysis-run page shows why the evidence was proposed, what was retrieved, how it is linked, and the explicit limitation that public-company data is not proof of a private borrower's position.
- No evidence is auto-substituted into the deterministic covenant calculation. The analyst must review and use it explicitly.
- Duplicate content for the same run is prevented by a unique `(analysis_run_id, content_sha256)` index.

## Observed local verification — 20 November 2026

A synthetic run (`856a437a-0449-4d2e-8cab-024fc0fa8140`, BOR-004, `TERMS_CONFIRMED`) was used to exercise the real provider quote and policy path from the local UI.

- The live LoneStar Oracle 402 returned `network: eip155:5042`, `asset: 0x3600…0000`, `amount: 50000` (0.05 USDC), `payTo: 0xeF2a…42ab`.
- Payment intent `86907190-500c-434d-ac4a-73f526aa7a38` was persisted as `POLICY_REJECTED` with `payment_network_forbidden`.
- No `payment.execute` or `payment.reconcile` job was created. The rejected transaction never reached the execution layer.
- Audit events `PAYMENT_POLICY_REJECTED`, `EXTERNAL_EVIDENCE_REQUESTED` and `EXTERNAL_EVIDENCE_FAILED` were appended to the existing signed chain. `POST /v1/borrowers/…/audit/verify` returned `VALID` with 22 events.
- A fixed idempotency key replayed the same quote with `replayed: true`; the same key with a different ticker returned `409 IDEMPOTENCY_CONFLICT`.
- A free SEC request surfaced `PROVIDER_UNAVAILABLE` / `SEC EDGAR returned HTTP 403` in the UI and audit; no evidence was fabricated.
- Screenshots: `docs/evidence/payments-2026-11-20/arc-policy-rejection.png` and `docs/evidence/payments-2026-11-20/sec-provider-failure.png`.

This is a real quote-and-rejection demonstration, not a payment. The testnet payer address generated for a future live test is `0x16CCd81145AF27fB3Aba157d907611863FDc28E1`; it has no funds and no live payment was attempted.

## Honest limitations

1. No Arc-Testnet financial-data merchant was available in Circle Discovery on 20 November 2026.
2. Financial Datasets x402 is Base mainnet only; no key is configured.
3. LoneStar Oracle offers Arc mainnet only; no mainnet spend is authorised.
4. No Arc Testnet USDC was funded in this environment, so the live `arc-live-payment.test.ts` suite is skipped.
5. SEC EDGAR returned HTTP 403 from this host; live SEC retrieval must be re-probed from the deployed Render egress.
6. No transaction hash, transfer ID, provider receipt or successful paid retrieval is fabricated or claimed.
