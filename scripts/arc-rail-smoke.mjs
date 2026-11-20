#!/usr/bin/env node
/**
 * Inspect a real x402 endpoint. Optionally pay it in an explicit operator-run
 * smoke test. This is not part of the Assay analysis workflow.
 *
 * Usage:
 *   node scripts/arc-rail-smoke.mjs --url https://x402.quicknode.com/arc-testnet/
 *   ARC_TESTNET_PRIVATE_KEY=0x... node scripts/arc-rail-smoke.mjs --url ... --pay --confirm
 */
import { ArcCircleGatewayProvider } from "../packages/payments/dist/index.js";

const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const url = urlIndex >= 0 ? args[urlIndex + 1] : undefined;
const pay = args.includes("--pay");
const confirmed = args.includes("--confirm");
if (!url) {
  console.error("Provide --url with an x402 resource URL.");
  process.exit(2);
}
if (pay && !confirmed) {
  console.error("Refusing to pay without --pay --confirm. This spends testnet USDC.");
  process.exit(2);
}
const provider = new ArcCircleGatewayProvider({
  ...(process.env.ARC_TESTNET_PRIVATE_KEY ? { privateKey: process.env.ARC_TESTNET_PRIVATE_KEY } : {}),
  ...(process.env.ARC_TESTNET_PAYER_ADDRESS ? { payerAddress: process.env.ARC_TESTNET_PAYER_ADDRESS } : {}),
  ...(process.env.ARC_TESTNET_RPC_URL ? { rpcUrl: process.env.ARC_TESTNET_RPC_URL } : {}),
  ...(process.env.CIRCLE_GATEWAY_FACILITATOR_URL ? { facilitatorUrl: process.env.CIRCLE_GATEWAY_FACILITATOR_URL } : {}),
});
const requirements = await provider.fetchRequirements({ url });
const output = { url, requirements };
if (pay) {
  if (requirements.status !== "payment_required") throw new Error("The endpoint did not return a paid requirement.");
  output.balances = await provider.getBalances();
  output.result = await provider.execute({ url, quote: requirements.quote });
}
console.log(JSON.stringify(output, null, 2));
