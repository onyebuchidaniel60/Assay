import { Decimal } from "decimal.js";

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 40,
  modulo: Decimal.ROUND_DOWN,
});

export { Decimal };

export const DECIMAL_PLACES = 8;
export const RATIO_DISPLAY_PLACES = 2;

export function decimal(value: Decimal.Value): Decimal {
  return new Decimal(value);
}

export function decimalString(value: Decimal.Value): string {
  return decimal(value).toFixed(DECIMAL_PLACES);
}

export function ratioString(value: Decimal.Value): string {
  return decimal(value).toFixed(DECIMAL_PLACES);
}

export function displayRatio(value: Decimal.Value): string {
  return `${decimal(value).toFixed(RATIO_DISPLAY_PLACES)}x`;
}

export function isNonNegative(value: Decimal.Value): boolean {
  try {
    return decimal(value).isFinite() && decimal(value).gte(0);
  } catch {
    return false;
  }
}

export function isPositive(value: Decimal.Value): boolean {
  try {
    return decimal(value).isFinite() && decimal(value).gt(0);
  } catch {
    return false;
  }
}
