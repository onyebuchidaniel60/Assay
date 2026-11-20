import {
  FinancialDatasetsProvider,
  LoneStarOracleProvider,
  SecEdgarProvider,
  type FinancialDataProvider,
  type FinancialDataProviderId,
  type ProviderStatus,
} from "@assay/financial-data";
import type { PaymentRuntimeConfig } from "./payment-config.js";

export function createFinancialProviders(config: PaymentRuntimeConfig): Record<FinancialDataProviderId, FinancialDataProvider> {
  return {
    "sec-edgar": new SecEdgarProvider({ userAgent: config.sec.userAgent }),
    "financial-datasets": new FinancialDatasetsProvider({
      apiKey: config.financialDatasets.apiKey,
      baseUrl: config.financialDatasets.baseUrl,
    }),
    "lonestar-oracle": new LoneStarOracleProvider({ baseUrl: config.lonestar.baseUrl }),
  };
}

export function getFinancialProvider(
  id: FinancialDataProviderId,
  config: PaymentRuntimeConfig,
): FinancialDataProvider {
  return createFinancialProviders(config)[id];
}

export async function getFinancialProviderStatuses(config: PaymentRuntimeConfig): Promise<ProviderStatus[]> {
  const providers = createFinancialProviders(config);
  return Promise.all(Object.values(providers).map((provider) => provider.getStatus()));
}
