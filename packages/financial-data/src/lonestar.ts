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
      available: false,
      dataMode: "X402",
      paymentNetwork: ARC_MAINNET_NETWORK,
      paymentAsset: ARC_MAINNET_USDC,
      arcCompatible: true,
      note: "Real x402 financial-data provider listed by Circle Discovery with an Arc mainnet USDC option. Assay's testnet policy rejects eip155:5042 and no production funds are authorized. No payment was made.",
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
          ? "Arc mainnet USDC (eip155:5042) is offered. Assay's current policy allows Arc Testnet only; no mainnet spend is authorized."
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
    const payload: FinancialDataPayload = {
      provider: this.id,
      publisher: "LoneStar Oracle",
      company: {
        name: request.ticker?.toUpperCase() ?? "Unknown issuer",
        ticker: request.ticker?.toUpperCase() ?? null,
        cik: "",
        exchange: null,
      },
      reportingPeriod: { fiscalYear, periodEnd: null, form: null },
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
        "LoneStar Oracle is a third-party financial-data provider. Verify its methodology and licensing before relying on the values.",
        "This provider offers Arc mainnet USDC. Assay's current payment policy is Arc Testnet only, so this path is not executable without an explicit operator change.",
        "Public-company data is an independent reference, not proof of a private borrower's financial position.",
      ],
      validationStatus: "VALID",
      validationErrors: [],
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
