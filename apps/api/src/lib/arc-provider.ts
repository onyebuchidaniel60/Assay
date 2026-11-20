import { ArcCircleGatewayProvider, ArcX402ExactProvider, type PaymentProvider } from "@assay/payments";
import type { PaymentRuntimeConfig } from "./payment-config.js";

export function createArcProvider(config: PaymentRuntimeConfig): PaymentProvider {
  if (config.settlementModel === "X402_EXACT_ONCHAIN") {
    return new ArcX402ExactProvider({
      ...(config.privateKey ? { privateKey: config.privateKey } : {}),
      ...(config.payerAddress ? { payerAddress: config.payerAddress } : {}),
      rpcUrl: config.rpcUrl,
      requestTimeoutMs: config.requestTimeoutMs,
    });
  }
  return new ArcCircleGatewayProvider({
    chain: config.chain,
    ...(config.privateKey ? { privateKey: config.privateKey } : {}),
    ...(config.payerAddress ? { payerAddress: config.payerAddress } : {}),
    rpcUrl: config.rpcUrl,
    facilitatorUrl: config.facilitatorUrl,
    requestTimeoutMs: config.requestTimeoutMs,
  });
}
