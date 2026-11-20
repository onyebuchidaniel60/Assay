import { createHash } from "node:crypto";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { createPublicClient, erc20Abi, formatUnits, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN_CONFIGS } from "@circle-fin/x402-batching/client";
import { ARC_MAINNET, verifyArcSdkConfig } from "./arc-config.js";
import { PaymentProviderError, PaymentRequestError } from "./errors.js";
import {
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER,
  buildQuote,
  encodePaymentSignature,
  isTransactionHash,
  parsePaymentRequiredHeader,
  parseSettlementReceipt,
  paymentPayloadSchema,
  selectExactOption,
  sha256Bytes,
} from "./x402.js";
import type {
  FacilitatorStatus,
  GatewayTransfer,
  PaymentBalances,
  PaymentExecuteInput,
  PaymentExecutionResult,
  PaymentProvider,
  PaymentRequestInput,
  PaymentRequirementsResult,
} from "./types.js";

const EIP3009_ABI = [
  {
    type: "function",
    name: "authorizationState",
    stateMutability: "view",
    inputs: [
      { name: "authorizer", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type ArcX402ExactConfig = {
  privateKey?: string;
  payerAddress?: string;
  rpcUrl?: string;
  requestTimeoutMs?: number;
};

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Standard x402 `exact` buyer for Arc Mainnet.
 *
 * LoneStar Oracle's Arc Mainnet option is an onchain EIP-3009 transfer against
 * the USDC token itself, not a Circle Gateway batched payment. This provider
 * signs the standard exact payload and submits it to the seller's facilitator.
 */
export class ArcX402ExactProvider implements PaymentProvider {
  readonly id = "arc-x402-exact";
  readonly displayName = "Arc Mainnet · x402 exact";
  readonly settlementModel = "X402_EXACT_ONCHAIN" as const;
  readonly network = ARC_MAINNET.network;
  readonly chainId = ARC_MAINNET.chainId;
  readonly asset = ARC_MAINNET.usdc;
  readonly assetSymbol = "USDC";
  readonly gatewayWallet = null;
  readonly gatewayDomain = null;
  readonly facilitatorUrl = null;

  readonly #configuredPayerAddress: string | undefined;
  readonly #privateKey: Hex | undefined;
  readonly #account: ReturnType<typeof privateKeyToAccount> | undefined;
  readonly #scheme: ExactEvmScheme | undefined;
  readonly #publicClient: ReturnType<typeof createPublicClient>;
  private readonly rpcUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(config: ArcX402ExactConfig = {}) {
    verifyArcSdkConfig("arc");
    this.#configuredPayerAddress = config.payerAddress;
    this.rpcUrl = config.rpcUrl ?? ARC_MAINNET.rpcUrl;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 20_000;
    this.#publicClient = createPublicClient({
      chain: CHAIN_CONFIGS.arc.chain,
      transport: http(this.rpcUrl),
    });

    if (config.privateKey) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(config.privateKey)) {
        throw new Error("The Arc Mainnet signing key must be a 32-byte 0x-prefixed hex value.");
      }
      this.#privateKey = config.privateKey as Hex;
      this.#account = privateKeyToAccount(this.#privateKey);
      if (config.payerAddress && config.payerAddress.toLowerCase() !== this.#account.address.toLowerCase()) {
        throw new Error("The configured Arc Mainnet payer address does not match the signing key.");
      }
      this.#scheme = new ExactEvmScheme(this.#account);
    } else {
      if (config.payerAddress && !/^0x[0-9a-fA-F]{40}$/.test(config.payerAddress)) {
        throw new Error("The configured Arc Mainnet payer address must be a 20-byte EVM address.");
      }
      this.#privateKey = undefined;
      this.#account = undefined;
      this.#scheme = undefined;
    }
  }

  get payerAddress(): string | null {
    return this.#account?.address ?? this.#configuredPayerAddress ?? null;
  }

  get signingKeyConfigured(): boolean {
    return Boolean(this.#privateKey);
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      displayName: this.displayName,
      settlementModel: this.settlementModel,
      network: this.network,
      chainId: this.chainId,
      asset: this.asset,
      assetSymbol: this.assetSymbol,
      payerAddress: this.payerAddress,
      signingKeyConfigured: this.signingKeyConfigured,
    };
  }

  private requireSigner(): ExactEvmScheme {
    if (!this.#scheme) {
      throw new PaymentProviderError(
        "PAYMENT_SIGNER_NOT_CONFIGURED",
        "The Arc Mainnet payment signing key is not configured on this server.",
        503,
      );
    }
    return this.#scheme;
  }

  private async timedFetch(url: string, init: RequestInit = {}, timeoutMs = this.requestTimeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const bodyText = await response.text();
      return { response, bodyText, contentSha256: contentHash(bodyText) };
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new PaymentProviderError("PAYMENT_PROVIDER_TIMEOUT", "The provider did not respond before the timeout.", 504);
      }
      throw new PaymentProviderError(
        "PAYMENT_PROVIDER_UNAVAILABLE",
        error instanceof Error ? `The payment provider could not be reached: ${error.message}` : "The payment provider could not be reached.",
        502,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchRequirements(input: PaymentRequestInput): Promise<PaymentRequirementsResult> {
    const method = input.method ?? "GET";
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(input.body !== undefined ? { "content-type": "application/json" } : {}),
      ...input.headers,
    };
    const result = await this.timedFetch(
      input.url,
      {
        method,
        headers,
        ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
      },
      input.timeoutMs ?? this.requestTimeoutMs,
    );

    if (result.response.status === 402) {
      const required = parsePaymentRequiredHeader(result.response.headers.get(PAYMENT_REQUIRED_HEADER));
      const accepted = selectExactOption(required, { network: this.network, asset: this.asset });
      const quote = buildQuote({
        paymentRequired: required,
        accepted,
        requestedUrl: input.url,
        fetchedAt: new Date(),
      });
      return { status: "payment_required", httpStatus: 402, quote };
    }
    if (result.response.ok) {
      return {
        status: "free",
        httpStatus: result.response.status,
        data: safeJson(result.bodyText) ?? result.bodyText,
        contentSha256: result.contentSha256,
      };
    }
    if (result.response.status === 429) {
      throw new PaymentRequestError("PROVIDER_RATE_LIMITED", "The provider rate-limited the request.", 429);
    }
    throw new PaymentProviderError(
      "PROVIDER_UNAVAILABLE",
      `The provider returned HTTP ${result.response.status}. No payment was signed.`,
      result.response.status >= 500 ? 502 : 400,
    );
  }

  async execute(input: PaymentExecuteInput): Promise<PaymentExecutionResult> {
    const scheme = this.requireSigner();
    const account = this.#account;
    if (!account) throw new PaymentProviderError("PAYMENT_SIGNER_NOT_CONFIGURED", "No Arc Mainnet signer.", 503);

    const option = selectExactOption(
      { x402Version: input.quote.x402Version, accepts: input.quote.accepts },
      { network: this.network, asset: this.asset },
    );
    if (
      option.amount !== input.quote.accepted.amount ||
      option.payTo.toLowerCase() !== input.quote.accepted.payTo.toLowerCase()
    ) {
      return this.failedBeforeSubmission("QUOTE_CHANGED", "The provider's payment requirements changed after the quote.");
    }

    const sdkOption = {
      scheme: option.scheme,
      network: option.network as `${string}:${string}`,
      asset: option.asset,
      amount: option.amount,
      payTo: option.payTo,
      maxTimeoutSeconds: option.maxTimeoutSeconds,
      extra: option.extra ?? {},
    };
    const partial = await scheme.createPaymentPayload(input.quote.x402Version, sdkOption);
    const parsedPayload = paymentPayloadSchema.parse({
      ...partial,
      accepted: option,
      resource: input.quote.resource,
    });
    const authorization = parsedPayload.payload.authorization;
    if (authorization.to.toLowerCase() !== option.payTo.toLowerCase()) {
      return this.failedBeforeSubmission("RECIPIENT_MISMATCH", "The signed recipient does not match the provider requirement.");
    }
    if (authorization.value !== option.amount) {
      return this.failedBeforeSubmission("AMOUNT_MISMATCH", "The signed amount does not match the provider requirement.");
    }
    if (authorization.from.toLowerCase() !== account.address.toLowerCase()) {
      return this.failedBeforeSubmission("PAYER_MISMATCH", "The signed payer does not match the configured wallet.");
    }

    const header = encodePaymentSignature({
      ...partial,
      resource: input.quote.resource,
      accepted: option,
    });
    let result;
    try {
      result = await this.timedFetch(
        input.url,
        {
          method: input.method ?? "GET",
          headers: {
            accept: "application/json",
            ...(input.body !== undefined ? { "content-type": "application/json" } : {}),
            ...input.headers,
            [PAYMENT_SIGNATURE_HEADER]: header,
          },
          ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
        },
        input.timeoutMs ?? this.requestTimeoutMs,
      );
    } catch (error) {
      return {
        status: "RECONCILIATION_REQUIRED",
        httpStatus: null,
        data: null,
        contentSha256: null,
        nonce: authorization.nonce,
        validBefore: authorization.validBefore,
        amountMinor: authorization.value,
        providerTransaction: null,
        transactionHash: null,
        transferId: null,
        receipt: null,
        failureCode: "SUBMISSION_UNKNOWN",
        failureMessage:
          error instanceof Error
            ? `The paid request did not complete: ${error.message}. Reconcile the authorization before any retry.`
            : "The paid request did not complete. Reconcile the authorization before any retry.",
      };
    }

    const receipt = parseSettlementReceipt(result.response.headers.get(PAYMENT_RESPONSE_HEADER));
    const providerTransaction = typeof receipt?.transaction === "string" ? receipt.transaction : null;
    const transactionHash = isTransactionHash(providerTransaction) ? providerTransaction : null;
    const data = safeJson(result.bodyText) ?? result.bodyText;
    const base = {
      httpStatus: result.response.status,
      data,
      contentSha256: result.contentSha256,
      nonce: authorization.nonce,
      validBefore: authorization.validBefore,
      amountMinor: authorization.value,
      providerTransaction,
      transactionHash,
      transferId: null,
      receipt,
    };

    if (result.response.ok) {
      if (receipt?.success === true) {
        return { ...base, status: "CONFIRMED", failureCode: null, failureMessage: null };
      }
      return {
        ...base,
        status: "RECONCILIATION_REQUIRED",
        failureCode: "SETTLEMENT_UNVERIFIED",
        failureMessage:
          "The provider returned data but did not return a verifiable settlement receipt. Reconcile before treating the payment as settled.",
      };
    }

    const body = safeJson(result.bodyText) as { error?: unknown } | null;
    const providerError = typeof body?.error === "string" ? body.error : null;
    if (providerError === "duplicate_payment") {
      return {
        ...base,
        status: "RECONCILIATION_REQUIRED",
        failureCode: "DUPLICATE_PAYMENT",
        failureMessage: "The provider reports that this authorization was already used. Reconcile the original transfer.",
      };
    }
    if (providerError === "insufficient_balance") {
      return {
        ...base,
        status: "FAILED",
        failureCode: "INSUFFICIENT_BALANCE",
        failureMessage: "The wallet USDC balance is insufficient. No data was purchased.",
      };
    }
    if (result.response.status >= 500) {
      return {
        ...base,
        status: "RECONCILIATION_REQUIRED",
        failureCode: "PROVIDER_ERROR_AFTER_SUBMISSION",
        failureMessage: "The provider failed after the authorization was submitted. Reconcile before any retry.",
      };
    }
    return {
      ...base,
      status: "FAILED",
      failureCode: providerError ? providerError.toUpperCase() : "PAYMENT_REJECTED",
      failureMessage:
        providerError ?? `The provider rejected the paid request with HTTP ${result.response.status}. No retry was made.`,
    };
  }

  private failedBeforeSubmission(code: string, message: string): PaymentExecutionResult {
    return {
      status: "FAILED",
      httpStatus: null,
      data: null,
      contentSha256: null,
      nonce: "",
      validBefore: "",
      amountMinor: "0",
      providerTransaction: null,
      transactionHash: null,
      transferId: null,
      receipt: null,
      failureCode: code,
      failureMessage: message,
    };
  }

  async getTransferById(): Promise<GatewayTransfer | null> {
    return null;
  }

  async searchTransfers(): Promise<GatewayTransfer[]> {
    return [];
  }

  async getBalances(address?: string): Promise<PaymentBalances> {
    const target = address ?? this.payerAddress;
    if (!target) {
      throw new PaymentProviderError("PAYER_NOT_CONFIGURED", "No Arc Mainnet payer address is configured.", 503);
    }
    const balance = await this.#publicClient.readContract({
      address: this.asset as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [target as Address],
    });
    return {
      wallet: {
        balance: balance.toString(),
        formatted: formatUnits(balance, ARC_MAINNET.usdcDecimals),
      },
      gateway: null,
    };
  }

  async getFacilitatorStatus(): Promise<FacilitatorStatus> {
    return {
      reachable: true,
      supportedNetwork: true,
      supportedAsset: true,
      supportedKinds: [
        {
          scheme: "exact",
          network: this.network,
          extra: { assetTransferMethod: "eip3009", asset: this.asset },
        },
      ],
      error: null,
    };
  }

  async getAuthorizationState(input: { from: string; nonce: string }): Promise<boolean> {
    const state = await this.#publicClient.readContract({
      address: this.asset as Address,
      abi: EIP3009_ABI,
      functionName: "authorizationState",
      args: [input.from as Address, input.nonce as Hex],
    });
    return Boolean(state);
  }

  async deposit(): Promise<{ depositTxHash: string; approvalTxHash?: string; formattedAmount: string }> {
    throw new PaymentProviderError(
      "NOT_SUPPORTED",
      "Standard onchain x402 uses wallet USDC; it does not use a Gateway deposit.",
      400,
    );
  }

  async withdraw(): Promise<{ mintTxHash: string; formattedAmount: string }> {
    throw new PaymentProviderError(
      "NOT_SUPPORTED",
      "Standard onchain x402 uses wallet USDC; it does not use a Gateway withdrawal.",
      400,
    );
  }
}
