import { ARC_TESTNET, isArcTestnetAsset, isArcTestnetNetwork } from "@assay/payments";

export type PaymentRuntimeConfig = {
  enabled: boolean;
  executionEnabled: boolean;
  dryRun: boolean;
  network: string;
  asset: string;
  chainId: number;
  gatewayWallet: string;
  gatewayDomain: number;
  facilitatorUrl: string;
  rpcUrl: string;
  privateKey: string | undefined;
  payerAddress: string | undefined;
  requestTimeoutMs: number;
  session: {
    id: string;
    expiresAt: string | null;
    maxPerTxMinor: string;
    maxTotalMinor: string;
    allowedProviders: string[];
    allowedEndpoints: string[];
    allowedRecipients: string[];
    allowedNetworks: string[];
    allowedAssets: string[];
  };
  reconcile: { intervalSeconds: number; maxAttempts: number };
  sec: { userAgent: string };
  financialDatasets: { apiKey: string; baseUrl: string };
  lonestar: { baseUrl: string };
  configError: string | null;
};

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadPaymentRuntimeConfig(env: NodeJS.ProcessEnv = process.env): PaymentRuntimeConfig {
  const network = nonEmpty(env.ARC_NETWORK) ?? ARC_TESTNET.network;
  const asset = nonEmpty(env.PAYMENT_ALLOWED_ASSETS)?.split(",")[0]?.trim() ?? ARC_TESTNET.usdc;
  const allowedAssets = list(env.PAYMENT_ALLOWED_ASSETS);
  const allowedNetworks = list(env.PAYMENT_ALLOWED_NETWORKS);
  const expiresAt = nonEmpty(env.PAYMENT_SESSION_EXPIRES_AT) ?? null;
  const errors: string[] = [];
  if (!isArcTestnetNetwork(network)) errors.push(`ARC_NETWORK must be ${ARC_TESTNET.network}.`);
  if (!isArcTestnetAsset(asset)) errors.push(`PAYMENT_ALLOWED_ASSETS must include Arc Testnet USDC ${ARC_TESTNET.usdc}.`);
  if (allowedNetworks.length > 0 && !allowedNetworks.includes(ARC_TESTNET.network)) {
    errors.push(`PAYMENT_ALLOWED_NETWORKS must include ${ARC_TESTNET.network}.`);
  }
  if (expiresAt && !Number.isFinite(new Date(expiresAt).getTime())) {
    errors.push("PAYMENT_SESSION_EXPIRES_AT must be an ISO-8601 timestamp.");
  }
  const sessionId = nonEmpty(env.PAYMENT_SESSION_ID) ?? "assay-arc-testnet-session-1";
  if (sessionId.length < 8) errors.push("PAYMENT_SESSION_ID must be at least 8 characters.");

  return {
    enabled: (env.ARC_PAYMENTS_ENABLED ?? "false").toLowerCase() === "true",
    executionEnabled: (env.PAYMENT_EXECUTION_ENABLED ?? "false").toLowerCase() === "true",
    dryRun: (env.PAYMENT_DRY_RUN ?? "true").toLowerCase() === "true",
    network,
    asset,
    chainId: ARC_TESTNET.chainId,
    gatewayWallet: ARC_TESTNET.gatewayWallet,
    gatewayDomain: ARC_TESTNET.gatewayDomain,
    facilitatorUrl: nonEmpty(env.CIRCLE_GATEWAY_FACILITATOR_URL) ?? ARC_TESTNET.facilitatorUrl,
    rpcUrl: nonEmpty(env.ARC_TESTNET_RPC_URL) ?? ARC_TESTNET.rpcUrl,
    privateKey: nonEmpty(env.ARC_TESTNET_PRIVATE_KEY),
    payerAddress: nonEmpty(env.ARC_TESTNET_PAYER_ADDRESS),
    requestTimeoutMs: Number(env.PAYMENT_REQUEST_TIMEOUT_MS ?? 20_000),
    session: {
      id: sessionId,
      expiresAt,
      maxPerTxMinor: String(env.PAYMENT_MAX_PER_TX_MINOR ?? "100000"),
      maxTotalMinor: String(env.PAYMENT_MAX_TOTAL_MINOR ?? "500000"),
      allowedProviders: list(env.PAYMENT_ALLOWED_PROVIDERS),
      allowedEndpoints: list(env.PAYMENT_ALLOWED_ENDPOINTS),
      allowedRecipients: list(env.PAYMENT_ALLOWED_RECIPIENTS),
      allowedNetworks,
      allowedAssets,
    },
    reconcile: {
      intervalSeconds: Number(env.PAYMENT_RECONCILE_INTERVAL_SECONDS ?? 60),
      maxAttempts: Number(env.PAYMENT_RECONCILE_MAX_ATTEMPTS ?? 10),
    },
    sec: { userAgent: nonEmpty(env.SEC_EDGAR_USER_AGENT) ?? "" },
    financialDatasets: {
      apiKey: nonEmpty(env.FINANCIAL_DATASETS_API_KEY) ?? "",
      baseUrl: nonEmpty(env.FINANCIAL_DATASETS_BASE_URL) ?? "https://api.financialdatasets.ai",
    },
    lonestar: { baseUrl: nonEmpty(env.LONESTAR_ORACLE_BASE_URL) ?? "https://equity.lonestaroracle.xyz" },
    configError: errors.length > 0 ? errors.join(" ") : null,
  };
}

export function paymentRuntimeReady(config: PaymentRuntimeConfig): boolean {
  let maxPerTx: bigint;
  let maxTotal: bigint;
  try {
    maxPerTx = BigInt(config.session.maxPerTxMinor);
    maxTotal = BigInt(config.session.maxTotalMinor);
  } catch {
    return false;
  }
  return (
    config.enabled &&
    config.configError === null &&
    Boolean(config.session.expiresAt) &&
    new Date(config.session.expiresAt!).getTime() > Date.now() &&
    config.session.allowedProviders.length > 0 &&
    config.session.allowedEndpoints.length > 0 &&
    config.session.allowedRecipients.length > 0 &&
    config.session.allowedNetworks.length > 0 &&
    config.session.allowedAssets.length > 0 &&
    maxPerTx > 0n &&
    maxTotal > 0n
  );
}
