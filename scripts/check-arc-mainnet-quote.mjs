#!/usr/bin/env node
/**
 * Read-only Arc Mainnet / LoneStar Oracle quote check. Does not sign or pay.
 * Usage:
 *   ARC_MAINNET_PAYER_ADDRESS=0x... node scripts/check-arc-mainnet-quote.mjs
 */
import { ArcX402ExactProvider } from "../packages/payments/dist/index.js";
import { evaluatePaymentPolicy, paymentRequestFingerprint } from "../packages/domain/dist/index.js";

const payerAddress = process.env.ARC_MAINNET_PAYER_ADDRESS;
if (!payerAddress) {
  console.error("ARC_MAINNET_PAYER_ADDRESS is required.");
  process.exit(2);
}
const endpoint = "https://equity.lonestaroracle.xyz/equity?ticker=AAPL";
const provider = new ArcX402ExactProvider({ payerAddress });
const requirements = await provider.fetchRequirements({ url: endpoint });
if (requirements.status !== "payment_required") {
  console.log(JSON.stringify({ status: requirements.status, note: "No payment required." }, null, 2));
  process.exit(0);
}
const quote = requirements.quote;
const intent = {
  providerId: "lonestar-oracle",
  endpoint,
  requirement: {
    scheme: quote.accepted.scheme,
    network: quote.accepted.network,
    asset: quote.accepted.asset,
    amountMinor: quote.accepted.amount,
    payTo: quote.accepted.payTo,
    maxTimeoutSeconds: quote.accepted.maxTimeoutSeconds,
    ...(quote.accepted.extra ? { extra: quote.accepted.extra } : {}),
  },
};
const fingerprint = paymentRequestFingerprint(intent);
const decision = evaluatePaymentPolicy(
  {
    sessionId: "assay-arc-mainnet-session-1",
    status: "active",
    allowedProviders: ["lonestar-oracle"],
    allowedEndpoints: [endpoint],
    allowedNetworks: ["eip155:5042"],
    allowedAssets: ["0x3600000000000000000000000000000000000000"],
    allowedRecipients: [quote.accepted.payTo],
    maxPerTransactionMinor: "100000",
    maxTotalMinor: "500000",
    spentTotalMinor: "0",
    reservedTotalMinor: "0",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    idempotencyKey: "arc-mainnet-quote-check-2026-11-20",
    requestFingerprint: fingerprint,
    now: new Date(),
  },
  intent,
);
const balances = await provider.getBalances().catch((error) => ({ error: error instanceof Error ? error.message : "balance unavailable" }));
console.log(JSON.stringify({
  capturedAt: new Date().toISOString(),
  payerAddress,
  settlementModel: provider.settlementModel,
  network: quote.accepted.network,
  asset: quote.accepted.asset,
  amountMinor: quote.accepted.amount,
  formattedAmount: `${Number(quote.accepted.amount) / 1_000_000} USDC`,
  payTo: quote.accepted.payTo,
  scheme: quote.accepted.scheme,
  maxTimeoutSeconds: quote.accepted.maxTimeoutSeconds,
  extra: quote.accepted.extra,
  quoteSha256: quote.quoteSha256,
  quoteExpiresAt: quote.expiresAt,
  resourceUrl: quote.resource.url,
  policyDecision: decision,
  balances,
}, null, 2));
