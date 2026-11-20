import { createHash } from "node:crypto";
import { z } from "zod";
import { PaymentRequestError } from "./errors.js";
import type { PaymentSettlementReceipt, X402Accept, X402Quote } from "./types.js";

export const PAYMENT_REQUIRED_HEADER = "PAYMENT-REQUIRED";
export const PAYMENT_SIGNATURE_HEADER = "PAYMENT-SIGNATURE";
export const PAYMENT_RESPONSE_HEADER = "PAYMENT-RESPONSE";
export const GATEWAY_BATCHING_NAME = "GatewayWalletBatched";

const evmAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Expected a 20-byte EVM address.");
const hex = z.string().regex(/^0x[0-9a-fA-F]+$/, "Expected a hex value.");

export const x402AcceptSchema = z
  .object({
    scheme: z.string().min(1),
    network: z.string().min(3, "Expected a CAIP-2 network identifier."),
    asset: z.string().min(1, "Expected a token identifier."),
    amount: z.string().regex(/^\d+$/, "Expected an integer amount in minor units."),
    payTo: z.string().min(1, "Expected a recipient identifier."),
    maxTimeoutSeconds: z.number().int().positive(),
    extra: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const paymentRequiredSchema = z
  .object({
    x402Version: z.number().int().positive(),
    error: z.string().optional(),
    resource: z
      .object({
        url: z.string().url(),
        description: z.string().optional(),
        mimeType: z.string().optional(),
      })
      .passthrough()
      .optional(),
    accepts: z.array(x402AcceptSchema).min(1),
    extensions: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const settlementReceiptSchema = z
  .object({
    success: z.boolean(),
    transaction: z.string().optional(),
    network: z.string().optional(),
    payer: z.string().optional(),
    errorReason: z.string().optional(),
  })
  .passthrough();

export const paymentPayloadSchema = z
  .object({
    x402Version: z.number().int().positive(),
    payload: z
      .object({
        authorization: z
          .object({
            from: evmAddress,
            to: evmAddress,
            value: z.string().regex(/^\d+$/),
            validAfter: z.string().regex(/^\d+$/),
            validBefore: z.string().regex(/^\d+$/),
            nonce: hex,
          })
          .passthrough(),
        signature: hex,
      })
      .passthrough(),
  })
  .passthrough();

export function decodeBase64Json(value: string, label: string): unknown {
  let decoded: string;
  try {
    decoded = Buffer.from(value, "base64").toString("utf8");
  } catch {
    throw new PaymentRequestError("PAYMENT_HEADER_INVALID", `${label} is not valid base64.`);
  }
  try {
    return JSON.parse(decoded);
  } catch {
    throw new PaymentRequestError("PAYMENT_HEADER_INVALID", `${label} is not valid JSON.`);
  }
}

export function parsePaymentRequiredHeader(header: string | null): z.infer<typeof paymentRequiredSchema> {
  if (!header) {
    throw new PaymentRequestError(
      "PAYMENT_REQUIRED_HEADER_MISSING",
      "The provider returned 402 without a PAYMENT-REQUIRED header.",
    );
  }
  return paymentRequiredSchema.parse(decodeBase64Json(header, "PAYMENT-REQUIRED"));
}

export function parseSettlementReceipt(header: string | null): PaymentSettlementReceipt | null {
  if (!header) return null;
  try {
    const parsed = settlementReceiptSchema.safeParse(decodeBase64Json(header, "PAYMENT-RESPONSE"));
    return parsed.success ? (parsed.data as PaymentSettlementReceipt) : null;
  } catch {
    return null;
  }
}

function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

export function selectGatewayOption(
  paymentRequired: z.infer<typeof paymentRequiredSchema>,
  expected: { network: string; asset: string; gatewayWallet: string },
): X402Accept {
  const candidates = paymentRequired.accepts.filter((option) => {
    const extra = option.extra ?? {};
    return (
      option.scheme === "exact" &&
      option.network === expected.network &&
      option.asset.toLowerCase() === expected.asset.toLowerCase() &&
      extra.name === GATEWAY_BATCHING_NAME &&
      typeof extra.verifyingContract === "string" &&
      extra.verifyingContract.toLowerCase() === expected.gatewayWallet.toLowerCase()
    );
  });
  if (candidates.length === 0) {
    throw new PaymentRequestError(
      "GATEWAY_OPTION_UNAVAILABLE",
      `The provider does not offer a Circle Gateway option on ${expected.network} with the expected USDC and Gateway Wallet contracts.`,
    );
  }
  return candidates.sort((a, b) => {
    const versionA = Number((a.extra ?? {}).version ?? 0);
    const versionB = Number((b.extra ?? {}).version ?? 0);
    return versionB - versionA;
  })[0]!;
}

export function selectExactOption(
  paymentRequired: z.infer<typeof paymentRequiredSchema>,
  expected: { network: string; asset: string },
): X402Accept {
  const candidates = paymentRequired.accepts.filter((option) => {
    const extra = option.extra ?? {};
    return (
      option.scheme === "exact" &&
      option.network === expected.network &&
      option.asset.toLowerCase() === expected.asset.toLowerCase() &&
      extra.name !== GATEWAY_BATCHING_NAME
    );
  });
  if (candidates.length === 0) {
    throw new PaymentRequestError(
      "X402_OPTION_UNAVAILABLE",
      `The provider does not offer a standard x402 exact option on ${expected.network} with the expected USDC contract.`,
    );
  }
  const eip3009 = candidates.filter((option) => option.extra?.assetTransferMethod === "eip3009");
  return (eip3009[0] ?? candidates[0])!;
}

export function buildQuote(input: {
  paymentRequired: z.infer<typeof paymentRequiredSchema>;
  accepted: X402Accept;
  requestedUrl: string;
  fetchedAt: Date;
}): X402Quote {
  const resource = input.paymentRequired.resource;
  if (!resource) {
    throw new PaymentRequestError(
      "PAYMENT_RESOURCE_MISSING",
      "The provider's 402 response did not identify the paid resource.",
    );
  }
  if (normalizeUrl(resource.url) !== normalizeUrl(input.requestedUrl)) {
    throw new PaymentRequestError(
      "PAYMENT_RESOURCE_MISMATCH",
      "The provider's paid resource does not match the requested endpoint.",
    );
  }
  const canonical = JSON.stringify({
    x402Version: input.paymentRequired.x402Version,
    resource: resource.url,
    accepted: {
      scheme: input.accepted.scheme,
      network: input.accepted.network,
      asset: input.accepted.asset.toLowerCase(),
      amount: input.accepted.amount,
      payTo: input.accepted.payTo.toLowerCase(),
      maxTimeoutSeconds: input.accepted.maxTimeoutSeconds,
      extra: input.accepted.extra ?? null,
    },
  });  return {
    x402Version: input.paymentRequired.x402Version,
    resource: resource as X402Quote["resource"],
    accepted: input.accepted,
    accepts: input.paymentRequired.accepts,
    quoteSha256: createHash("sha256").update(canonical).digest("hex"),
    fetchedAt: input.fetchedAt.toISOString(),
    // A quote is only executable for the shorter of the seller's timeout and
    // Assay's local authorization window. The API re-checks the stored quote.
    expiresAt: new Date(
      input.fetchedAt.getTime() + Math.min(input.accepted.maxTimeoutSeconds, 300) * 1000,
    ).toISOString(),
  };
}

export function encodePaymentSignature(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function isTransactionHash(value: string | null | undefined): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}
