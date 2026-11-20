import {
  ARC_CHAINS,
  ARC_MAINNET,
  ARC_TESTNET,
  arcChainFromNetwork,
  isArcAsset,
  type ArcChainName,
  type PaymentSettlementModel,
} from "@assay/payments";

export type PaymentRuntimeConfig = {
  enabled: boolean;
  executionEnabled: boolean;
  dryRun: boolean;
  chain: ArcChainName;
  settlementModel: PaymentSettlementModel;
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

function settlementModel(value: string | undefined, chain: ArcChainName): PaymentSettlementModel {
  if (value === "circle-gateway") return "CIRCLE_GATEWAY_BATCH";
  if (value === "x402-exact") return "X402_EXACT_ONCHAIN";
  return chain === "arc" ? "X402_EXACT_ONCHAIN" : "CIRCLE_GATEWAY_BATCH";
}

export function loadPaymentRuntimeConfig(env: NodeJS.ProcessEnv = process.env): PaymentRuntimeConfig {
  const network = nonEmpty(env.ARC_NETWORK) ?? ARC_TESTNET.network;
  const chainName = arcChainFromNetwork(network);
  const chain: ArcChainName = chainName ?? "arcTestnet";
  const expected = ARC_CHAINS[chain];
  const model = settlementModel(nonEmpty(env.ARC_SETTLEMENT_MODEL), chain);
  const asset = nonEmpty(env.PAYMENT_ALLOWED_ASSETS)?.split(",")[0]?.trim() ?? expected.usdc;
  const allowedAssets = list(env.PAYMENT_ALLOWED_ASSETS);
  const allowedNetworks = list(env.PAYMENT_ALLOWED_NETWORKS);
  const expiresAt = nonEmpty(env.PAYMENT_SESSION_EXPIRES_AT) ?? null;
  const errors: string[] = [];
  if (!chainName) errors.push(`ARC_NETWORK must be ${ARC_TESTNET.network} or ${ARC_MAINNET.network}.`);
  if (!isArcAsset(asset, chain)) errors.push(`PAYMENT_ALLOWED_ASSETS must include ${expected.name} USDC ${expected.usdc}.`);
  if (allowedNetworks.length > 0 && !allowedNetworks.includes(expected.network)) {
    errors.push(`PAYMENT_ALLOWED_NETWORKS must include ${expected.network}.`);
  }
  if (expiresAt && !Number.isFinite(new Date(expiresAt).getTime())) {
    errors.push("PAYMENT_SESSION_EXPIRES_AT must be an ISO-8601 timestamp.");
  }
  const sessionId = nonEmpty(env.PAYMENT_SESSION_ID) ?? (chain === "arc" ? "assay-arc-mainnet-session-1" : "assay-arc-testnet-session-1");
  if (sessionId.length < 8) errors.push("PAYMENT_SESSION_ID must be at least 8 characters.");

  const privateKey =
    chain === "arc"
      ? nonEmpty(env.ARC_MAINNET_PRIVATE_KEY)
      : nonEmpty(env.ARC_TESTNET_PRIVATE_KEY);
  const payerAddress =
    chain === "arc"
      ? nonEmpty(env.ARC_MAINNET_PAYER_ADDRESS)
      : nonEmpty(env.ARC_TESTNET_PAYER_ADDRESS);
  const rpcUrl =
    chain === "arc"
      ? nonEmpty(env.ARC_MAINNET_RPC_URL) ?? ARC_MAINNET.rpcUrl
      : nonEmpty(env.ARC_TESTNET_RPC_URL) ?? ARC_TESTNET.rpcUrl;
  const facilitatorUrl =
    chain === "arc"
      ? nonEmpty(env.CIRCLE_GATEWAY_MAINNET_FACILITATOR_URL) ?? ARC_MAINNET.facilitatorUrl
      : nonEmpty(env.CIRCLE_GATEWAY_FACILITATOR_URL) ?? ARC_TESTNET.facilitatorUrl;

  return {
    enabled: (env.ARC_PAYMENTS_ENABLED ?? "false").toLowerCase() === "true",
    executionEnabled: (env.PAYMENT_EXECUTION_ENABLED ?? "false").toLowerCase() === "true",
    dryRun: (env.PAYMENT_DRY_RUN ?? "true").toLowerCase() === "true",
    chain,
    settlementModel: model,
    network: expected.network,
    asset,
    chainId: expected.chainId,
    gatewayWallet: expected.gatewayWallet,
    gatewayDomain: expected.gatewayDomain,
    facilitatorUrl,
    rpcUrl,
    privateKey,
    payerAddress,
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
