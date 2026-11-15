import { canonicalize, sha256 } from "@assay/domain";

export function currencyExponent(currency: string): number {
  if (currency === "JPY" || currency === "KRW") return 0;
  if (currency === "BHD" || currency === "KWD" || currency === "OMR") return 3;
  return 2;
}

export function minorToDecimalString(minor: string, currency = "USD"): string {
  const exponent = currencyExponent(currency);
  const value = BigInt(minor);
  if (exponent === 0) return value.toString();
  const divisor = 10n ** BigInt(exponent);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(exponent, "0");
  return `${whole}.${fraction}`;
}

export function decimalStringToMinor(value: string, currency = "USD"): string {
  const exponent = currencyExponent(currency);
  const [whole = "0", fraction = ""] = value.split(".");
  return `${BigInt(whole)}${fraction.padEnd(exponent, "0").slice(0, exponent)}`.replace(/^0+(?=\d)/, "");
}

export type PermittedAddback = {
  code: string;
  description: string;
  conditions: string[];
  capMinor: string | null;
};

export type InputAddback = { code: string; amountMinor: string; sourceReference?: string | undefined };

export type AppliedAddback = {
  code: string;
  requestedMinor: string;
  appliedMinor: string;
  cappedMinor: string;
  sourceReference: string | null;
};

export type AdjustedAddbacks = {
  applied: AppliedAddback[];
  adjustedTotalMinor: string;
  capApplied: boolean;
};

export function applyAddbackCaps(
  permitted: PermittedAddback[],
  inputs: InputAddback[],
): AdjustedAddbacks {
  const byCode = new Map(permitted.map((item) => [item.code, item]));
  const seen = new Set<string>();
  const usedByCode = new Map<string, bigint>();
  const applied: AppliedAddback[] = [];
  let capApplied = false;

  for (const input of inputs) {
    const rule = byCode.get(input.code);
    if (!rule) {
      throw new Error(`Add-back code "${input.code}" is not permitted by the confirmed covenant terms.`);
    }
    if (seen.has(input.code)) {
      throw new Error(`Add-back code "${input.code}" is duplicated.`);
    }
    seen.add(input.code);
    const requested = BigInt(input.amountMinor);
    const used = usedByCode.get(input.code) ?? 0n;
    let grant = requested;
    if (rule.capMinor !== null) {
      const cap = BigInt(rule.capMinor);
      const remaining = cap > used ? cap - used : 0n;
      grant = requested < remaining ? requested : remaining;
      if (grant < requested) capApplied = true;
    }
    usedByCode.set(input.code, used + grant);
    applied.push({
      code: input.code,
      requestedMinor: requested.toString(),
      appliedMinor: grant.toString(),
      cappedMinor: (requested - grant).toString(),
      sourceReference: input.sourceReference ?? null,
    });
  }

  const adjustedTotal = applied.reduce((total, item) => total + BigInt(item.appliedMinor), 0n);
  return { applied, adjustedTotalMinor: adjustedTotal.toString(), capApplied };
}

export type FinancialSnapshot = {
  currency: string;
  reportedEbitdaMinor: string;
  totalDebtMinor: string;
  addbacks: AppliedAddback[];
  adjustedEbitdaMinor: string;
  capApplied: boolean;
  attestedAt: string;
  testDate: string;
};

export function financialSnapshotHash(snapshot: FinancialSnapshot): string {
  return sha256(canonicalize(snapshot));
}

export function adjustedEbitdaMinor(snapshot: { reportedEbitdaMinor: string; addbacks: Array<{ appliedMinor: string }> }): string {
  return (
    BigInt(snapshot.reportedEbitdaMinor) +
    snapshot.addbacks.reduce((total, item) => total + BigInt(item.appliedMinor), 0n)
  ).toString();
}
