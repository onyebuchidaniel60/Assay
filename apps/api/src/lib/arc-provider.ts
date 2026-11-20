import { ArcCircleGatewayProvider } from "@assay/payments";
import type { PaymentRuntimeConfig } from "./payment-config.js";

export function createArcProvider(config: PaymentRuntimeConfig): ArcCircleGatewayProvider {
  return new ArcCircleGatewayProvider({
    ...(config.privateKey ? { privateKey: config.privateKey } : {}),
    ...(config.payerAddress ? { payerAddress: config.payerAddress } : {}),
    rpcUrl: config.rpcUrl,
    facilitatorUrl: config.facilitatorUrl,
    requestTimeoutMs: config.requestTimeoutMs,
  });
}
