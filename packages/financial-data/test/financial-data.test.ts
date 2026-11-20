import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FinancialDatasetsProvider } from "../src/financial-datasets.js";
import { LoneStarOracleProvider } from "../src/lonestar.js";
import { planEvidenceNeeds } from "../src/planner.js";
import { SecEdgarProvider } from "../src/sec-edgar.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/sec-companyfacts.json", import.meta.url), "utf8"));
const TICKERS = {
  "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." },
};
const SUBMISSIONS = {
  name: "Apple Inc.",
  cik: "0000320193",
  tickers: ["AAPL"],
  sic: "3571",
  fiscalYearEnd: "0927",
  exchanges: ["NASDAQ"],
};

function jsonResponse(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function secFetch(overrides?: (url: string) => Response | null): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    const override = overrides?.(url);
    if (override) return override;
    if (url.includes("company_tickers.json")) return jsonResponse(TICKERS);
    if (url.includes("/submissions/")) return jsonResponse(SUBMISSIONS);
    if (url.includes("/companyfacts/")) return jsonResponse(fixture);
    return jsonResponse({ error: "unexpected URL" }, 404);
  }) as typeof fetch;
}

describe("SEC EDGAR provider", () => {
  it("retrieves a real-shaped annual revenue fact with provenance", async () => {
    const provider = new SecEdgarProvider({
      userAgent: "Assay test contact@example.test",
      fetchImpl: secFetch(),
      minIntervalMs: 0,
    });
    const result = await provider.retrieve({
      kind: "REVENUE_VERIFICATION",
      ticker: "AAPL",
      fiscalYear: 2025,
      reason: "Independent check of reported revenue.",
    });
    expect(result.validationStatus).toBe("VALID");
    expect(result.data.company.cik).toBe("0000320193");
    expect(result.data.facts[0]).toMatchObject({ tag: "Revenues", value: 400000000000, fiscalYear: 2025 });
    expect(result.sourceUrl).toContain("CIK0000320193.json");
    expect(result.contentSha256).toHaveLength(64);
    expect(result.limitations.join(" ")).toContain("not evidence about a private borrower");
  });

  it("handles an unknown ticker as a private-company/unavailable case", async () => {
    const provider = new SecEdgarProvider({
      userAgent: "Assay test contact@example.test",
      fetchImpl: secFetch(),
      minIntervalMs: 0,
    });
    await expect(
      provider.retrieve({ kind: "COMPANY_FACTS", ticker: "PRIVATE1", reason: "test" }),
    ).rejects.toMatchObject({ code: "COMPANY_NOT_FOUND" });
  });

  it("returns INCOMPLETE when the requested fiscal year has no annual fact", async () => {
    const provider = new SecEdgarProvider({
      userAgent: "Assay test contact@example.test",
      fetchImpl: secFetch(),
      minIntervalMs: 0,
    });
    const result = await provider.retrieve({
      kind: "REVENUE_VERIFICATION",
      ticker: "AAPL",
      fiscalYear: 2030,
      reason: "test",
    });
    expect(result.validationStatus).toBe("INCOMPLETE");
    expect(result.validationErrors[0]).toContain("No annual USD fact");
  });

  it("surfaces malformed provider responses instead of inventing data", async () => {
    const provider = new SecEdgarProvider({
      userAgent: "Assay test contact@example.test",
      fetchImpl: secFetch((url) => (url.includes("/companyfacts/") ? jsonResponse({ facts: {} }) : null)),
      minIntervalMs: 0,
    });
    await expect(
      provider.retrieve({ kind: "COMPANY_FACTS", ticker: "AAPL", reason: "test" }),
    ).rejects.toMatchObject({ code: "MALFORMED_PROVIDER_RESPONSE" });
  });

  it("surfaces SEC rate limits and unavailability", async () => {
    const limited = new SecEdgarProvider({
      userAgent: "Assay test contact@example.test",
      fetchImpl: secFetch((url) => (url.includes("company_tickers.json") ? jsonResponse({}, 429) : null)),
      minIntervalMs: 0,
    });
    await expect(
      limited.retrieve({ kind: "COMPANY_FACTS", ticker: "AAPL", reason: "test" }),
    ).rejects.toMatchObject({ code: "PROVIDER_RATE_LIMITED" });

    const unavailable = new SecEdgarProvider({
      userAgent: "Assay test contact@example.test",
      fetchImpl: secFetch((url) => (url.includes("company_tickers.json") ? jsonResponse({}, 503) : null)),
      minIntervalMs: 0,
    });
    await expect(
      unavailable.retrieve({ kind: "COMPANY_FACTS", ticker: "AAPL", reason: "test" }),
    ).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});

describe("provider compatibility", () => {
  it("records Financial Datasets as Base-mainnet x402 and not Arc-compatible", async () => {
    const url = "https://api.financialdatasets.ai/company/facts?ticker=AAPL";
    const terms = {
      x402Version: 2,
      resource: { url },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          amount: "20000",
          payTo: "0xC45E70793C01C6Ae4336dd5a5503baC958d32403",
          maxTimeoutSeconds: 300,
        },
      ],
    };
    const provider = new FinancialDatasetsProvider({
      apiKey: "",
      fetchImpl: (async () =>
        new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { "payment-required": Buffer.from(JSON.stringify(terms)).toString("base64") },
        })) as typeof fetch,
    });
    const quote = await provider.getQuote({ kind: "COMPANY_FACTS", ticker: "AAPL", reason: "test" });
    expect(quote.terms?.network).toBe("eip155:8453");
    expect(quote.arcCompatible).toBe(false);
    expect(quote.arcCompatibilityNote).toContain("Base mainnet");
    const status = await provider.getStatus();
    expect(status.arcCompatible).toBe(false);
    expect(status.dataMode).toBe("X402");
  });

  it("records LoneStar Oracle as Arc-mainnet x402 and policy-restricted", async () => {
    const url = "https://equity.lonestaroracle.xyz/equity?ticker=AAPL";
    const terms = {
      x402Version: 2,
      resource: { url },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:5042",
          asset: "0x3600000000000000000000000000000000000000",
          amount: "50000",
          payTo: "0xeF2a4B6756895aAf1374640dcFCD4947959442ab",
          maxTimeoutSeconds: 300,
        },
      ],
    };
    const provider = new LoneStarOracleProvider({
      fetchImpl: (async () =>
        new Response("{}", {
          status: 402,
          headers: { "payment-required": Buffer.from(JSON.stringify(terms)).toString("base64") },
        })) as typeof fetch,
    });
    const quote = await provider.getQuote({ kind: "EQUITY_FUNDAMENTALS", ticker: "AAPL", reason: "test" });
    expect(quote.terms?.network).toBe("eip155:5042");
    expect(quote.arcCompatible).toBe(true);
    expect(quote.arcCompatibilityNote).toContain("current policy allows Arc Testnet only");
    const status = await provider.getStatus();
    expect(status.available).toBe(false);
  });
});

describe("deterministic evidence planner", () => {
  it("proposes SEC verification only after an analyst links a public reference", () => {
    const privateNeeds = planEvidenceNeeds({
      publicReferenceLinked: false,
      termsConfirmed: true,
      financialInputsPresent: true,
    });
    expect(privateNeeds).toHaveLength(1);
    expect(privateNeeds[0]?.kind).toBe("PRIVATE_COMPANY_LIMITATION");
    expect(privateNeeds[0]?.providerCandidates).toHaveLength(0);

    const publicNeeds = planEvidenceNeeds({
      publicReferenceLinked: true,
      ticker: "AAPL",
      fiscalYear: 2025,
      termsConfirmed: true,
      financialInputsPresent: true,
      includePaidCandidates: true,
    });
    expect(publicNeeds.some((need) => need.kind === "REVENUE_VERIFICATION")).toBe(true);
    const paid = publicNeeds.find((need) => need.kind === "EQUITY_FUNDAMENTALS");
    expect(paid?.providerCandidates[0]).toMatchObject({
      providerId: "lonestar-oracle",
      requiresPayment: true,
      paymentNetwork: "eip155:5042",
      availability: "POLICY_RESTRICTED",
    });
  });
});
