import { describe, expect, it } from "vitest";
import { expectedCompliant, publicSignals } from "../src/index.js";

describe("fixed leverage predicate", () => {
  it("matches the golden compliant and breached witnesses", () => {
    expect(expectedCompliant(3_200_000_000_000_000n, 1_000_000_000_000_000n, 35000n)).toBe(true);
    expect(expectedCompliant(3_500_000_000_000_000n, 1_000_000_000_000_000n, 35000n)).toBe(true);
    expect(expectedCompliant(3_500_000_100_000_000n, 1_000_000_000_000_000n, 35000n)).toBe(false);
    expect(expectedCompliant(3_700_000_000_000_000n, 1_000_000_000_000_000n, 35000n)).toBe(false);
  });

  it("publishes only the predicate result and threshold", () => {
    expect(publicSignals(3_200_000_000_000_000n, 1_000_000_000_000_000n, 35000n)).toEqual({
      compliant: "1",
      thresholdBps: "35000",
    });
  });

  it("fails closed for non-positive EBITDA", () => {
    expect(expectedCompliant(1n, 0n, 35000n)).toBe(false);
  });
});
