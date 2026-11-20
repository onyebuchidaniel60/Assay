import { createHash } from "node:crypto";
import { FinancialDataError } from "./errors.js";
import type {
  FetchLike,
  FinancialDataPayload,
  FinancialDataProvider,
  FinancialDataRequest,
  FinancialDataResult,
  FinancialFact,
  ProviderQuote,
  ProviderStatus,
} from "./types.js";

const SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions";
const SEC_COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts";

const ANNUAL_FORMS = ["10-K", "10-K/A", "20-F", "40-F"];

const TAGS_BY_KIND: Record<string, string[]> = {
  COMPANY_FACTS: [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "NetIncomeLoss",
    "Assets",
    "Liabilities",
    "CashAndCashEquivalentsAtCarryingValue",
  ],
  REVENUE_VERIFICATION: [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
  ],
  INCOME_STATEMENT: [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "OperatingIncomeLoss",
    "NetIncomeLoss",
  ],
  BALANCE_SHEET: [
    "Assets",
    "Liabilities",
    "LongTermDebtNoncurrent",
    "LongTermDebtCurrent",
    "CashAndCashEquivalentsAtCarryingValue",
  ],
  CASH_FLOW_STATEMENT: [
    "NetCashProvidedByUsedInOperatingActivities",
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "NetCashProvidedByUsedInInvestingActivities",
    "NetCashProvidedByUsedInFinancingActivities",
  ],
  EQUITY_FUNDAMENTALS: ["Revenues", "OperatingIncomeLoss", "NetIncomeLoss", "Assets", "Liabilities"],
};

type CompanyTicker = { cik_str: number; ticker: string; title: string };
type CompanyTickersFile = Record<string, CompanyTicker>;

type SecFactUnit = {
  start?: string;
  end?: string;
  val?: number;
  accn?: string;
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  frame?: string;
};

type SecCompanyFacts = {
  cik?: number;
  entityName?: string;
  facts?: Record<string, Record<string, { label?: string; units?: Record<string, SecFactUnit[]> }>>;
};

type SecSubmissions = {
  name?: string;
  cik?: string;
  tickers?: string[];
  sic?: string;
  fiscalYearEnd?: string;
  exchanges?: string[];
};

export type SecEdgarProviderOptions = {
  userAgent: string;
  fetchImpl?: FetchLike;
  minIntervalMs?: number;
  cacheTtlMs?: number;
};

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function padCik(value: string | number): string {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 0 || digits.length > 10) {
    throw new FinancialDataError("INVALID_CIK", "A SEC CIK must contain 1–10 digits.", 422);
  }
  return digits.padStart(10, "0");
}

function isAnnualPeriod(entry: SecFactUnit): boolean {
  if (!entry.end) return false;
  if (!entry.start) return true; // point-in-time balance-sheet fact
  const start = new Date(`${entry.start}T00:00:00Z`).getTime();
  const end = new Date(`${entry.end}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  const days = (end - start) / 86_400_000;
  return days >= 300 && days <= 400;
}

function latestAnnualFact(entries: SecFactUnit[], fiscalYear?: number): SecFactUnit | null {
  const annual = entries.filter((entry) => {
    if (typeof entry.val !== "number" || !Number.isFinite(entry.val) || !entry.end) return false;
    if (entry.fp !== "FY") return false;
    if (!entry.form || !ANNUAL_FORMS.some((form) => entry.form!.startsWith(form))) return false;
    if (fiscalYear !== undefined && entry.fy !== fiscalYear) return false;
    return isAnnualPeriod(entry);
  });
  if (annual.length === 0) return null;
  annual.sort((a, b) => {
    const filedA = a.filed ?? "";
    const filedB = b.filed ?? "";
    if (filedA !== filedB) return filedB.localeCompare(filedA);
    return (b.end ?? "").localeCompare(a.end ?? "");
  });
  return annual[0] ?? null;
}

function availableFiscalYears(facts: SecCompanyFacts, tags: string[]): number[] {
  const years = new Set<number>();
  for (const tag of tags) {
    const units = facts.facts?.["us-gaap"]?.[tag]?.units?.USD ?? [];
    for (const entry of units) {
      if (entry.fp === "FY" && typeof entry.fy === "number" && isAnnualPeriod(entry)) years.add(entry.fy);
    }
  }
  return [...years].sort((a, b) => b - a);
}

export class SecEdgarProvider implements FinancialDataProvider {
  readonly id = "sec-edgar" as const;
  readonly displayName = "SEC EDGAR (XBRL company facts)";
  readonly #userAgent: string;
  readonly #fetch: FetchLike;
  readonly #minIntervalMs: number;
  readonly #cacheTtlMs: number;
  #lastRequestAt = 0;
  #tickerCache: { loadedAt: number; value: CompanyTickersFile } | null = null;

  constructor(options: SecEdgarProviderOptions) {
    this.#userAgent = options.userAgent.trim();
    this.#fetch = options.fetchImpl ?? fetch;
    this.#minIntervalMs = options.minIntervalMs ?? 120;
    this.#cacheTtlMs = options.cacheTtlMs ?? 15 * 60_000;
  }

  get userAgentConfigured(): boolean {
    return this.#userAgent.length > 0;
  }

  async getStatus(): Promise<ProviderStatus> {
    return {
      providerId: this.id,
      displayName: this.displayName,
      configured: this.userAgentConfigured,
      available: this.userAgentConfigured,
      dataMode: "FREE_PUBLIC",
      paymentNetwork: null,
      paymentAsset: null,
      arcCompatible: false,
      note: this.userAgentConfigured
        ? "Free public SEC XBRL company facts. A descriptive User-Agent with operator contact is configured. No payment is required."
        : "Set SEC_EDGAR_USER_AGENT to a descriptive operator contact before live SEC retrieval. No payment is required.",
    };
  }

  async getQuote(): Promise<ProviderQuote> {
    throw new FinancialDataError(
      "PAYMENT_NOT_REQUIRED",
      "SEC EDGAR is a free public-data source and does not use x402. Request the evidence without a payment.",
      400,
    );
  }

  async retrieve(request: FinancialDataRequest): Promise<FinancialDataResult> {
    if (!this.#userAgent) {
      throw new FinancialDataError(
        "PROVIDER_NOT_CONFIGURED",
        "SEC_EDGAR_USER_AGENT is required by SEC fair-access rules.",
        503,
      );
    }
    const cik = await this.#resolveCik(request);
    const [facts, submissions] = await Promise.all([
      this.#fetchJson(`${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`) as Promise<SecCompanyFacts>,
      this.#fetchJson(`${SEC_SUBMISSIONS_URL}/CIK${cik}.json`) as Promise<SecSubmissions>,
    ]);
    if (!facts.entityName || typeof facts.facts !== "object" || facts.facts === null) {
      throw new FinancialDataError(
        "MALFORMED_PROVIDER_RESPONSE",
        "SEC EDGAR returned no entity name or XBRL facts for this CIK.",
        502,
      );
    }

    const tags = TAGS_BY_KIND[request.kind] ?? TAGS_BY_KIND.COMPANY_FACTS!;
    const fiscalYears = availableFiscalYears(facts, tags);
    const fiscalYear = request.fiscalYear ?? fiscalYears[0] ?? new Date().getUTCFullYear() - 1;
    const factsOut: FinancialFact[] = [];
    for (const tag of tags) {
      const definition = facts.facts["us-gaap"]?.[tag];
      const entries = definition?.units?.USD ?? [];
      const selected = latestAnnualFact(entries, fiscalYear);
      if (!selected) continue;
      factsOut.push({
        tag,
        label: definition?.label ?? tag,
        value: selected.val!,
        unit: "USD",
        periodStart: selected.start ?? null,
        periodEnd: selected.end!,
        fiscalYear: selected.fy ?? fiscalYear,
        fiscalPeriod: selected.fp ?? null,
        form: selected.form ?? null,
        accession: selected.accn ?? null,
        filed: selected.filed ?? null,
        frame: selected.frame ?? null,
      });
    }

    const validationErrors: string[] = [];
    if (factsOut.length === 0) {
      validationErrors.push(
        `No annual USD fact was found for ${request.kind} in fiscal year ${fiscalYear}. Available fiscal years: ${fiscalYears.slice(0, 5).join(", ") || "none"}.`,
      );
    }
    if (request.kind === "REVENUE_VERIFICATION" && !factsOut.some((fact) => fact.tag.toLowerCase().includes("revenue"))) {
      validationErrors.push("No revenue fact was found for the requested period.");
    }
    const periodEnd = factsOut
      .map((fact) => fact.periodEnd)
      .sort((a, b) => b.localeCompare(a))[0] ?? null;
    const payload: FinancialDataPayload = {
      provider: this.id,
      publisher: "U.S. Securities and Exchange Commission (EDGAR)",
      company: {
        name: facts.entityName,
        ticker: request.ticker?.toUpperCase() ?? submissions.tickers?.[0] ?? null,
        cik,
        sic: submissions.sic ?? null,
        fiscalYearEnd: submissions.fiscalYearEnd ?? null,
        exchange: submissions.exchanges?.[0] ?? null,
      },
      reportingPeriod: {
        fiscalYear,
        periodEnd,
        form: factsOut.find((fact) => fact.form)?.form ?? null,
      },
      facts: factsOut,
      rawExcerpt: {
        entityName: facts.entityName,
        cik: facts.cik ?? Number(cik),
        requestedKind: request.kind,
        availableFiscalYears: fiscalYears.slice(0, 10),
      },
    };
    const sourceUrl = `${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`;
    const result: FinancialDataResult = {
      providerId: this.id,
      endpoint: sourceUrl,
      sourceUrl,
      publisher: payload.publisher,
      retrievedAt: new Date().toISOString(),
      reportingPeriod: `FY${fiscalYear}${periodEnd ? ` (period ending ${periodEnd})` : ""}`,
      data: payload,
      contentSha256: sha256Json(payload),
      limitations: [
        "SEC XBRL facts describe the public registrant identified by CIK. They are not evidence about a private borrower or any other legal entity.",
        "Figures are as filed by the issuer. Taxonomy tags and periods can differ between issuers; Assay does not recalculate the issuer's statements from this payload.",
        "SEC EDGAR is a free public source. No paid provider was used for this retrieval.",
      ],
      validationStatus: validationErrors.length === 0 ? "VALID" : factsOut.length === 0 ? "INCOMPLETE" : "INCOMPLETE",
      validationErrors,
    };
    return result;
  }

  async #resolveCik(request: FinancialDataRequest): Promise<string> {
    if (request.cik) return padCik(request.cik);
    const ticker = request.ticker?.trim().toUpperCase();
    if (!ticker) {
      throw new FinancialDataError("INVALID_REQUEST", "Provide a ticker or CIK for the SEC lookup.", 422);
    }
    const tickers = await this.#loadTickers();
    const match = Object.values(tickers).find((row) => row.ticker.toUpperCase() === ticker);
    if (!match) {
      throw new FinancialDataError(
        "COMPANY_NOT_FOUND",
        `SEC EDGAR has no registrant with ticker ${ticker}. The borrower may be private.`,
        404,
      );
    }
    return padCik(match.cik_str);
  }

  async #loadTickers(): Promise<CompanyTickersFile> {
    if (this.#tickerCache && Date.now() - this.#tickerCache.loadedAt < this.#cacheTtlMs) {
      return this.#tickerCache.value;
    }
    const parsed = (await this.#fetchJson(SEC_TICKERS_URL)) as CompanyTickersFile;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new FinancialDataError("MALFORMED_PROVIDER_RESPONSE", "SEC ticker index was not an object.", 502);
    }
    this.#tickerCache = { loadedAt: Date.now(), value: parsed };
    return parsed;
  }

  async #throttle(): Promise<void> {
    const elapsed = Date.now() - this.#lastRequestAt;
    const wait = Math.max(0, this.#minIntervalMs - elapsed);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    this.#lastRequestAt = Date.now();
  }

  async #fetchJson(url: string): Promise<unknown> {
    await this.#throttle();
    let response: Response;
    try {
      response = await this.#fetch(url, {
        headers: {
          "user-agent": this.#userAgent,
          accept: "application/json",
        },
      });
    } catch (error) {
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        error instanceof Error ? `SEC EDGAR could not be reached: ${error.message}` : "SEC EDGAR could not be reached.",
        502,
      );
    }
    if (response.status === 429) {
      throw new FinancialDataError("PROVIDER_RATE_LIMITED", "SEC EDGAR rate-limited the request. Retry later.", 429);
    }
    if (response.status === 404) {
      throw new FinancialDataError("COMPANY_NOT_FOUND", "SEC EDGAR has no record for this CIK.", 404);
    }
    if (!response.ok) {
      throw new FinancialDataError(
        "PROVIDER_UNAVAILABLE",
        `SEC EDGAR returned HTTP ${response.status}.`,
        response.status >= 500 ? 502 : 400,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new FinancialDataError("MALFORMED_PROVIDER_RESPONSE", "SEC EDGAR returned invalid JSON.", 502);
    }
  }
}
