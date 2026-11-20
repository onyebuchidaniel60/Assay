import { createHash } from "node:crypto";

/**
 * Deterministic spending policy for Assay external-data payments.
 *
 * This module is deliberately pure: it never performs I/O, never reads
 * environment variables and never accepts an amount, asset, network, merchant
 * or recipient supplied by a language model. Every field comes from the
 * provider's signed/structured x402 requirements or from operator-managed
 * server configuration.
 */

export const PAYMENT_POLICY_VERSION = "arc-payment-policy-v1";

export const PAYMENT_POLICY_CODES = [
  "idempotency_required",
  "session_inactive",
  "session_expired",
  "payment_provider_forbidden",
  "payment_endpoint_forbidden",
  "payment_network_forbidden",
  "payment_asset_forbidden",
  "payment_scheme_forbidden",
  "payment_recipient_forbidden",
  "session_rule_exceeded",
  "session_total_exceeded",
  "invalid_amount",
  "duplicate_payment",
  "idempotency_conflict",
  "payment_requirement_mismatch",
  "payment_not_configured",
] as const;

export type PaymentPolicyCode = (typeof PAYMENT_POLICY_CODES)[number];

export type PaymentRequirement = {
  scheme: string;
  /** CAIP-2 network identifier, for example eip155:5042002. */
  network: string;
  /** Token contract address, for example Arc Testnet USDC. */
  asset: string;
  /** Integer amount in the token's smallest unit (USDC has 6 decimals). */
  amountMinor: string;
  /** Recipient / seller wallet address. */
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
};

export type PaymentIntent = {
  providerId: string;
  /** Exact endpoint or resource URL that will be paid. */
  endpoint: string;
  requirement: PaymentRequirement;
};

export type SpendingPolicy = {
  /** Operator-defined session identifier. The database row is authoritative at execution time. */
  sessionId: string;
  status: "active" | "expired" | "revoked" | "exhausted";
  /** Provider allowlist. */
  allowedProviders: string[];
  /** Exact endpoint allowlist (case-sensitive, query string included). */
  allowedEndpoints: string[];
  /** CAIP-2 network allowlist. */
  allowedNetworks: string[];
  /** Token contract allowlist. */
  allowedAssets: string[];
  /** Recipient allowlist (0x addresses, compared case-insensitively). */
  allowedRecipients: string[];
  /** Hard per-payment cap in minor units. */
  maxPerTransactionMinor: string;
  /** Hard aggregate session cap in minor units. */
  maxTotalMinor: string;
  /** Already settled or submitted spend in minor units. */
  spentTotalMinor: string;
  /** Authorized but not yet settled spend in minor units. */
  reservedTotalMinor: string;
  /** Session/authorization expiry (ISO-8601). */
  expiresAt: string;
  idempotencyKey: string;
  /** SHA-256 of the canonical provider/endpoint/requirement. */
  requestFingerprint: string;
  /** Optional prior intent with the same idempotency key. */
  priorIntent?: {
    fingerprint: string;
    status:
      | "PROPOSED"
      | "POLICY_REJECTED"
      | "AUTHORIZED"
      | "SUBMITTING"
      | "SUBMITTED"
      | "CONFIRMED"
      | "RECONCILIATION_REQUIRED"
      | "RECONCILED"
      | "FAILED"
      | "CANCELLED";
  };
  /** Optional prior provider nonce, used to reject a duplicate authorization. */
  priorNonce?: string;
  now?: Date;
};

export type PaymentPolicyDecision =
  | {
      allowed: true;
      remainingTotalMinor: string;
      policyVersion: typeof PAYMENT_POLICY_VERSION;
    }
  | {
      allowed: false;
      code: PaymentPolicyCode;
      message: string;
      policyVersion: typeof PAYMENT_POLICY_VERSION;
    };

function deny(code: PaymentPolicyCode, message: string): PaymentPolicyDecision {
  return { allowed: false, code, message, policyVersion: PAYMENT_POLICY_VERSION };
}

function parseMinor(value: string, label: string): bigint {
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a non-negative integer string.`);
  return BigInt(value);
}

function isAllowed(value: string, allowlist: string[], caseInsensitive = false): boolean {
  if (allowlist.length === 0) return false;
  return allowlist.some((entry) =>
    caseInsensitive ? entry.toLowerCase() === value.toLowerCase() : entry === value,
  );
}

/**
 * Endpoint allowlisting is origin+path based. Query parameters are allowed to
 * vary because they select the requested data (for example a ticker), while a
 * different host or path is never permitted.
 */
export function isEndpointAllowed(endpoint: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return false;
  let requested: URL;
  try {
    requested = new URL(endpoint);
  } catch {
    return false;
  }
  return allowlist.some((entry) => {
    if (entry === endpoint) return true;
    try {
      const allowed = new URL(entry);
      return (
        allowed.protocol === requested.protocol &&
        allowed.host === requested.host &&
        allowed.pathname === requested.pathname
      );
    } catch {
      return false;
    }
  });
}

/**
 * Stable fingerprint of everything a policy decision depends on. The same
 * idempotency key with a different fingerprint is an idempotency conflict.
 */
export function paymentRequestFingerprint(intent: PaymentIntent): string {
  const canonical = JSON.stringify({
    providerId: intent.providerId,
    endpoint: intent.endpoint,
    requirement: {
      scheme: intent.requirement.scheme,
      network: intent.requirement.network,
      asset: intent.requirement.asset.toLowerCase(),
      amountMinor: intent.requirement.amountMinor,
      payTo: intent.requirement.payTo.toLowerCase(),
      maxTimeoutSeconds: intent.requirement.maxTimeoutSeconds,
      extra: intent.requirement.extra ?? null,
    },
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function evaluatePaymentPolicy(
  policy: SpendingPolicy,
  intent: PaymentIntent,
): PaymentPolicyDecision {
  const key = policy.idempotencyKey.trim();
  if (key.length < 8 || key.length > 200) {
    return deny("idempotency_required", "A stable idempotency key of 8–200 characters is required.");
  }

  if (policy.status !== "active") {
    return deny("session_inactive", "The spending session is not active.");
  }

  const now = policy.now ?? new Date();
  if (!Number.isFinite(new Date(policy.expiresAt).getTime())) {
    return deny("session_inactive", "The spending session has no valid expiry.");
  }
  if (new Date(policy.expiresAt).getTime() <= now.getTime()) {
    return deny("session_expired", "The spending session has expired.");
  }

  if (!isAllowed(intent.providerId, policy.allowedProviders)) {
    return deny("payment_provider_forbidden", "The provider is not on the approved payment allowlist.");
  }
  if (!isEndpointAllowed(intent.endpoint, policy.allowedEndpoints)) {
    return deny("payment_endpoint_forbidden", "The endpoint is not on the approved payment allowlist.");
  }
  if (!isAllowed(intent.requirement.network, policy.allowedNetworks)) {
    return deny("payment_network_forbidden", "The payment network is not permitted for this session.");
  }
  if (!isAllowed(intent.requirement.asset, policy.allowedAssets, true)) {
    return deny("payment_asset_forbidden", "The payment asset is not permitted for this session.");
  }
  if (intent.requirement.scheme !== "exact") {
    return deny("payment_scheme_forbidden", "Only the x402 exact payment scheme is permitted.");
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(intent.requirement.payTo)) {
    return deny("payment_recipient_forbidden", "The payment recipient is not a valid EVM address.");
  }
  if (!isAllowed(intent.requirement.payTo, policy.allowedRecipients, true)) {
    return deny("payment_recipient_forbidden", "The payment recipient is not on the approved recipient allowlist.");
  }

  if (!/^\d+$/.test(intent.requirement.amountMinor)) {
    return deny("invalid_amount", "The provider amount must be an integer in token minor units.");
  }

  let amount: bigint;
  let perTx: bigint;
  let total: bigint;
  let spent: bigint;
  let reserved: bigint;
  try {
    amount = parseMinor(intent.requirement.amountMinor, "amount");
    perTx = parseMinor(policy.maxPerTransactionMinor, "maxPerTransactionMinor");
    total = parseMinor(policy.maxTotalMinor, "maxTotalMinor");
    spent = parseMinor(policy.spentTotalMinor, "spentTotalMinor");
    reserved = parseMinor(policy.reservedTotalMinor, "reservedTotalMinor");
  } catch {
    return deny("invalid_amount", "Configured payment amounts must be integer strings.");
  }

  if (amount <= 0n) {
    return deny("invalid_amount", "The payment amount must be positive.");
  }
  if (amount > perTx) {
    return deny("session_rule_exceeded", "Payment amount exceeds the session's per-transaction limit.");
  }

  const committed = spent + reserved;
  if (committed + amount > total) {
    return deny("session_total_exceeded", "The payment would exceed the session's total budget.");
  }

  if (policy.priorIntent) {
    if (policy.priorIntent.fingerprint !== policy.requestFingerprint) {
      return deny(
        "idempotency_conflict",
        "This idempotency key was already used with different provider, endpoint or payment requirements.",
      );
    }
    if (
      [
        "AUTHORIZED",
        "SUBMITTING",
        "SUBMITTED",
        "CONFIRMED",
        "RECONCILIATION_REQUIRED",
        "RECONCILED",
      ].includes(policy.priorIntent.status)
    ) {
      return deny("duplicate_payment", "A payment for this request already exists. Reconcile it instead of paying again.");
    }
  }

  if (policy.priorNonce && policy.priorNonce.length > 0) {
    return deny("duplicate_payment", "The provider authorization nonce has already been used.");
  }

  return {
    allowed: true,
    remainingTotalMinor: (total - committed - amount).toString(),
    policyVersion: PAYMENT_POLICY_VERSION,
  };
}
