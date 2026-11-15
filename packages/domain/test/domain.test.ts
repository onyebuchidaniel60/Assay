import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  approvalPayloadHash,
  calculateLeverage,
  classifyActual,
  classifyForecast,
  decideApproval,
  dependencyHash,
  evaluateFormula,
  evaluateKitePayment,
  isForecastStatus,
  sha256,
  validateFormula,
  verifyAuditChain,
  verifyCalculation,
  type CalculationInput,
  type FormulaNode,
} from "../src/index.js";

const base: CalculationInput = {
  debt: "32000000",
  reportedEbitda: "10000000",
  thresholdBps: 35000,
  currency: "USD",
  testDate: "2026-09-30",
};

describe("deterministic leverage calculation", () => {
  it("produces 3.20x compliant", () => {
    const result = calculateLeverage(base);
    expect(result.ratio).toBe("3.20000000");
    expect(result.displayRatio).toBe("3.20x");
    expect(result.compliant).toBe(true);
    expect(classifyActual(result, "VERIFIED")).toBe("COMPLIANT");
  });

  it("treats exactly 3.50x as compliant and 3.50000001x as breached", () => {
    const boundary = calculateLeverage({ ...base, debt: "35000000" });
    expect(boundary.ratio).toBe("3.50000000");
    expect(boundary.compliant).toBe(true);
    const above = calculateLeverage({ ...base, debt: "35000001" });
    expect(above.ratio).toBe("3.50000010");
    expect(above.compliant).toBe(false);
  });

  it("produces 3.70x breached and classifies only when verified", () => {
    const result = calculateLeverage({ ...base, debt: "37000000" });
    expect(result.ratio).toBe("3.70000000");
    expect(result.compliant).toBe(false);
    expect(classifyActual(result, "VERIFIED")).toBe("BREACHED");
    expect(classifyActual(result, "STALE")).toBe("INDETERMINATE");
  });

  it("applies only eligible add-backs and rejects ineligible lines", () => {
    const result = calculateLeverage({
      ...base,
      debt: "32000000",
      reportedEbitda: "9000000",
      addBacks: [{ label: "Permitted restructuring", amount: "1000000", eligible: true }],
    });
    expect(result.adjustedEbitda).toBe("10000000.00000000");
    expect(result.ratio).toBe("3.20000000");
    expect(() =>
      calculateLeverage({
        ...base,
        addBacks: [{ label: "Unapproved", amount: "1000000", eligible: false }],
      }),
    ).toThrow(/Ineligible add-backs/);
  });

  it("rejects zero/negative EBITDA and currency mismatch", () => {
    expect(() => calculateLeverage({ ...base, reportedEbitda: "0" })).toThrow(/positive/);
    expect(() => calculateLeverage({ ...base, ebitdaCurrency: "EUR" })).toThrow(/currency/);
  });

  it("keeps forecast status separate from actual status", () => {
    const actual = calculateLeverage(base);
    const forecast = calculateLeverage({ ...base, debt: "34500000", reportedEbitda: "9500000" });
    expect(classifyActual(actual, "VERIFIED")).toBe("COMPLIANT");
    expect(classifyForecast(forecast)).toBe("AT_RISK");
    expect(isForecastStatus("AT_RISK")).toBe(true);
  });

  it("runs the two required sensitivity scenarios", () => {
    const result = calculateLeverage(base);
    expect(result.scenarios.map((item) => item.kind)).toEqual([
      "BASELINE",
      "EBITDA_DOWNSIDE_10",
      "DEBT_UPSIDE_10",
    ]);
    expect(result.scenarios[1]?.compliant).toBe(false);
  });
});

describe("restricted formula AST", () => {
  const ast: FormulaNode = {
    kind: "divide",
    numerator: { kind: "metric", key: "gross_debt" },
    denominator: { kind: "metric", key: "ltm_ebitda" },
  };

  it("accepts the supported leverage AST", () => {
    expect(validateFormula(ast).ok).toBe(true);
    expect(evaluateFormula(ast, { gross_debt: "32", ltm_ebitda: "10" }).toFixed(2)).toBe("3.20");
  });

  it("rejects unknown metrics, executable nodes and uncited constants", () => {
    expect(validateFormula({ kind: "metric", key: "eval" }).ok).toBe(false);
    expect(validateFormula({ kind: "call", name: "fetch" }).ok).toBe(false);
    expect(validateFormula({ kind: "constant", value: "1" }).ok).toBe(false);
  });

  it("rejects division by zero", () => {
    expect(() => evaluateFormula(ast, { gross_debt: "1", ltm_ebitda: "0" })).toThrow(/Division by zero/);
  });
});

describe("independent verification", () => {
  it("verifies a matching snapshot", () => {
    const result = calculateLeverage(base);
    const verification = verifyCalculation(base, result, {
      snapshotHash: "a",
      currentSnapshotHash: "a",
      formulaHash: "b",
      currentFormulaHash: "b",
    });
    expect(verification.result).toBe("VERIFIED");
    expect(verification.failureCodes).toEqual([]);
  });

  it("fails when the primary result is tampered", () => {
    const result = calculateLeverage(base);
    const tampered = { ...result, ratio: "3.50000000", compliant: true };
    const verification = verifyCalculation(base, tampered, {
      snapshotHash: "a",
      currentSnapshotHash: "a",
      formulaHash: "b",
      currentFormulaHash: "b",
    });
    expect(verification.result).toBe("FAILED");
    expect(verification.failureCodes).toContain("primary_ratio_matches");
  });
});

describe("approval and audit controls", () => {
  const deps = { formula: "v1", evidence: "v2" };
  const payload = { action: "APPROVE_MEMO", memo: "v1" };
  const request = {
    id: "apr_1",
    requesterId: "analyst_1",
    status: "PENDING" as const,
    payloadSha256: approvalPayloadHash(payload),
    dependencySha256: dependencyHash(deps),
    version: 1,
  };

  it("blocks self-approval and non-managers", () => {
    expect(
      decideApproval({
        request,
        actorId: "analyst_1",
        actorRole: "CREDIT_MANAGER",
        decision: "APPROVE",
        currentPayloadSha256: request.payloadSha256,
        currentDependencySha256: request.dependencySha256,
      }).ok,
    ).toBe(false);
    expect(
      decideApproval({
        request,
        actorId: "analyst_2",
        actorRole: "CREDIT_ANALYST",
        decision: "APPROVE",
        currentPayloadSha256: request.payloadSha256,
        currentDependencySha256: request.dependencySha256,
      }).ok,
    ).toBe(false);
  });

  it("allows a different manager and invalidates on dependency change", () => {
    expect(
      decideApproval({
        request,
        actorId: "manager_1",
        actorRole: "CREDIT_MANAGER",
        decision: "APPROVE",
        currentPayloadSha256: request.payloadSha256,
        currentDependencySha256: request.dependencySha256,
      }),
    ).toEqual({ ok: true, status: "APPROVED" });
    expect(
      decideApproval({
        request,
        actorId: "manager_1",
        actorRole: "CREDIT_MANAGER",
        decision: "APPROVE",
        currentPayloadSha256: request.payloadSha256,
        currentDependencySha256: dependencyHash({ formula: "v2" }),
      }).ok,
    ).toBe(false);
  });

  it("detects audit payload tampering", () => {
    const first = appendAuditEvent({
      organizationId: "org_1",
      sequenceNo: 1,
      actorType: "SYSTEM",
      eventType: "BORROWER_CREATED",
      entityType: "borrower",
      entityId: "brw_1",
      payload: { name: "Synthetic" },
      previousHash: "GENESIS",
      createdAt: "2026-11-15T10:00:00Z",
    });
    const second = appendAuditEvent({
      organizationId: "org_1",
      sequenceNo: 2,
      actorType: "USER",
      actorUserId: "user_1",
      eventType: "FACILITY_CREATED",
      entityType: "facility",
      entityId: "fac_1",
      payload: { name: "Term Loan A" },
      previousHash: first.eventHash,
      createdAt: "2026-11-15T10:01:00Z",
    });
    expect(verifyAuditChain([first, second]).result).toBe("VALID");
    const tampered = { ...second, payload: { name: "Changed" } };
    expect(verifyAuditChain([first, tampered]).result).toBe("INVALID");
    expect(sha256("x")).toHaveLength(64);
  });
});

describe("Kite deterministic spending policy", () => {
  const session = {
    sessionId: "agent_session_test",
    status: "active" as const,
    asset: "PIEUSD",
    maxPerTransaction: "5",
    maxTotal: "20",
    spentTotal: "0",
    reservedTotal: "0",
    expiresAt: "2026-11-16T15:11:32.17177Z",
  };

  it("allows a payment inside the caps", () => {
    const decision = evaluateKitePayment(session, {
      amount: "0.1",
      asset: "PIEUSD",
      idempotencyKey: "assay-kite-smoke-test",
      now: new Date("2026-11-15T15:00:00Z"),
    });
    expect(decision.allowed).toBe(true);
  });

  it("rejects a per-transaction over-cap request", () => {
    const decision = evaluateKitePayment(session, {
      amount: "6",
      asset: "PIEUSD",
      idempotencyKey: "assay-kite-overcap-test",
      now: new Date("2026-11-15T15:00:00Z"),
    });
    expect(decision).toMatchObject({ allowed: false, code: "session_rule_exceeded" });
  });

  it("rejects total budget, asset and expiry violations", () => {
    expect(
      evaluateKitePayment({ ...session, spentTotal: "19.95" }, {
        amount: "0.1",
        asset: "PIEUSD",
        idempotencyKey: "assay-kite-total-test",
        now: new Date("2026-11-15T15:00:00Z"),
      }),
    ).toMatchObject({ allowed: false, code: "session_total_exceeded" });
    expect(
      evaluateKitePayment(session, {
        amount: "0.1",
        asset: "USDC",
        idempotencyKey: "assay-kite-asset-test",
        now: new Date("2026-11-15T15:00:00Z"),
      }),
    ).toMatchObject({ allowed: false, code: "session_asset_forbidden" });
    expect(
      evaluateKitePayment(session, {
        amount: "0.1",
        asset: "PIEUSD",
        idempotencyKey: "assay-kite-expiry-test",
        now: new Date("2026-11-17T15:00:00Z"),
      }),
    ).toMatchObject({ allowed: false, code: "session_expired" });
  });
});
