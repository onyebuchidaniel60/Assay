import { describe, expect, it } from "vitest";
import { loadPaymentRuntimeConfig, paymentRuntimeReady } from "../src/lib/payment-config.js";
import { ARC_TESTNET } from "@assay/payments";

describe("payment runtime configuration", () => {
  it("is disabled and not ready by default", () => {
    const config = loadPaymentRuntimeConfig({});
    expect(config.enabled).toBe(false);
    expect(config.executionEnabled).toBe(false);
    expect(config.dryRun).toBe(true);
    expect(config.session.expiresAt).toBeNull();
    expect(paymentRuntimeReady(config)).toBe(false);
  });

  it("accepts a fully bounded Arc Testnet session", () => {
    const config = loadPaymentRuntimeConfig({
      ARC_PAYMENTS_ENABLED: "true",
      PAYMENT_EXECUTION_ENABLED: "true",
      PAYMENT_DRY_RUN: "false",
      PAYMENT_SESSION_EXPIRES_AT: "2099-12-01T00:00:00Z",
      PAYMENT_ALLOWED_PROVIDERS: "lonestar-oracle",
      PAYMENT_ALLOWED_ENDPOINTS: "https://equity.lonestaroracle.xyz/equity",
      PAYMENT_ALLOWED_RECIPIENTS: "0xeF2a4B6756895aAf1374640dcFCD4947959442ab",
      PAYMENT_ALLOWED_NETWORKS: ARC_TESTNET.network,
      PAYMENT_ALLOWED_ASSETS: ARC_TESTNET.usdc,
      PAYMENT_MAX_PER_TX_MINOR: "100000",
      PAYMENT_MAX_TOTAL_MINOR: "500000",
    });
    expect(config.configError).toBeNull();
    expect(paymentRuntimeReady(config)).toBe(true);
    expect(config.session.allowedEndpoints).toEqual(["https://equity.lonestaroracle.xyz/equity"]);
    expect(JSON.stringify(config)).not.toContain("privateKey");
  });

  it("fails closed on a non-Arc network or token", () => {
    const config = loadPaymentRuntimeConfig({
      ARC_NETWORK: "eip155:8453",
      PAYMENT_ALLOWED_NETWORKS: "eip155:8453",
      PAYMENT_ALLOWED_ASSETS: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    });
    expect(config.configError).toContain(ARC_TESTNET.network);
    expect(paymentRuntimeReady(config)).toBe(false);
  });

  it("does not require empty optional values to be present", () => {
    const config = loadPaymentRuntimeConfig({
      PAYMENT_SESSION_EXPIRES_AT: "",
      ARC_TESTNET_PRIVATE_KEY: "",
      ARC_TESTNET_PAYER_ADDRESS: "",
    });
    expect(config.session.expiresAt).toBeNull();
    expect(config.privateKey).toBeUndefined();
    expect(config.payerAddress).toBeUndefined();
  });

  it("selects Arc Mainnet and the standard x402 exact rail when configured", () => {
    const config = loadPaymentRuntimeConfig({
      ARC_PAYMENTS_ENABLED: "true",
      ARC_NETWORK: "eip155:5042",
      ARC_SETTLEMENT_MODEL: "x402-exact",
      ARC_MAINNET_PAYER_ADDRESS: "0xDff5469Ee2DD3f600ED5e216AD89705A08a85491",
      PAYMENT_SESSION_EXPIRES_AT: "2099-12-01T00:00:00Z",
      PAYMENT_ALLOWED_PROVIDERS: "lonestar-oracle",
      PAYMENT_ALLOWED_ENDPOINTS: "https://equity.lonestaroracle.xyz/equity",
      PAYMENT_ALLOWED_RECIPIENTS: "0xeF2a4B6756895aAf1374640dcFCD4947959442ab",
      PAYMENT_ALLOWED_NETWORKS: "eip155:5042",
      PAYMENT_ALLOWED_ASSETS: "0x3600000000000000000000000000000000000000",
    });
    expect(config.configError).toBeNull();
    expect(config.chain).toBe("arc");
    expect(config.settlementModel).toBe("X402_EXACT_ONCHAIN");
    expect(config.network).toBe("eip155:5042");
    expect(config.gatewayWallet).toBe("0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE");
    expect(config.payerAddress).toBe("0xDff5469Ee2DD3f600ED5e216AD89705A08a85491");
    expect(paymentRuntimeReady(config)).toBe(true);
    expect(JSON.stringify(config)).not.toContain("ARC_MAINNET_PRIVATE_KEY");
  });
});
