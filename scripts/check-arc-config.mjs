#!/usr/bin/env node
/**
 * Read-only Arc Testnet diagnostics. Prints verified configuration and, when a
 * payer address is configured, the public Gateway balance. Never prints a key.
 */
import {
  ARC_TESTNET,
  ArcCircleGatewayProvider,
  readArcSdkConfig,
} from "../packages/payments/dist/index.js";

const provider = new ArcCircleGatewayProvider({
  ...(process.env.ARC_TESTNET_PRIVATE_KEY ? { privateKey: process.env.ARC_TESTNET_PRIVATE_KEY } : {}),
  ...(process.env.ARC_TESTNET_PAYER_ADDRESS ? { payerAddress: process.env.ARC_TESTNET_PAYER_ADDRESS } : {}),
  ...(process.env.ARC_TESTNET_RPC_URL ? { rpcUrl: process.env.ARC_TESTNET_RPC_URL } : {}),
  ...(process.env.CIRCLE_GATEWAY_FACILITATOR_URL ? { facilitatorUrl: process.env.CIRCLE_GATEWAY_FACILITATOR_URL } : {}),
});

const output = {
  verifiedConfig: {
    expected: ARC_TESTNET,
    sdk: readArcSdkConfig(),
  },
  provider: provider.toJSON(),
  facilitator: await provider.getFacilitatorStatus(),
  balances: provider.payerAddress ? await provider.getBalances().catch((error) => ({ error: error.message })) : null,
};

console.log(JSON.stringify(output, null, 2));
