import { Decimal } from "decimal.js";
import { decimal, isNonNegative } from "./decimal.js";

export const ALLOWED_METRICS = [
  "gross_debt",
  "ltm_ebitda",
  "unrestricted_cash",
  "eligible_ebitda_addback",
  "other_contractual_adjustment",
] as const;

export type MetricKey = (typeof ALLOWED_METRICS)[number];

export type FormulaNode =
  | { kind: "metric"; key: MetricKey }
  | { kind: "constant"; value: string; sourceRef: string }
  | { kind: "sum"; terms: FormulaNode[] }
  | { kind: "subtract"; left: FormulaNode; right: FormulaNode }
  | { kind: "min"; left: FormulaNode; right: FormulaNode }
  | { kind: "max"; left: FormulaNode; right: FormulaNode }
  | { kind: "divide"; numerator: FormulaNode; denominator: FormulaNode };

export type FormulaValidation =
  | { ok: true; metricKeys: MetricKey[]; nodeCount: number; depth: number }
  | { ok: false; errors: string[] };

const MAX_NODES = 50;
const MAX_DEPTH = 8;
const allowedKinds = new Set([
  "metric",
  "constant",
  "sum",
  "subtract",
  "min",
  "max",
  "divide",
]);

export function validateFormula(ast: unknown): FormulaValidation {
  const errors: string[] = [];
  const metrics = new Set<MetricKey>();
  let nodeCount = 0;

  const walk = (node: unknown, depth: number): void => {
    nodeCount += 1;
    if (nodeCount > MAX_NODES) {
      errors.push(`Formula exceeds the ${MAX_NODES}-node limit.`);
      return;
    }
    if (depth > MAX_DEPTH) {
      errors.push(`Formula exceeds the depth limit of ${MAX_DEPTH}.`);
      return;
    }
    if (!node || typeof node !== "object") {
      errors.push("Formula node must be an object.");
      return;
    }
    const kind = (node as { kind?: unknown }).kind;
    if (typeof kind !== "string" || !allowedKinds.has(kind)) {
      errors.push(`Unsupported formula node: ${String(kind)}.`);
      return;
    }

    switch (kind) {
      case "metric": {
        const key = (node as { key?: unknown }).key;
        if (typeof key !== "string" || !(ALLOWED_METRICS as readonly string[]).includes(key)) {
          errors.push(`Unsupported metric key: ${String(key)}.`);
          return;
        }
        metrics.add(key as MetricKey);
        return;
      }
      case "constant": {
        const value = (node as { value?: unknown }).value;
        const sourceRef = (node as { sourceRef?: unknown }).sourceRef;
        if (typeof value !== "string" || !isNonNegative(value)) {
          errors.push("Formula constants must be non-negative decimal strings.");
        }
        if (typeof sourceRef !== "string" || sourceRef.trim().length === 0) {
          errors.push("Formula constants require a contract source reference.");
        }
        return;
      }
      case "sum": {
        const terms = (node as { terms?: unknown }).terms;
        if (!Array.isArray(terms) || terms.length === 0) {
          errors.push("Sum nodes require at least one term.");
          return;
        }
        for (const term of terms) walk(term, depth + 1);
        return;
      }
      case "subtract":
      case "min":
      case "max":
      case "divide": {
        const left = (node as { left?: unknown }).left;
        const right = (node as { right?: unknown }).right;
        const numerator = (node as { numerator?: unknown }).numerator;
        const denominator = (node as { denominator?: unknown }).denominator;
        if (kind === "divide") {
          if (!numerator || !denominator) {
            errors.push("Divide nodes require numerator and denominator.");
            return;
          }
          walk(numerator, depth + 1);
          walk(denominator, depth + 1);
          return;
        }
        if (!left || !right) {
          errors.push(`${kind} nodes require left and right operands.`);
          return;
        }
        walk(left, depth + 1);
        walk(right, depth + 1);
        return;
      }
      default:
        errors.push(`Unsupported formula node: ${kind}.`);
    }
  };

  walk(ast, 1);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, metricKeys: [...metrics], nodeCount, depth: MAX_DEPTH };
}

export type MetricValues = Partial<Record<MetricKey, Decimal.Value>>;

export function evaluateFormula(ast: FormulaNode, values: MetricValues): Decimal {
  const evaluate = (node: FormulaNode): Decimal => {
    switch (node.kind) {
      case "metric": {
        const value = values[node.key];
        if (value === undefined) throw new Error(`Missing metric value: ${node.key}`);
        return decimal(value);
      }
      case "constant":
        return decimal(node.value);
      case "sum":
        return node.terms.reduce((total, term) => total.plus(evaluate(term)), new Decimal(0));
      case "subtract":
        return evaluate(node.left).minus(evaluate(node.right));
      case "min":
        return Decimal.min(evaluate(node.left), evaluate(node.right));
      case "max":
        return Decimal.max(evaluate(node.left), evaluate(node.right));
      case "divide": {
        const denominator = evaluate(node.denominator);
        if (!denominator.isFinite() || denominator.isZero()) {
          throw new Error("Division by zero or non-finite denominator.");
        }
        return evaluate(node.numerator).div(denominator);
      }
    }
  };

  return evaluate(ast);
}
