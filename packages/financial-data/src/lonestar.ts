import { createHash } from "node:crypto";
import { z } from "zod";
import { FinancialDataError } from "./errors.js";
import type {
  FetchLike,
  FinancialDataPayload,
  FinancialDataProvider,
  FinancialDataRequest,
  FinancialDataResult,
  FinancialFact,
  ProviderPaymentTerms,
  ProviderQuote,
  ProviderStatus,
} from "./types.js";

const ARC_MAINNET_NETWORK = "eip155:5042";
const ARC_MAINNET_USDC = "0x3600000000000000000000000000000000000000";
const DEFAULT_BASE_URL = "https://equity.lonestaroracle.xyz";

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

export type LoneStarOracleProviderOptions = {
  baseUrl?: string;
  fetchImpl?: FetchLike;
};


function normalizeLoneStarFacts(raw: unknown, fiscalYear: number): FinancialFact[] {
  const facts: FinancialFact[] = [];
  const unitFor = (key: string): string => {
    const k = key.toLowerCase();
    if (/(^|[._])(pe|p_e|pe_ratio|ratio|score)([._]|$)/.test(k) || k.includes("ratio")) return "ratio";
    if (k.includes("yield") || k.includes("upside") || k.includes("percent") || k.includes("change") || k.includes("margin")) return "percent";
    if (k.includes("volume")) return "shares";
    return "USD";
  };
  const visit = (value: unknown, path: string): void => {
    if (facts.length >= 12) return;
    if (Array.isArray(value)) {
      value.slice(0, 3).forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (facts.length >= 12) break;
      const nextPath = path ? `${path}.${key}` : key;
      const numeric = typeof item === "number"
        ? item
        : typeof item === "string" && /^-?\d+(?:\.\d+)?$/.test(item.trim())
          ? Number(item)
          : null;
      if (numeric !== null && Number.isFinite(numeric) && /price|pe|p\/e|eps|revenue|market|cap|target|dividend|volume|high|low|ratio|debt|equity|score|upside|yield/i.test(key)) {
        facts.push({
          tag: nextPath,
          label: key.replaceAll("_", " ").replaceAll(".", " · "),
          value: numeric,
          unit: unitFor(key),
          periodStart: null,
          periodEnd: new Date().toISOString().slice(0, 10),
          fiscalYear,
          fiscalPeriod: "FY",
          form: null,
          accession: null,
          filed: null,
          frame: null,
        });
        continue;
      }
      if (item && typeof item === "object") visit(item, nextPath);
    }
  };
  visit(raw, "");
  return facts;
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export class LoneStarOracleProvider implements FinancialDataProvider {
  readonly id = "lonestar-oracle" as const;
  readonly displayName = "LoneStar Oracle EquityScope";
  readonly #baseUrl: string;
  readonly #fetch: FetchLike;

  constructor(options: LoneStarOracleProviderOptions = {}) {
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      providerId: this.id,
      displayName: this.displayName,
      configured: true,
      available: true,
      dataMode: "X402",
      paymentNetwork: ARC_MAINNET_NETWORK,
      paymentAsset: ARC_MAINNET_USDC,
      arcCompatible: true,
      note: "Real x402 financial-data provider with an Arc Mainnet USDC option (standard x402 exact, USDC EIP-3009). A payment settles only when an active spending session, the deterministic policy and an explicit analyst authorization all permit it.",
    };
  }

  async getQuote(request: FinancialDataRequest): Promise<ProviderQuote> {
    const ticker = request.ticker?.trim().toUpperCase();
    if (!ticker) {
      throw new FinancialDataError("INVALID_TICKER", "A public ticker is required for this provider.", 422);
    }
    const url = `${this.#baseUrl}/equity?ticker=${encodeURIComponent(ticker)}`;
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
          arcCompatible: true,
          arcCompatibilityNote: "The endpoint returned data without payment.",
          unavailableReason: null,
        };
      }
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        `LoneStar Oracle returned HTTP ${response.status} before payment negotiation.`,
        response.status >= 500 ? 502 : 400,
      );
    }
    const header = response.headers.get("payment-required");
    if (!header) {
      throw new FinancialDataError(
        "PAYMENT_REQUIRED_HEADER_MISSING",
        "LoneStar Oracle returned 402 without payment terms.",
        502,
      );
    }
    let parsed: z.infer<typeof paymentRequiredSchema>;
    try {
      parsed = paymentRequiredSchema.parse(JSON.parse(Buffer.from(header, "base64").toString("utf8")));
    } catch {
      throw new FinancialDataError("PAYMENT_HEADER_INVALID", "LoneStar Oracle returned malformed payment terms.", 502);
    }
    const accept =
      parsed.accepts.find((candidate) => candidate.network === ARC_MAINNET_NETWORK) ?? parsed.accepts[0]!;
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
      arcCompatible: accept.network === ARC_MAINNET_NETWORK && accept.asset.toLowerCase() === ARC_MAINNET_USDC,
      arcCompatibilityNote:
        accept.network === ARC_MAINNET_NETWORK
          ? "Arc Mainnet USDC (eip155:5042) is offered as standard x402 exact. Any payment is checked against the active spending session and requires explicit analyst authorization."
          : `The provider offered ${accept.network}. Assay did not substitute a different network.`,
      unavailableReason: null,
    };
  }

  async retrieve(request: FinancialDataRequest, quote?: ProviderQuote): Promise<FinancialDataResult> {
    const effective = quote ?? (await this.getQuote(request));
    if (effective.paymentRequired) {
      throw new FinancialDataError(
        "PAYMENT_REQUIRED",
        "LoneStar Oracle returns data only after a settled x402 payment. Assay did not pay on an unapproved network.",
        402,
        { terms: effective.terms },
      );
    }
    const response = await this.#request(effective.endpoint);
    if (!response.ok) {
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        `LoneStar Oracle returned HTTP ${response.status}.`,
        response.status >= 500 ? 502 : 400,
      );
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new FinancialDataError("MALFORMED_PROVIDER_RESPONSE", "LoneStar Oracle returned invalid JSON.", 502);
    }
    return this.#buildResult(request, effective.endpoint, raw, new Date().toISOString());
  }

  async interpretPaidPayload(
    request: FinancialDataRequest,
    quote: ProviderQuote,
    rawData: unknown,
    retrievedAt: string,
  ): Promise<FinancialDataResult> {
    return this.#buildResult(request, quote.endpoint, rawData, retrievedAt);
  }

  #buildResult(
    request: FinancialDataRequest,
    endpoint: string,
    raw: unknown,
    retrievedAt: string,
  ): FinancialDataResult {
    const fiscalYear = request.fiscalYear ?? new Date().getUTCFullYear() - 1;
    const facts = normalizeLoneStarFacts(raw, fiscalYear);
    const rawObject = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const rawTicker = typeof rawObject.ticker === "string" ? rawObject.ticker : typeof rawObject.symbol === "string" ? rawObject.symbol : null;
    const rawName = typeof rawObject.company_name === "string" ? rawObject.company_name : typeof rawObject.name === "string" ? rawObject.name : null;
    const payload: FinancialDataPayload = {
      provider: this.id,
      publisher: "LoneStar Oracle",
      company: {
        name: rawName ?? request.ticker?.toUpperCase() ?? "Unknown issuer",
        ticker: rawTicker ?? request.ticker?.toUpperCase() ?? null,
        cik: "",
        exchange: typeof rawObject.exchange === "string" ? rawObject.exchange : null,
      },
      reportingPeriod: { fiscalYear, periodEnd: facts[0]?.periodEnd ?? null, form: null },
      facts,
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
        "LoneStar Oracle is a third-party financial-data provider. Verify its methodology and licensing before relying on the values.",
        "This provider offers Arc Mainnet USDC as standard x402 exact. Any payment is gated by the configured spending session and an explicit analyst authorization.",
        "Public-company data is an independent reference, not proof of a private borrower's financial position.",
      ],
      validationStatus: facts.length > 0 ? "VALID" : "INCOMPLETE",
      validationErrors: facts.length > 0 ? [] : ["No recognized numeric financial fields were found in the provider response."],
    };
  }

  async #request(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      return await this.#fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new FinancialDataError("PROVIDER_TIMEOUT", "LoneStar Oracle did not respond before the timeout.", 504);
      }
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? `LoneStar Oracle could not be reached: ${error.message}` : "LoneStar Oracle could not be reached.",
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
