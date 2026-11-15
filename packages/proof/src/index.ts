export const LEVERAGE_CIRCUIT_VERSION = "leverage-v1";

export type ProofPublicSignals = {
  compliant: string;
  thresholdBps: string;
};

export function expectedCompliant(debtMinor: bigint, adjustedEbitdaMinor: bigint, thresholdBps: bigint): boolean {
  if (debtMinor < 0n || adjustedEbitdaMinor <= 0n || thresholdBps <= 0n) return false;
  return debtMinor * 10000n <= adjustedEbitdaMinor * thresholdBps;
}

export function publicSignals(debtMinor: bigint, adjustedEbitdaMinor: bigint, thresholdBps: bigint): ProofPublicSignals {
  return {
    compliant: expectedCompliant(debtMinor, adjustedEbitdaMinor, thresholdBps) ? "1" : "0",
    thresholdBps: thresholdBps.toString(),
  };
}
