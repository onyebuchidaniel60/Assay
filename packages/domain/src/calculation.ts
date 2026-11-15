import { Decimal } from "decimal.js";
import { decimal, decimalString, ratioString } from "./decimal.js";

export type Currency = string;

export type AddBack = {
  label: string;
  amount: string;
  eligible: boolean;
  sourceRef?: string;
};

export type CalculationInput = {
  debt: string;
  reportedEbitda: string;
  addBacks?: AddBack[];
  thresholdBps: number;
  currency: Currency;
  debtCurrency?: Currency;
  ebitdaCurrency?: Currency;
  testDate: string;
  periodStart?: string;
  periodEnd?: string;
};

export type ScenarioKind = "BASELINE" | "EBITDA_DOWNSIDE_10" | "DEBT_UPSIDE_10";

export type ScenarioResult = {
  kind: ScenarioKind;
  debt: string;
  adjustedEbitda: string;
  ratio: string;
  displayRatio: string;
  compliant: boolean;
  headroom: string;
  headroomPct: string;
  status: "COMPLIANT" | "BREACHED" | "INDETERMINATE";
};

export type CalculationResult = {
  currency: Currency;
  testDate: string;
  debt: string;
  reportedEbitda: string;
  eligibleAddBacks: string;
  adjustedEbitda: string;
  thresholdBps: number;
  thresholdRatio: string;
  ratio: string;
  displayRatio: string;
  compliant: boolean;
  headroom: string;
  headroomPct: string;
  trace: string[];
  scenarios: ScenarioResult[];
  indeterminateReason?: string;
};

export class CalculationError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_INPUT" | "ZERO_EBITDA" | "NEGATIVE_EBITDA" | "CURRENCY_MISMATCH" | "PERIOD_MISMATCH",
  ) {
    super(message);
    this.name = "CalculationError";
  }
}

function parseAmount(value: string, label: string): Decimal {
  let amount: Decimal;
  try {
    amount = decimal(value);
  } catch {
    throw new CalculationError(`${label} must be a decimal string.`, "INVALID_INPUT");
  }
  if (!amount.isFinite()) throw new CalculationError(`${label} must be finite.`, "INVALID_INPUT");
  return amount;
}

function thresholdRatio(thresholdBps: number): Decimal {
  if (!Number.isInteger(thresholdBps) || thresholdBps <= 0 || thresholdBps > 1_000_000) {
    throw new CalculationError("Threshold must be a positive integer in basis points.", "INVALID_INPUT");
  }
  return new Decimal(thresholdBps).div(10000);
}

export function calculateLeverage(input: CalculationInput): CalculationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.testDate)) {
    throw new CalculationError("Test date must be an ISO date.", "INVALID_INPUT");
  }
  if (input.periodEnd && input.periodEnd !== input.testDate) {
    throw new CalculationError("EBITDA period must end on the test date.", "PERIOD_MISMATCH");
  }
  const currency = input.currency.toUpperCase();
  if (input.debtCurrency && input.debtCurrency.toUpperCase() !== currency) {
    throw new CalculationError("Debt currency must match the covenant currency.", "CURRENCY_MISMATCH");
  }
  if (input.ebitdaCurrency && input.ebitdaCurrency.toUpperCase() !== currency) {
    throw new CalculationError("EBITDA currency must match the covenant currency.", "CURRENCY_MISMATCH");
  }

  const debt = parseAmount(input.debt, "Debt");
  const reportedEbitda = parseAmount(input.reportedEbitda, "Reported EBITDA");
  if (debt.lt(0)) throw new CalculationError("Debt cannot be negative.", "INVALID_INPUT");
  if (reportedEbitda.lt(0)) throw new CalculationError("EBITDA cannot be negative.", "NEGATIVE_EBITDA");

  const eligible = (input.addBacks ?? []).filter((item) => item.eligible);
  const ineligible = (input.addBacks ?? []).filter((item) => !item.eligible);
  if (ineligible.length > 0) {
    throw new CalculationError("Ineligible add-backs cannot enter the approved calculation.", "INVALID_INPUT");
  }
  const addBackTotal = eligible.reduce((total, item) => {
    const amount = parseAmount(item.amount, `Add-back ${item.label}`);
    if (amount.lt(0)) throw new CalculationError("Add-backs cannot be negative.", "INVALID_INPUT");
    return total.plus(amount);
  }, new Decimal(0));

  const adjustedEbitda = reportedEbitda.plus(addBackTotal);
  if (adjustedEbitda.lte(0)) {
    throw new CalculationError("Adjusted EBITDA must be positive for a leverage calculation.", "ZERO_EBITDA");
  }

  const ratio = debt.div(adjustedEbitda);
  const threshold = thresholdRatio(input.thresholdBps);
  const compliant = debt.mul(10000).lte(adjustedEbitda.mul(input.thresholdBps));
  const headroom = threshold.minus(ratio);
  const headroomPct = headroom.div(threshold).mul(100);

  const scenario = (kind: ScenarioKind, scenarioDebt: Decimal, scenarioEbitda: Decimal): ScenarioResult => {
    if (scenarioEbitda.lte(0)) {
      return {
        kind,
        debt: decimalString(scenarioDebt),
        adjustedEbitda: decimalString(scenarioEbitda),
        ratio: "0.00000000",
        displayRatio: "—",
        compliant: false,
        headroom: "0.00000000",
        headroomPct: "0.00000000",
        status: "INDETERMINATE",
      };
    }
    const scenarioRatio = scenarioDebt.div(scenarioEbitda);
    const scenarioCompliant = scenarioDebt.mul(10000).lte(scenarioEbitda.mul(input.thresholdBps));
    const scenarioHeadroom = threshold.minus(scenarioRatio);
    return {
      kind,
      debt: decimalString(scenarioDebt),
      adjustedEbitda: decimalString(scenarioEbitda),
      ratio: ratioString(scenarioRatio),
      displayRatio: `${scenarioRatio.toFixed(2)}x`,
      compliant: scenarioCompliant,
      headroom: decimalString(scenarioHeadroom),
      headroomPct: decimalString(scenarioHeadroom.div(threshold).mul(100)),
      status: scenarioCompliant ? "COMPLIANT" : "BREACHED",
    };
  };

  const downsideEbitda = adjustedEbitda.mul(90).div(100).toDecimalPlaces(0, Decimal.ROUND_FLOOR);
  const upsideDebt = debt.mul(110).div(100).toDecimalPlaces(0, Decimal.ROUND_CEIL);

  return {
    currency,
    testDate: input.testDate,
    debt: decimalString(debt),
    reportedEbitda: decimalString(reportedEbitda),
    eligibleAddBacks: decimalString(addBackTotal),
    adjustedEbitda: decimalString(adjustedEbitda),
    thresholdBps: input.thresholdBps,
    thresholdRatio: decimalString(threshold),
    ratio: ratioString(ratio),
    displayRatio: `${ratio.toFixed(2)}x`,
    compliant,
    headroom: decimalString(headroom),
    headroomPct: decimalString(headroomPct),
    trace: [
      `adjusted_ebitda = reported_ebitda + eligible_addbacks = ${decimalString(reportedEbitda)} + ${decimalString(addBackTotal)} = ${decimalString(adjustedEbitda)}`,
      `ratio = debt / adjusted_ebitda = ${decimalString(debt)} / ${decimalString(adjustedEbitda)} = ${ratioString(ratio)}`,
      `threshold = ${input.thresholdBps} bps = ${decimalString(threshold)}x`,
      `compliant = debt * 10000 <= adjusted_ebitda * threshold_bps = ${compliant}`,
      `headroom = threshold - ratio = ${decimalString(headroom)}`,
    ],
    scenarios: [
      scenario("BASELINE", debt, adjustedEbitda),
      scenario("EBITDA_DOWNSIDE_10", debt, downsideEbitda),
      scenario("DEBT_UPSIDE_10", upsideDebt, adjustedEbitda),
    ],
  };
}

export function classifyActual(
  result: CalculationResult,
  verification: "VERIFIED" | "FAILED" | "INCOMPLETE" | "STALE",
): "COMPLIANT" | "BREACHED" | "INDETERMINATE" | "NOT_ASSESSED" {
  if (verification !== "VERIFIED") return "INDETERMINATE";
  if (!result || result.adjustedEbitda === "0.00000000") return "INDETERMINATE";
  return result.compliant ? "COMPLIANT" : "BREACHED";
}

export function classifyForecast(result: CalculationResult): "AT_RISK" | "NO_PROJECTED_BREACH" | "INDETERMINATE" {
  if (!result || result.adjustedEbitda === "0.00000000") return "INDETERMINATE";
  return result.compliant ? "NO_PROJECTED_BREACH" : "AT_RISK";
}
