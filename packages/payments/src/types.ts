import type { PaymentRequirement } from "@assay/domain";

export type PaymentProviderId = string;

export type X402Accept = {
  scheme: string;
  network: string;
  asset: string;
  /** Integer amount in the token's smallest unit. */
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown> | undefined;
};

export function toPaymentRequirement(accept: X402Accept): PaymentRequirement {
  return {
    scheme: accept.scheme,
    network: accept.network,
    asset: accept.asset,
    amountMinor: accept.amount,
    payTo: accept.payTo,
    maxTimeoutSeconds: accept.maxTimeoutSeconds,
    ...(accept.extra ? { extra: accept.extra } : {}),
  };
}

export type X402Quote = {
  x402Version: number;
  resource: {
    url: string;
    description?: string;
    mimeType?: string;
    [key: string]: unknown;
  };
  accepted: X402Accept;
  accepts: X402Accept[];
  quoteSha256: string;
  fetchedAt: string;
  expiresAt: string;
};

export type PaymentRequestInput = {
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type PaymentRequirementsResult =
  | {
      status: "payment_required";
      httpStatus: 402;
      quote: X402Quote;
    }
  | {
      status: "free";
      httpStatus: number;
      data: unknown;
      contentSha256: string;
    };

export type PaymentExecuteInput = {
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
  quote: X402Quote;
  timeoutMs?: number;
};

export type PaymentSettlementReceipt = {
  success: boolean;
  transaction?: string;
  network?: string;
  payer?: string;
  errorReason?: string;
  [key: string]: unknown;
};

export type PaymentExecutionResult = {
  status: "CONFIRMED" | "FAILED" | "RECONCILIATION_REQUIRED";
  httpStatus: number | null;
  data: unknown;
  contentSha256: string | null;
  nonce: string;
  validBefore: string;
  amountMinor: string;
  providerTransaction: string | null;
  transactionHash: string | null;
  transferId: string | null;
  receipt: PaymentSettlementReceipt | null;
  failureCode: string | null;
  failureMessage: string | null;
};

export type GatewayTransfer = {
  id: string;
  status: "received" | "batched" | "confirmed" | "completed" | "failed";
  token: string;
  sendingNetwork: string;
  recipientNetwork: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
  txHash?: string | null;
  [key: string]: unknown;
};

export type PaymentBalances = {
  wallet: { balance: string; formatted: string } | null;
  gateway: {
    total: string;
    available: string;
    withdrawing: string;
    withdrawable: string;
    formattedTotal: string;
    formattedAvailable: string;
  };
};

export type FacilitatorStatus = {
  reachable: boolean;
  supportedNetwork: boolean;
  supportedAsset: boolean;
  supportedKinds: Array<{ scheme: string; network: string; extra?: Record<string, unknown> }>;
  error: string | null;
};

export type PaymentProvider = {
  readonly id: PaymentProviderId;
  readonly displayName: string;
  readonly network: string;
  readonly chainId: number;
  readonly asset: string;
  readonly assetSymbol: string;
  readonly gatewayWallet: string;
  readonly gatewayDomain: number;
  readonly facilitatorUrl: string;

  fetchRequirements(input: PaymentRequestInput): Promise<PaymentRequirementsResult>;
  execute(input: PaymentExecuteInput): Promise<PaymentExecutionResult>;
  getTransferById(id: string): Promise<GatewayTransfer | null>;
  searchTransfers(input: {
    from?: string;
    to?: string;
    nonce?: string;
    network?: string;
    status?: string;
    pageSize?: number;
  }): Promise<GatewayTransfer[]>;
  getBalances(address?: string): Promise<PaymentBalances>;
  getFacilitatorStatus(): Promise<FacilitatorStatus>;
  deposit(amount: string): Promise<{ depositTxHash: string; approvalTxHash?: string; formattedAmount: string }>;
  withdraw(amount: string): Promise<{ mintTxHash: string; formattedAmount: string }>;
};
