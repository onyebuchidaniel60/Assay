import { createHash } from "node:crypto";
import type { CalculationInput, CalculationResult } from "./calculation.js";

function toMinorUnits(value: string, decimals = 8): bigint {
  const normalized = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new Error("Invalid decimal string.");
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const parts = unsigned.split(".");
  const whole = parts[0] ?? "0";
  const fraction = parts[1] ?? "";
  if (fraction.length > decimals) throw new Error("Too many decimal places.");
  const padded = fraction.padEnd(decimals, "0");
  const units = (whole === "" ? 0n : BigInt(whole)) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  return negative ? -units : units;
}

export type VerificationResult = {
  result: "VERIFIED" | "FAILED" | "INCOMPLETE" | "STALE";
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  recomputedValue: string | null;
  failureCodes: string[];
};

export function verifyCalculation(
  input: CalculationInput,
  primary: CalculationResult,
  dependencies: { snapshotHash: string; currentSnapshotHash: string; formulaHash: string; currentFormulaHash: string },
): VerificationResult {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  const failureCodes: string[] = [];

  const check = (id: string, ok: boolean, detail: string) => {
    checks.push({ id, ok, detail });
    if (!ok) failureCodes.push(id);
  };

  check(
    "dependencies_current",
    dependencies.snapshotHash === dependencies.currentSnapshotHash,
    "Assessment snapshot hash must still equal the current dependency snapshot.",
  );
  check(
    "formula_current",
    dependencies.formulaHash === dependencies.currentFormulaHash,
    "Approved formula hash must still equal the formula used by the assessment.",
  );

  try {
    const debt = toMinorUnits(input.debt);
    const ebitda = toMinorUnits(input.reportedEbitda);
    const addbacks = (input.addBacks ?? [])
      .filter((item) => item.eligible)
      .reduce((total, item) => total + toMinorUnits(item.amount), 0n);
    const adjusted = ebitda + addbacks;
    const threshold = BigInt(input.thresholdBps);
    const compliant = debt * 10000n <= adjusted * threshold;
    // Match the primary Decimal engine's ROUND_HALF_UP at 8 decimal places
    // without using floating point or the primary result itself.
    const scaled = adjusted === 0n ? 0n : (debt * 100_000_000n + adjusted / 2n) / adjusted;
    const recomputedValue =
      adjusted === 0n
        ? null
        : `${scaled / 100_000_000n}.${String(scaled % 100_000_000n).padStart(8, "0")}`;

    check("inputs_valid", adjusted > 0n && debt >= 0n, "Debt must be non-negative and adjusted EBITDA must be positive.");
    check("threshold_valid", threshold > 0n && threshold <= 1_000_000n, "Threshold basis points must be positive and bounded.");
    check("currency_match", (input.currency ?? "").toUpperCase() === primary.currency.toUpperCase(), "Currencies must match.");
    check("primary_ratio_matches", recomputedValue !== null && recomputedValue === primary.ratio, "Primary ratio must match the independent recomputation.");
    check("primary_classification_matches", compliant === primary.compliant, "Primary classification must match the independent predicate.");

    const result = checks.every((item) => item.ok) ? "VERIFIED" : "FAILED";
    return { result, checks, recomputedValue, failureCodes };
  } catch {
    check("independent_recompute", false, "Independent reference evaluator could not parse the snapshot.");
    return { result: "FAILED", checks, recomputedValue: null, failureCodes };
  }
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
