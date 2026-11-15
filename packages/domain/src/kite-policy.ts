import type { Decimal } from "decimal.js";
import { decimal } from "./decimal.js";

export type KiteSessionPolicy = {
  sessionId: string;
  status: "active" | "expired" | "used_up" | "revoked";
  asset: string;
  maxPerTransaction: string;
  maxTotal: string;
  spentTotal: string;
  reservedTotal: string;
  expiresAt: string;
};

export type KitePaymentIntent = {
  amount: string;
  asset: string;
  idempotencyKey: string;
  now?: Date;
};

export type KitePolicyDecision =
  | { allowed: true; remainingTotal: string }
  | {
      allowed: false;
      code:
        | "session_rule_exceeded"
        | "session_total_exceeded"
        | "session_expired"
        | "session_asset_forbidden"
        | "session_inactive"
        | "idempotency_required"
        | "invalid_amount";
      message: string;
    };

export function evaluateKitePayment(
  session: KiteSessionPolicy,
  intent: KitePaymentIntent,
): KitePolicyDecision {
  if (!intent.idempotencyKey || intent.idempotencyKey.trim().length < 8) {
    return { allowed: false, code: "idempotency_required", message: "A stable idempotency key is required." };
  }
  if (session.status !== "active") {
    return { allowed: false, code: "session_inactive", message: "The spending session is not active." };
  }
  if (new Date(session.expiresAt).getTime() <= (intent.now ?? new Date()).getTime()) {
    return { allowed: false, code: "session_expired", message: "The spending session has expired." };
  }
  if (session.asset.toUpperCase() !== intent.asset.toUpperCase()) {
    return { allowed: false, code: "session_asset_forbidden", message: "The payment asset is outside the approved session." };
  }

  let amount: Decimal;
  let perTx: Decimal;
  let total: Decimal;
  let spent: Decimal;
  let reserved: Decimal;
  try {
    amount = decimal(intent.amount);
    perTx = decimal(session.maxPerTransaction);
    total = decimal(session.maxTotal);
    spent = decimal(session.spentTotal);
    reserved = decimal(session.reservedTotal);
  } catch {
    return { allowed: false, code: "invalid_amount", message: "Amounts must be decimal strings." };
  }

  if (!amount.isFinite() || amount.lte(0)) {
    return { allowed: false, code: "invalid_amount", message: "Payment amount must be positive." };
  }
  if (amount.gt(perTx)) {
    return {
      allowed: false,
      code: "session_rule_exceeded",
      message: "Payment amount exceeds the session's per-transaction limit.",
    };
  }
  const committed = spent.plus(reserved);
  if (committed.plus(amount).gt(total)) {
    return {
      allowed: false,
      code: "session_total_exceeded",
      message: "The payment would exceed the session's total budget.",
    };
  }
  return { allowed: true, remainingTotal: total.minus(committed).minus(amount).toFixed(8) };
}
