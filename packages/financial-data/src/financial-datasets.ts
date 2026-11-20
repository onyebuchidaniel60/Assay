import { createHash } from "node:crypto";
import { z } from "zod";
import { FinancialDataError } from "./errors.js";
import type {
  FetchLike,
  FinancialDataPayload,
  FinancialDataProvider,
  FinancialDataRequest,
  FinancialDataResult,
  ProviderPaymentTerms,
  ProviderQuote,
  ProviderStatus,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.financialdatasets.ai";
const BASE_MAINNET_NETWORK = "eip155:8453";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const acceptSchema = z
  .object({
    scheme: z.string(),
    network: z.string(),
    asset: z.string(),
    amount: z.string().regex(/^\d+$/),
    payTo: z.string(),
    maxTimeoutSeconds: z.number(),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const paymentRequiredSchema = z
  .object({
    x402Version: z.number(),
    resource: z.object({ url: z.string() }).passthrough().optional(),
    accepts: z.array(acceptSchema).min(1),
  })
  .passthrough();

export type FinancialDatasetsProviderOptions = {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
};

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function endpointFor(request: FinancialDataRequest, baseUrl: string): { url: string; kindLabel: string } {
  const ticker = request.ticker?.trim().toUpperCase();
  if (!ticker) {
    throw new FinancialDataError("INVALID_TICKER", "A public ticker is required for a Financial Datasets request.", 422);
  }
  const query = new URLSearchParams({ ticker });
  switch (request.kind) {
    case "COMPANY_FACTS":
      return { url: `${baseUrl}/company/facts?${query.toString()}`, kindLabel: "company facts" };
    case "BALANCE_SHEET":
      query.set("period", "annual");
      query.set("limit", "4");
      return { url: `${baseUrl}/financials/balance-sheets?${query.toString()}`, kindLabel: "balance sheets" };
    case "CASH_FLOW_STATEMENT":
      query.set("period", "annual");
      query.set("limit", "4");
      return { url: `${baseUrl}/financials/cash-flow-statements?${query.toString()}`, kindLabel: "cash-flow statements" };
    case "EQUITY_FUNDAMENTALS":
      query.set("period", "annual");
      query.set("limit", "4");
      return { url: `${baseUrl}/financial-metrics?${query.toString()}`, kindLabel: "financial metrics" };
    case "INCOME_STATEMENT":
    case "REVENUE_VERIFICATION":
    default:
      query.set("period", "annual");
      query.set("limit", "4");
      return { url: `${baseUrl}/financials/income-statements?${query.toString()}`, kindLabel: "income statements" };
  }
}

export class FinancialDatasetsProvider implements FinancialDataProvider {
  readonly id = "financial-datasets" as const;
  readonly displayName = "Financial Datasets";
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;

  constructor(options: FinancialDatasetsProviderOptions) {
    this.#apiKey = options.apiKey.trim();
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#fetch = options.fetchImpl ?? fetch;
  }

  get apiKeyConfigured(): boolean {
    return this.#apiKey.length > 0;
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      providerId: this.id,
      displayName: this.displayName,
      configured: this.apiKeyConfigured,
      available: this.apiKeyConfigured,
      dataMode: this.apiKeyConfigured ? "API_KEY" : "X402",
      paymentNetwork: BASE_MAINNET_NETWORK,
      paymentAsset: BASE_USDC,
      arcCompatible: false,
      note: this.apiKeyConfigured
        ? "Licensed API-key retrieval is configured. The documented x402 endpoint remains Base mainnet (eip155:8453), not Arc."
        : "Documented x402 pricing is Base mainnet USDC (eip155:8453). It cannot be paid through Assay's Arc rail; no key is configured. No data was purchased.",
    };
  }

  async getQuote(request: FinancialDataRequest): Promise<ProviderQuote> {
    const { url } = endpointFor(request, this.#baseUrl);
    if (this.apiKeyConfigured) {
      return {
        providerId: this.id,
        displayName: this.displayName,
        endpoint: url,
        method: "GET",
        paymentRequired: false,
        terms: null,
        arcCompatible: false,
        arcCompatibilityNote:
          "The licensed API-key path is billed outside Arc. It is not an x402 payment and must not be described as one.",
        unavailableReason: null,
      };
    }

    const response = await this.#request(url);
    if (response.status !== 402) {
      if (response.ok) {
        return {
          providerId: this.id,
          displayName: this.displayName,
          endpoint: url,
          method: "GET",
          paymentRequired: false,
          terms: null,
          arcCompatible: false,
          arcCompatibilityNote: "The endpoint returned data without an API key. No payment is required.",
          unavailableReason: null,
        };
      }
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        `Financial Datasets returned HTTP ${response.status} before payment negotiation.`,
        response.status >= 500 ? 502 : 400,
      );
    }
    const header = response.headers.get("payment-required");
    if (!header) {
      throw new FinancialDataError(
        "PAYMENT_REQUIRED_HEADER_MISSING",
        "Financial Datasets returned 402 without payment terms.",
        502,
      );
    }
    let parsed: z.infer<typeof paymentRequiredSchema>;
    try {
      parsed = paymentRequiredSchema.parse(JSON.parse(Buffer.from(header, "base64").toString("utf8")));
    } catch {
      throw new FinancialDataError("PAYMENT_HEADER_INVALID", "Financial Datasets returned malformed payment terms.", 502);
    }
    const accept = parsed.accepts.find((candidate) => candidate.network === BASE_MAINNET_NETWORK) ?? parsed.accepts[0]!;
    const terms: ProviderPaymentTerms = {
      network: accept.network,
      asset: accept.asset,
      amountMinor: accept.amount,
      payTo: accept.payTo,
      scheme: accept.scheme,
      maxTimeoutSeconds: accept.maxTimeoutSeconds,
      resourceUrl: parsed.resource?.url ?? url,
      paymentRequiredHeader: header,
      ...(accept.extra ? { extra: accept.extra } : {}),
    };
    return {
      providerId: this.id,
      displayName: this.displayName,
      endpoint: url,
      method: "GET",
      paymentRequired: true,
      terms,
      arcCompatible: accept.network === "eip155:5042002" && accept.asset.toLowerCase() === "0x3600000000000000000000000000000000000000",
      arcCompatibilityNote:
        accept.network === BASE_MAINNET_NETWORK
          ? "Financial Datasets requires Base mainnet USDC (eip155:8453). Assay will not bridge funds, substitute Arc USDC, or claim a Base payment occurred on Arc."
          : `The provider offered ${accept.network}; verify it independently before enabling payment.`,
      unavailableReason: null,
    };
  }

  async retrieve(request: FinancialDataRequest, quote?: ProviderQuote): Promise<FinancialDataResult> {
    if (!this.apiKeyConfigured) {
      const effective = quote ?? (await this.getQuote(request));
      if (effective.paymentRequired) {
        throw new FinancialDataError(
          "PAYMENT_RAIL_INCOMPATIBLE",
          effective.arcCompatibilityNote,
          422,
          { terms: effective.terms },
        );
      }
    }
    const { url } = endpointFor(request, this.#baseUrl);
    const response = await this.#request(url, this.apiKeyConfigured ? { "x-api-key": this.#apiKey } : undefined);
    if (!response.ok) {
      if (response.status === 402) {
        throw new FinancialDataError(
          "PAYMENT_REQUIRED",
          "Financial Datasets requires a payment or API key. Assay did not pay through an incompatible rail.",
          402,
        );
      }
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        `Financial Datasets returned HTTP ${response.status}.`,
        response.status >= 500 ? 502 : 400,
      );
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new FinancialDataError("MALFORMED_PROVIDER_RESPONSE", "Financial Datasets returned invalid JSON.", 502);
    }
    return this.#buildResult(request, url, raw, new Date().toISOString());
  }

  async interpretPaidPayload(
    request: FinancialDataRequest,
    quote: ProviderQuote,
    rawData: unknown,
    retrievedAt: string,
  ): Promise<FinancialDataResult> {
    return this.#buildResult(request, quote.endpoint, rawData, retrievedAt);
  }

  #buildResult(request: FinancialDataRequest, endpoint: string, raw: unknown, retrievedAt: string): FinancialDataResult {
    const validationErrors: string[] = [];
    const body = raw as Record<string, unknown>;
    let ticker = request.ticker?.toUpperCase() ?? null;
    let name = ticker ?? "Unknown issuer";
    if (request.kind === "COMPANY_FACTS") {
      const facts = body.company_facts as Record<string, unknown> | undefined;
      if (!facts || typeof facts.name !== "string") {
        validationErrors.push("The response did not contain company_facts.name.");
      } else {
        name = facts.name;
        ticker = typeof facts.ticker === "string" ? facts.ticker : ticker;
      }
    } else {
      const key = request.kind === "BALANCE_SHEET"
        ? "balance_sheets"
        : request.kind === "CASH_FLOW_STATEMENT"
          ? "cash_flow_statements"
          : request.kind === "EQUITY_FUNDAMENTALS"
            ? "financial_metrics"
            : "income_statements";
      const rows = body[key];
      if (!Array.isArray(rows) || rows.length === 0) {
        validationErrors.push(`The response did not contain a non-empty ${key} array.`);
      }
    }
    const fiscalYear = request.fiscalYear ?? new Date().getUTCFullYear() - 1;
    const payload: FinancialDataPayload = {
      provider: this.id,
      publisher: "Financial Datasets",
      company: {
        name,
        ticker,
        cik: "",
        exchange: null,
      },
      reportingPeriod: {
        fiscalYear,
        periodEnd: null,
        form: null,
      },
      facts: [],
      rawExcerpt: { endpoint, response: raw },
    };
    return {
      providerId: this.id,
      endpoint,
      sourceUrl: endpoint,
      publisher: payload.publisher,
      retrievedAt,
      reportingPeriod: `FY${fiscalYear}`,
      data: payload,
      contentSha256: sha256Json(raw),
      limitations: [
        "Financial Datasets x402 data is licensed for Non-Professional use unless a Professional plan is in place.",
        "The documented x402 rail is Base mainnet. This retrieval is not evidence of an Arc payment.",
        "Public-company data is an independent reference, not proof of a private borrower's financial position.",
      ],
      validationStatus: validationErrors.length === 0 ? "VALID" : "INCOMPLETE",
      validationErrors,
    };
  }

  async #request(url: string, extraHeaders?: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      return await this.#fetch(url, {
        method: "GET",
        headers: { accept: "application/json", ...extraHeaders },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new FinancialDataError("PROVIDER_TIMEOUT", "Financial Datasets did not respond before the timeout.", 504);
      }
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? `Financial Datasets could not be reached: ${error.message}` : "Financial Datasets could not be reached.",
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
