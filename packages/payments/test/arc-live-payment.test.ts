import { describe, expect, it } from "vitest";
import { ArcCircleGatewayProvider } from "../src/arc-provider.js";

/**
 * This suite is intentionally skipped unless a funded Arc Testnet wallet and a
 * compatible testnet x402 merchant are supplied. It is never replaced by a
 * mock pass. Set:
 *   ARC_LIVE_PAYMENT_TEST=1
 *   ARC_TESTNET_PRIVATE_KEY=0x...
 *   ARC_LIVE_MERCHANT_URL=https://...
 * The wallet must already hold testnet USDC in its Circle Gateway balance.
 */
const enabled =
  process.env.ARC_LIVE_PAYMENT_TEST === "1" &&
  Boolean(process.env.ARC_TESTNET_PRIVATE_KEY) &&
  Boolean(process.env.ARC_LIVE_MERCHANT_URL);

describe.skipIf(!enabled)("live Arc Testnet payment", () => {
  it("inspects the Gateway balance, obtains a real 402, pays and verifies the receipt", async () => {
    const provider = new ArcCircleGatewayProvider({
      privateKey: process.env.ARC_TESTNET_PRIVATE_KEY!,
      ...(process.env.ARC_TESTNET_RPC_URL ? { rpcUrl: process.env.ARC_TESTNET_RPC_URL } : {}),
      ...(process.env.CIRCLE_GATEWAY_FACILITATOR_URL ? { facilitatorUrl: process.env.CIRCLE_GATEWAY_FACILITATOR_URL } : {}),
    });
    const balances = await provider.getBalances();
    expect(BigInt(balances.gateway.available)).toBeGreaterThan(0n);

    const facilitator = await provider.getFacilitatorStatus();
    expect(facilitator.reachable).toBe(true);
    expect(facilitator.supportedNetwork).toBe(true);

    const requirements = await provider.fetchRequirements({ url: process.env.ARC_LIVE_MERCHANT_URL! });
    expect(requirements.status).toBe("payment_required");
    if (requirements.status !== "payment_required") throw new Error("Expected a paid endpoint.");

    const result = await provider.execute({
      url: process.env.ARC_LIVE_MERCHANT_URL!,
      quote: requirements.quote,
    });
    expect(result.status).toBe("CONFIRMED");
    expect(result.transactionHash ?? result.providerTransaction).toBeTruthy();
  }, 120_000);
});
