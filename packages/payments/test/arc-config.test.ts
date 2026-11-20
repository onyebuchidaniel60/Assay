import { afterEach, describe, expect, it } from "vitest";
import { ARC_TESTNET, readArcSdkConfig, verifyArcSdkConfig } from "../src/arc-config.js";
import { ArcCircleGatewayProvider } from "../src/arc-provider.js";

const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const TEST_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

describe("verified Arc Testnet configuration", () => {
  it("matches the official Circle SDK values", () => {
    const sdk = readArcSdkConfig();
    expect(sdk.chainId).toBe(ARC_TESTNET.chainId);
    expect(sdk.usdc.toLowerCase()).toBe(ARC_TESTNET.usdc.toLowerCase());
    expect(sdk.gatewayWallet.toLowerCase()).toBe(ARC_TESTNET.gatewayWallet.toLowerCase());
    expect(sdk.gatewayDomain).toBe(ARC_TESTNET.gatewayDomain);
    expect(() => verifyArcSdkConfig()).not.toThrow();
  });

  it("constructs a signer without exposing the private key", () => {
    const provider = new ArcCircleGatewayProvider({ privateKey: TEST_KEY });
    expect(provider.payerAddress?.toLowerCase()).toBe(TEST_ADDRESS.toLowerCase());
    expect(provider.signingKeyConfigured).toBe(true);
    expect(JSON.stringify(provider)).not.toContain(TEST_KEY);
  });

  it("fails closed for a wrong network, asset or Gateway Wallet", () => {
    expect(() => new ArcCircleGatewayProvider({ network: "eip155:8453" })).toThrow(/only supports/);
    expect(() => new ArcCircleGatewayProvider({ asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" })).toThrow(/USDC/);
    expect(() =>
      new ArcCircleGatewayProvider({ gatewayWallet: "0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE" }),
    ).toThrow(/Gateway Wallet/);
  });

  it("refuses an arbitrary facilitator unless explicitly allowed for isolated tests", () => {
    expect(() => new ArcCircleGatewayProvider({ facilitatorUrl: "https://evil.example" })).toThrow(/custom facilitator/);
  });
});
