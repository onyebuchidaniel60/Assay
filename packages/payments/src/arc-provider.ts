import { createHash } from "node:crypto";
import {
  BatchEvmScheme,
  CHAIN_CONFIGS,
  GatewayClient,
} from "@circle-fin/x402-batching/client";
import { createPublicClient, erc20Abi, formatUnits, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ARC_TESTNET,
  isArcTestnetAsset,
  isArcTestnetNetwork,
  verifyArcSdkConfig,
} from "./arc-config.js";
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
  selectGatewayOption,
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
  X402Quote,
} from "./types.js";

export type ArcCircleGatewayConfig = {
  privateKey?: string;
  payerAddress?: string;
  rpcUrl?: string;
  facilitatorUrl?: string;
  network?: string;
  asset?: string;
  gatewayWallet?: string;
  requestTimeoutMs?: number;
  allowCustomFacilitator?: boolean;
};

type FetchResult = {
  response: Response;
  bodyText: string;
  contentSha256: string;
};

function asAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  return value as Address;
}

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

export class ArcCircleGatewayProvider implements PaymentProvider {
  readonly id = "arc-circle-gateway";
  readonly displayName = "Arc Testnet · Circle Gateway";
  readonly network: string;
  readonly chainId: number;
  readonly asset: string;
  readonly assetSymbol = "USDC";
  readonly gatewayWallet: string;
  readonly gatewayDomain: number;
  readonly facilitatorUrl: string;

  readonly #configuredPayerAddress: string | undefined;
  readonly #privateKey: Hex | undefined;
  readonly #account: ReturnType<typeof privateKeyToAccount> | undefined;
  readonly #scheme: BatchEvmScheme | undefined;
  readonly #gatewayClient: GatewayClient | undefined;
  private readonly rpcUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly apiBase: string;

  constructor(config: ArcCircleGatewayConfig = {}) {
    const sdk = verifyArcSdkConfig();
    this.#configuredPayerAddress = config.payerAddress;
    this.network = config.network ?? ARC_TESTNET.network;
    this.asset = config.asset ?? ARC_TESTNET.usdc;
    this.gatewayWallet = config.gatewayWallet ?? ARC_TESTNET.gatewayWallet;
    this.chainId = sdk.chainId;
    this.gatewayDomain = sdk.gatewayDomain;
    this.facilitatorUrl = (config.facilitatorUrl ?? ARC_TESTNET.facilitatorUrl).replace(/\/$/, "");
    this.requestTimeoutMs = config.requestTimeoutMs ?? 20_000;
    this.rpcUrl = config.rpcUrl ?? ARC_TESTNET.rpcUrl;

    if (!isArcTestnetNetwork(this.network)) {
      throw new Error(`ArcCircleGatewayProvider only supports ${ARC_TESTNET.network}; received ${this.network}.`);
    }
    if (!isArcTestnetAsset(this.asset)) {
      throw new Error(`ArcCircleGatewayProvider only supports Arc Testnet USDC ${ARC_TESTNET.usdc}.`);
    }
    if (this.gatewayWallet.toLowerCase() !== ARC_TESTNET.gatewayWallet.toLowerCase()) {
      throw new Error(`Refusing an unexpected Gateway Wallet address: ${this.gatewayWallet}.`);
    }
    const parsedFacilitator = new URL(this.facilitatorUrl);
    const defaultHost = new URL(ARC_TESTNET.facilitatorUrl).host;
    if (
      !config.allowCustomFacilitator &&
      (parsedFacilitator.protocol !== "https:" || parsedFacilitator.host !== defaultHost)
    ) {
      throw new Error(
        `Refusing a custom facilitator. Expected https://${defaultHost}; set allowCustomFacilitator only for isolated tests.`,
      );
    }
    this.apiBase = `${this.facilitatorUrl}/v1`;

    if (config.privateKey) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(config.privateKey)) {
        throw new Error("ARC_TESTNET_PRIVATE_KEY must be a 32-byte 0x-prefixed hex value.");
      }
      this.#privateKey = config.privateKey as Hex;
      this.#account = privateKeyToAccount(this.#privateKey);
      if (config.payerAddress && config.payerAddress.toLowerCase() !== this.#account.address.toLowerCase()) {
        throw new Error("ARC_TESTNET_PAYER_ADDRESS does not match the configured signing key.");
      }
      this.#scheme = new BatchEvmScheme(this.#account);
      this.#gatewayClient = new GatewayClient({
        chain: "arcTestnet",
        privateKey: this.#privateKey,
        ...(config.rpcUrl ? { rpcUrl: config.rpcUrl } : {}),
      });
    } else {
      if (config.payerAddress && !/^0x[0-9a-fA-F]{40}$/.test(config.payerAddress)) {
        throw new Error("ARC_TESTNET_PAYER_ADDRESS must be a 20-byte EVM address.");
      }
      this.#privateKey = undefined;
      this.#account = undefined;
      this.#scheme = undefined;
      this.#gatewayClient = undefined;
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
      network: this.network,
      chainId: this.chainId,
      asset: this.asset,
      assetSymbol: this.assetSymbol,
      gatewayWallet: this.gatewayWallet,
      gatewayDomain: this.gatewayDomain,
      facilitatorUrl: this.facilitatorUrl,
      payerAddress: this.payerAddress,
      signingKeyConfigured: this.signingKeyConfigured,
    };
  }

  private requireSigner(): { scheme: BatchEvmScheme; client: GatewayClient; account: ReturnType<typeof privateKeyToAccount> } {
    if (!this.#scheme || !this.#gatewayClient || !this.#account) {
      throw new PaymentProviderError(
        "PAYMENT_SIGNER_NOT_CONFIGURED",
        "The Arc payment signing key is not configured on this server.",
        503,
      );
    }
    return { scheme: this.#scheme, client: this.#gatewayClient, account: this.#account };
  }

  private async timedFetch(url: string, init: RequestInit = {}, timeoutMs = this.requestTimeoutMs): Promise<FetchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const bodyText = await response.text();
      return {
        response,
        bodyText,
        contentSha256: contentHash(bodyText),
      };
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
      const accepted = selectGatewayOption(required, {
        network: this.network,
        asset: this.asset,
        gatewayWallet: this.gatewayWallet,
      });
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
    const { scheme, account } = this.requireSigner();
    const option = selectGatewayOption(
      { x402Version: input.quote.x402Version, accepts: input.quote.accepts },
      { network: this.network, asset: this.asset, gatewayWallet: this.gatewayWallet },
    );
    if (
      option.amount !== input.quote.accepted.amount ||
      option.payTo.toLowerCase() !== input.quote.accepted.payTo.toLowerCase()
    ) {
      return this.failedBeforeSubmission("QUOTE_CHANGED", "The provider's payment requirements changed after the quote.");
    }

    const sdkOption = {
      scheme: option.scheme,
      network: option.network,
      asset: option.asset,
      amount: option.amount,
      payTo: option.payTo,
      maxTimeoutSeconds: option.maxTimeoutSeconds,
      ...(option.extra ? { extra: option.extra } : {}),
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
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(input.body !== undefined ? { "content-type": "application/json" } : {}),
      ...input.headers,
      [PAYMENT_SIGNATURE_HEADER]: header,
    };

    let result: FetchResult;
    try {
      result = await this.timedFetch(
        input.url,
        {
          method: input.method ?? "GET",
          headers,
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
        return {
          ...base,
          status: "CONFIRMED",
          failureCode: null,
          failureMessage: null,
        };
      }
      return {
        ...base,
        status: "RECONCILIATION_REQUIRED",
        failureCode: "SETTLEMENT_UNVERIFIED",
        failureMessage:
          "The provider returned data but did not return a verifiable settlement receipt. Reconcile before treating the payment as settled.",
      };
    }

    const body = safeJson(result.bodyText) as { error?: unknown; message?: unknown } | null;
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
        failureMessage: "The Gateway balance is insufficient. No data was purchased.",
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

  async getTransferById(id: string): Promise<GatewayTransfer | null> {
    const result = await this.timedFetch(`${this.apiBase}/x402/transfers/${encodeURIComponent(id)}`, {
      headers: { accept: "application/json" },
    });
    if (result.response.status === 404) return null;
    if (!result.response.ok) {
      throw new PaymentProviderError(
        "TRANSFER_LOOKUP_FAILED",
        `Gateway transfer lookup failed with HTTP ${result.response.status}.`,
        502,
      );
    }
    const parsed = safeJson(result.bodyText) as GatewayTransfer | null;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.status !== "string") {
      throw new PaymentProviderError("TRANSFER_RESPONSE_INVALID", "Gateway returned an invalid transfer payload.", 502);
    }
    return parsed;
  }

  async searchTransfers(input: {
    from?: string;
    to?: string;
    nonce?: string;
    network?: string;
    status?: string;
    pageSize?: number;
  }): Promise<GatewayTransfer[]> {
    const query = new URLSearchParams();
    if (input.from) query.set("from", input.from);
    if (input.to) query.set("to", input.to);
    if (input.nonce) query.set("nonce", input.nonce);
    query.set("network", input.network ?? this.network);
    if (input.status) query.set("status", input.status);
    query.set("token", "USDC");
    query.set("pageSize", String(Math.max(1, Math.min(50, input.pageSize ?? 20))));
    const result = await this.timedFetch(`${this.apiBase}/x402/transfers?${query.toString()}`, {
      headers: { accept: "application/json" },
    });
    if (!result.response.ok) {
      throw new PaymentProviderError(
        "TRANSFER_SEARCH_FAILED",
        `Gateway transfer search failed with HTTP ${result.response.status}.`,
        502,
      );
    }
    const parsed = safeJson(result.bodyText) as { transfers?: GatewayTransfer[] } | null;
    return Array.isArray(parsed?.transfers) ? parsed.transfers : [];
  }

  async getBalances(address?: string): Promise<PaymentBalances> {
    const target = address ?? this.payerAddress;
    if (!target) {
      throw new PaymentProviderError("PAYER_NOT_CONFIGURED", "No Arc payer address is configured.", 503);
    }
    const gateway = await this.getGatewayBalance(target);
    let wallet: PaymentBalances["wallet"] = null;
    try {
      const publicClient = createPublicClient({
        chain: CHAIN_CONFIGS.arcTestnet.chain,
        transport: http(this.rpcUrl),
      });
      const balance = await publicClient.readContract({
        address: this.asset as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [target as Address],
      });
      wallet = { balance: balance.toString(), formatted: formatUnits(balance, ARC_TESTNET.usdcDecimals) };
    } catch {
      wallet = null;
    }
    return { wallet, gateway };
  }

  private async getGatewayBalance(address: string): Promise<PaymentBalances["gateway"]> {
    const result = await this.timedFetch(`${this.apiBase}/balances`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        token: "USDC",
        sources: [{ depositor: address, domain: this.gatewayDomain }],
      }),
    });
    if (!result.response.ok) {
      throw new PaymentProviderError(
        "BALANCE_LOOKUP_FAILED",
        `Gateway balance lookup failed with HTTP ${result.response.status}.`,
        502,
      );
    }
    const parsed = safeJson(result.bodyText) as {
      balances?: Array<{ balance?: string; withdrawing?: string; withdrawable?: string }>;
    } | null;
    const row = parsed?.balances?.[0];
    if (!row || typeof row.balance !== "string") {
      throw new PaymentProviderError("BALANCE_RESPONSE_INVALID", "Gateway returned no USDC balance.", 502);
    }
    const available = row.balance;
    const withdrawing = row.withdrawing ?? "0";
    const withdrawable = row.withdrawable ?? "0";
    const total = (Number(available) + Number(withdrawing)).toFixed(6);
    return {
      total,
      available,
      withdrawing,
      withdrawable,
      formattedTotal: total,
      formattedAvailable: available,
    };
  }

  async getFacilitatorStatus(): Promise<FacilitatorStatus> {
    try {
      const result = await this.timedFetch(`${this.apiBase}/x402/supported`, {
        headers: { accept: "application/json" },
      });
      if (!result.response.ok) {
        return {
          reachable: false,
          supportedNetwork: false,
          supportedAsset: false,
          supportedKinds: [],
          error: `Facilitator returned HTTP ${result.response.status}.`,
        };
      }
      const parsed = safeJson(result.bodyText) as {
        kinds?: Array<{ scheme?: string; network?: string; extra?: Record<string, unknown> }>;
      } | null;
      const kinds = Array.isArray(parsed?.kinds)
        ? parsed.kinds.map((kind) => ({
            scheme: String(kind.scheme ?? ""),
            network: String(kind.network ?? ""),
            ...(kind.extra ? { extra: kind.extra } : {}),
          }))
        : [];
      const networkKinds = kinds.filter((kind) => kind.network === this.network && kind.scheme === "exact");
      const supportedAsset = networkKinds.some((kind) => {
        const extra = kind.extra ?? {};
        const assets = Array.isArray(extra.assets) ? extra.assets : [];
        if (assets.length > 0) {
          return assets.some((asset) => {
            if (!asset || typeof asset !== "object") return false;
            const address = (asset as Record<string, unknown>).address;
            return typeof address === "string" && address.toLowerCase() === this.asset.toLowerCase();
          });
        }
        const extraAsset = extra.asset;
        return typeof extraAsset !== "string" || extraAsset.toLowerCase() === this.asset.toLowerCase();
      });
      return {
        reachable: true,
        supportedNetwork: networkKinds.length > 0,
        supportedAsset,
        supportedKinds: kinds,
        error: null,
      };
    } catch (error) {
      return {
        reachable: false,
        supportedNetwork: false,
        supportedAsset: false,
        supportedKinds: [],
        error: error instanceof Error ? error.message : "Facilitator status is unavailable.",
      };
    }
  }

  async deposit(amount: string): Promise<{ depositTxHash: string; approvalTxHash?: string; formattedAmount: string }> {
    const { client } = this.requireSigner();
    const result = await client.deposit(amount);
    return {
      depositTxHash: result.depositTxHash,
      ...(result.approvalTxHash ? { approvalTxHash: result.approvalTxHash } : {}),
      formattedAmount: result.formattedAmount,
    };
  }

  async withdraw(amount: string): Promise<{ mintTxHash: string; formattedAmount: string }> {
    const { client } = this.requireSigner();
    const result = await client.withdraw(amount);
    return { mintTxHash: result.mintTxHash, formattedAmount: result.formattedAmount };
  }

  /** Parse a 402 quote without signing. Used by diagnostics and tests. */
  parseRequirements(input: {
    header: string | null;
    requestedUrl: string;
  }): X402Quote {
    const required = parsePaymentRequiredHeader(input.header);
    const accepted = selectGatewayOption(required, {
      network: this.network,
      asset: this.asset,
      gatewayWallet: this.gatewayWallet,
    });
    return buildQuote({
      paymentRequired: required,
      accepted,
      requestedUrl: input.requestedUrl,
      fetchedAt: new Date(),
    });
  }
}
