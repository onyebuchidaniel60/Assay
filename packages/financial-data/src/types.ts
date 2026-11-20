export type FinancialDataProviderId = "sec-edgar" | "financial-datasets" | "lonestar-oracle";

export type FinancialEvidenceKind =
  | "COMPANY_FACTS"
  | "REVENUE_VERIFICATION"
  | "INCOME_STATEMENT"
  | "BALANCE_SHEET"
  | "CASH_FLOW_STATEMENT"
  | "EQUITY_FUNDAMENTALS";

export type FinancialDataRequest = {
  kind: FinancialEvidenceKind;
  ticker?: string;
  cik?: string;
  fiscalYear?: number;
  reason: string;
  linkedField?: string;
};

export type ProviderPaymentTerms = {
  network: string;
  asset: string;
  amountMinor: string;
  payTo: string;
  scheme: string;
  maxTimeoutSeconds: number;
  resourceUrl: string;
  paymentRequiredHeader: string;
  extra?: Record<string, unknown>;
};

export type ProviderQuote = {
  providerId: FinancialDataProviderId;
  displayName: string;
  endpoint: string;
  method: "GET" | "POST";
  paymentRequired: boolean;
  terms: ProviderPaymentTerms | null;
  arcCompatible: boolean;
  arcCompatibilityNote: string;
  unavailableReason: string | null;
};

export type FinancialFact = {
  tag: string;
  label: string;
  value: number;
  unit: string;
  periodStart: string | null;
  periodEnd: string;
  fiscalYear: number | null;
  fiscalPeriod: string | null;
  form: string | null;
  accession: string | null;
  filed: string | null;
  frame: string | null;
};

export type FinancialDataPayload = {
  provider: FinancialDataProviderId;
  publisher: string;
  company: {
    name: string;
    ticker: string | null;
    cik: string;
    sic?: string | null;
    fiscalYearEnd?: string | null;
    exchange?: string | null;
  };
  reportingPeriod: {
    fiscalYear: number;
    periodEnd: string | null;
    form: string | null;
  };
  facts: FinancialFact[];
  rawExcerpt?: Record<string, unknown>;
};

export type FinancialDataResult = {
  providerId: FinancialDataProviderId;
  endpoint: string;
  sourceUrl: string;
  publisher: string;
  retrievedAt: string;
  reportingPeriod: string;
  data: FinancialDataPayload;
  contentSha256: string;
  limitations: string[];
  validationStatus: "VALID" | "INCOMPLETE" | "INVALID";
  validationErrors: string[];
};

export type ProviderStatus = {
  providerId: FinancialDataProviderId;
  displayName: string;
  configured: boolean;
  available: boolean;
  dataMode: "FREE_PUBLIC" | "X402" | "API_KEY";
  paymentNetwork: string | null;
  paymentAsset: string | null;
  arcCompatible: boolean;
  note: string;
};

export type FinancialDataProvider = {
  readonly id: FinancialDataProviderId;
  readonly displayName: string;
  getStatus(): Promise<ProviderStatus>;
  getQuote(request: FinancialDataRequest): Promise<ProviderQuote>;
  retrieve(request: FinancialDataRequest, quote?: ProviderQuote): Promise<FinancialDataResult>;
  /** Validate data returned in the paid x402 response without fetching again. */
  interpretPaidPayload?(
    request: FinancialDataRequest,
    quote: ProviderQuote,
    rawData: unknown,
    retrievedAt: string,
  ): Promise<FinancialDataResult>;
};

export type FetchLike = typeof fetch;
