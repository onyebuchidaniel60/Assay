#!/usr/bin/env node
/**
 * Explicit operator deposit into Circle Gateway on Arc Testnet.
 *
 * Usage:
 *   ARC_TESTNET_PRIVATE_KEY=0x... node scripts/arc-gateway-deposit.mjs --amount 0.50 --confirm
 *
 * There is no automatic deposit path in the application. This script refuses to
 * run without --confirm and refuses a non-testnet configuration.
 */
import { ArcCircleGatewayProvider } from "../packages/payments/dist/index.js";

const args = process.argv.slice(2);
const amountIndex = args.indexOf("--amount");
const amount = amountIndex >= 0 ? args[amountIndex + 1] : undefined;
const confirmed = args.includes("--confirm");
if (!amount || !/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
  console.error("Provide --amount with a positive decimal USDC amount.");
  process.exit(2);
}
if (!confirmed) {
  console.error("Refusing to deposit without --confirm. This moves testnet USDC into the Gateway Wallet.");
  process.exit(2);
}
if (!process.env.ARC_TESTNET_PRIVATE_KEY) {
  console.error("ARC_TESTNET_PRIVATE_KEY is required.");
  process.exit(2);
}
const provider = new ArcCircleGatewayProvider({
  privateKey: process.env.ARC_TESTNET_PRIVATE_KEY,
  ...(process.env.ARC_TESTNET_RPC_URL ? { rpcUrl: process.env.ARC_TESTNET_RPC_URL } : {}),
  ...(process.env.CIRCLE_GATEWAY_FACILITATOR_URL ? { facilitatorUrl: process.env.CIRCLE_GATEWAY_FACILITATOR_URL } : {}),
});
const before = await provider.getBalances();
const result = await provider.deposit(amount);
const after = await provider.getBalances();
console.log(JSON.stringify({ before, result, after }, null, 2));
