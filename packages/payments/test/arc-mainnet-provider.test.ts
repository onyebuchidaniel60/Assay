import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { ArcX402ExactProvider } from "../src/arc-mainnet-provider.js";
import { ARC_MAINNET, verifyArcSdkConfig } from "../src/arc-config.js";

/**
 * These are explicit mock-server tests for the standard onchain x402 exact
 * buyer. They do not represent a live Arc Mainnet settlement.
 */

const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const MERCHANT = "0xeF2a4B6756895aAf1374640dcFCD4947959442ab";
const TX_HASH = `0x${"b".repeat(64)}`;
let server: Server | undefined;

function paymentRequired(url: string, gatewayOnly = false) {
  return {
    x402Version: 2,
    resource: { url, mimeType: "application/json" },
    accepts: [
      {
        scheme: "exact",
        network: ARC_MAINNET.network,
        asset: ARC_MAINNET.usdc,
        amount: "50000",
        payTo: MERCHANT,
        maxTimeoutSeconds: 300,
        extra: gatewayOnly
          ? { name: "GatewayWalletBatched", version: "1", verifyingContract: ARC_MAINNET.gatewayWallet }
          : { name: "USDC", version: "2", assetTransferMethod: "eip3009" },
      },
    ],
  };
}

function header(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

async function startServer(handler: Parameters<typeof createServer>[1]): Promise<string> {
  server = createServer(handler);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Mock server did not bind.");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => server!.close((error) => (error ? reject(error) : resolve())));
    server = undefined;
  }
});

describe("Arc Mainnet standard x402 exact provider", () => {
  it("matches the verified Arc Mainnet SDK values", () => {
    const sdk = verifyArcSdkConfig("arc");
    expect(sdk.chainId).toBe(5042);
    expect(sdk.usdc.toLowerCase()).toBe(ARC_MAINNET.usdc.toLowerCase());
    expect(sdk.gatewayWallet.toLowerCase()).toBe(ARC_MAINNET.gatewayWallet.toLowerCase());
    expect(sdk.gatewayDomain).toBe(26);
  });

  it("constructs a mainnet signer and exposes no key", () => {
    const provider = new ArcX402ExactProvider({ privateKey: TEST_KEY });
    expect(provider.settlementModel).toBe("X402_EXACT_ONCHAIN");
    expect(provider.network).toBe("eip155:5042");
    expect(provider.chainId).toBe(5042);
    expect(provider.gatewayWallet).toBeNull();
    expect(provider.payerAddress).toBe("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    expect(JSON.stringify(provider)).not.toContain(TEST_KEY);
  });

  it("selects and signs the standard EIP-3009 option, not Gateway batching", async () => {
    let baseUrl = "";
    let seenSignature = "";
    baseUrl = await startServer((req, res) => {
      if (!req.headers["payment-signature"]) {
        res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/equity`)) });
        res.end("{}");
        return;
      }
      seenSignature = String(req.headers["payment-signature"]);
      res.writeHead(200, {
        "content-type": "application/json",
        "payment-response": header({ success: true, transaction: TX_HASH, network: ARC_MAINNET.network }),
      });
      res.end(JSON.stringify({ price: 123.45 }));
    });
    const provider = new ArcX402ExactProvider({ privateKey: TEST_KEY });
    const requirements = await provider.fetchRequirements({ url: `${baseUrl}/equity` });
    expect(requirements.status).toBe("payment_required");
    if (requirements.status !== "payment_required") throw new Error("Expected a paid endpoint.");
    expect(requirements.quote.accepted.extra).toMatchObject({ assetTransferMethod: "eip3009" });
    const result = await provider.execute({ url: `${baseUrl}/equity`, quote: requirements.quote });
    expect(result.status).toBe("CONFIRMED");
    expect(result.transactionHash).toBe(TX_HASH);
    expect(result.data).toEqual({ price: 123.45 });
    const decoded = JSON.parse(Buffer.from(seenSignature, "base64").toString("utf8"));
    expect(decoded.accepted.network).toBe(ARC_MAINNET.network);
    expect(decoded.accepted.payTo).toBe(MERCHANT);
    expect(decoded.payload.authorization.to).toBe(MERCHANT);
    expect(decoded.payload.authorization.value).toBe("50000");
    expect(decoded.accepted.extra.name).not.toBe("GatewayWalletBatched");
  });

  it("rejects a Gateway-only option instead of silently using the wrong rail", async () => {
    let baseUrl = "";
    baseUrl = await startServer((_req, res) => {
      res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/equity`, true)) });
      res.end("{}");
    });
    const provider = new ArcX402ExactProvider({ privateKey: TEST_KEY });
    await expect(provider.fetchRequirements({ url: `${baseUrl}/equity` })).rejects.toMatchObject({
      code: "X402_OPTION_UNAVAILABLE",
    });
  });

  it("does not offer Gateway deposit/withdraw on the standard rail", async () => {
    const provider = new ArcX402ExactProvider({ privateKey: TEST_KEY });
    await expect(provider.deposit()).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
    await expect(provider.withdraw()).rejects.toMatchObject({ code: "NOT_SUPPORTED" });
  });
});
