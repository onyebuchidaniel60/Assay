import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { ArcCircleGatewayProvider } from "../src/arc-provider.js";
import { ARC_TESTNET } from "../src/arc-config.js";

/**
 * These tests use a local mock x402 resource server. They are explicitly
 * mocks: they prove the buyer-side signing, header and failure handling, not a
 * live Circle settlement. The live testnet test lives in
 * `arc-live-payment.test.ts` and is skipped without funded credentials.
 */

const TEST_KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const MERCHANT = "0x2222222222222222222222222222222222222222";
const TX_HASH = `0x${"a".repeat(64)}`;

let server: Server | undefined;

function paymentRequired(url: string, amount = "50000") {
  return {
    x402Version: 2,
    error: "Payment required",
    resource: { url, mimeType: "application/json" },
    accepts: [
      {
        scheme: "exact",
        network: ARC_TESTNET.network,
        asset: ARC_TESTNET.usdc,
        amount,
        payTo: MERCHANT,
        maxTimeoutSeconds: 300,
        extra: {
          name: "GatewayWalletBatched",
          version: "1",
          verifyingContract: ARC_TESTNET.gatewayWallet,
        },
      },
    ],
  };
}

function header(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

async function startServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<string> {
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

function provider(baseUrl: string, timeoutMs = 2_000) {
  return new ArcCircleGatewayProvider({
    privateKey: TEST_KEY,
    facilitatorUrl: baseUrl,
    allowCustomFacilitator: true,
    requestTimeoutMs: timeoutMs,
  });
}

describe("Arc x402 buyer flow (local mock resource server)", () => {
  it("reads a 402 quote and parses the Arc Gateway option", async () => {
    let baseUrl = "";
    baseUrl = await startServer((_req, res) => {
      res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/paid`)) });
      res.end(JSON.stringify({ error: "Payment required" }));
    });
    const result = await provider(baseUrl).fetchRequirements({ url: `${baseUrl}/paid` });
    expect(result.status).toBe("payment_required");
    if (result.status !== "payment_required") throw new Error("unreachable");
    expect(result.quote.accepted.network).toBe(ARC_TESTNET.network);
    expect(result.quote.accepted.asset).toBe(ARC_TESTNET.usdc);
    expect(result.quote.accepted.payTo).toBe(MERCHANT);
    expect(result.quote.quoteSha256).toHaveLength(64);
  });

  it("rejects a resource URL that does not match the requested endpoint", async () => {
    let baseUrl = "";
    baseUrl = await startServer((_req, res) => {
      const required = paymentRequired("https://evil.example/other");
      res.writeHead(402, { "content-type": "application/json", "payment-required": header(required) });
      res.end("{}");
    });
    await expect(provider(baseUrl).fetchRequirements({ url: `${baseUrl}/paid` })).rejects.toMatchObject({
      code: "PAYMENT_RESOURCE_MISMATCH",
    });
  });

  it("signs the exact Arc Gateway requirement and confirms a verifiable receipt", async () => {
    let baseUrl = "";
    let seenSignature = "";
    let requests = 0;
    baseUrl = await startServer((req, res) => {
      requests += 1;
      const signature = req.headers["payment-signature"];
      if (!signature || typeof signature !== "string") {
        res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/paid`)) });
        res.end(JSON.stringify({ error: "Payment required" }));
        return;
      }
      seenSignature = signature;
      res.writeHead(200, {
        "content-type": "application/json",
        "payment-response": header({
          success: true,
          transaction: TX_HASH,
          network: ARC_TESTNET.network,
          payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        }),
      });
      res.end(JSON.stringify({ revenue: 123456789 }));
    });

    const client = provider(baseUrl);
    const quote = await client.fetchRequirements({ url: `${baseUrl}/paid` });
    if (quote.status !== "payment_required") throw new Error("Expected a paid endpoint.");
    const result = await client.execute({ url: `${baseUrl}/paid`, quote: quote.quote });
    expect(requests).toBe(2);
    expect(result.status).toBe("CONFIRMED");
    expect(result.transactionHash).toBe(TX_HASH);
    expect(result.data).toEqual({ revenue: 123456789 });
    expect(result.nonce).toMatch(/^0x[0-9a-f]{64}$/i);

    const decoded = JSON.parse(Buffer.from(seenSignature, "base64").toString("utf8")) as {
      accepted: { network: string; payTo: string; extra: { verifyingContract: string } };
      payload: { authorization: { to: string; value: string; nonce: string } };
    };
    expect(decoded.accepted.network).toBe(ARC_TESTNET.network);
    expect(decoded.accepted.payTo).toBe(MERCHANT);
    expect(decoded.accepted.extra.verifyingContract).toBe(ARC_TESTNET.gatewayWallet);
    expect(decoded.payload.authorization.to).toBe(MERCHANT);
    expect(decoded.payload.authorization.value).toBe("50000");
    expect(decoded.payload.authorization.nonce).toBe(result.nonce);
  });

  it("does not claim settlement when a 200 response has no payment receipt", async () => {
    let baseUrl = "";
    baseUrl = await startServer((req, res) => {
      if (!req.headers["payment-signature"]) {
        res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/paid`)) });
        res.end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ revenue: 1 }));
    });
    const client = provider(baseUrl);
    const quote = await client.fetchRequirements({ url: `${baseUrl}/paid` });
    if (quote.status !== "payment_required") throw new Error("Expected a paid endpoint.");
    const result = await client.execute({ url: `${baseUrl}/paid`, quote: quote.quote });
    expect(result.status).toBe("RECONCILIATION_REQUIRED");
    expect(result.failureCode).toBe("SETTLEMENT_UNVERIFIED");
    expect(result.transactionHash).toBeNull();
  });

  it("turns a timeout after submission into reconciliation, never a blind retry", async () => {
    let baseUrl = "";
    let requests = 0;
    baseUrl = await startServer((req, res) => {
      requests += 1;
      if (!req.headers["payment-signature"]) {
        res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/paid`)) });
        res.end("{}");
        return;
      }
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ revenue: 1 }));
      }, 300);
    });
    const client = provider(baseUrl, 80);
    const quote = await client.fetchRequirements({ url: `${baseUrl}/paid` });
    if (quote.status !== "payment_required") throw new Error("Expected a paid endpoint.");
    const result = await client.execute({ url: `${baseUrl}/paid`, quote: quote.quote });
    expect(result.status).toBe("RECONCILIATION_REQUIRED");
    expect(result.failureCode).toBe("SUBMISSION_UNKNOWN");
    expect(requests).toBe(2);
  });

  it("maps duplicate_payment to reconciliation instead of paying again", async () => {
    let baseUrl = "";
    let requests = 0;
    baseUrl = await startServer((req, res) => {
      requests += 1;
      if (!req.headers["payment-signature"]) {
        res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/paid`)) });
        res.end("{}");
        return;
      }
      res.writeHead(402, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "duplicate_payment" }));
    });
    const client = provider(baseUrl);
    const quote = await client.fetchRequirements({ url: `${baseUrl}/paid` });
    if (quote.status !== "payment_required") throw new Error("Expected a paid endpoint.");
    const result = await client.execute({ url: `${baseUrl}/paid`, quote: quote.quote });
    expect(result.status).toBe("RECONCILIATION_REQUIRED");
    expect(result.failureCode).toBe("DUPLICATE_PAYMENT");
    expect(requests).toBe(2);
  });

  it("fails an insufficient-balance rejection without a retry", async () => {
    let baseUrl = "";
    let requests = 0;
    baseUrl = await startServer((req, res) => {
      requests += 1;
      if (!req.headers["payment-signature"]) {
        res.writeHead(402, { "content-type": "application/json", "payment-required": header(paymentRequired(`${baseUrl}/paid`)) });
        res.end("{}");
        return;
      }
      res.writeHead(402, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "insufficient_balance" }));
    });
    const client = provider(baseUrl);
    const quote = await client.fetchRequirements({ url: `${baseUrl}/paid` });
    if (quote.status !== "payment_required") throw new Error("Expected a paid endpoint.");
    const result = await client.execute({ url: `${baseUrl}/paid`, quote: quote.quote });
    expect(result.status).toBe("FAILED");
    expect(result.failureCode).toBe("INSUFFICIENT_BALANCE");
    expect(requests).toBe(2);
  });
});
