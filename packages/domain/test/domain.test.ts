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
  evaluatePaymentPolicy,
  isForecastStatus,
  paymentRequestFingerprint,
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

describe("Arc deterministic spending policy", () => {
  const policy = {
    sessionId: "payment_session_test",
    status: "active" as const,
    allowedProviders: ["lonestar-oracle"],
    allowedEndpoints: ["https://equity.lonestaroracle.xyz/equity?ticker=AAPL"],
    allowedNetworks: ["eip155:5042002"],
    allowedAssets: ["0x3600000000000000000000000000000000000000"],
    allowedRecipients: ["0xeF2a4B6756895aAf1374640dcFCD4947959442ab"],
    maxPerTransactionMinor: "100000",
    maxTotalMinor: "500000",
    spentTotalMinor: "0",
    reservedTotalMinor: "0",
    expiresAt: "2026-11-21T15:11:32.17177Z",
    idempotencyKey: "assay-arc-policy-test",
    requestFingerprint: "a".repeat(64),
    now: new Date("2026-11-20T15:00:00Z"),
  };
  const intent = {
    providerId: "lonestar-oracle",
    endpoint: "https://equity.lonestaroracle.xyz/equity?ticker=AAPL",
    requirement: {
      scheme: "exact",
      network: "eip155:5042002",
      asset: "0x3600000000000000000000000000000000000000",
      amountMinor: "50000",
      payTo: "0xeF2a4B6756895aAf1374640dcFCD4947959442ab",
      maxTimeoutSeconds: 300,
    },
  };

  it("allows an approved provider, endpoint, network, asset and amount", () => {
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint(intent) },
      intent,
    );
    expect(decision).toMatchObject({ allowed: true, remainingTotalMinor: "450000" });
  });

  it("rejects an unauthorized provider", () => {
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint({ ...intent, providerId: "unknown-provider" }) },
      { ...intent, providerId: "unknown-provider" },
    );
    expect(decision).toMatchObject({ allowed: false, code: "payment_provider_forbidden" });
  });

  it("rejects an unauthorized endpoint", () => {
    const modified = { ...intent, endpoint: "https://evil.example/collect" };
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint(modified) },
      modified,
    );
    expect(decision).toMatchObject({ allowed: false, code: "payment_endpoint_forbidden" });
  });

  it("rejects an amount above the per-payment limit with the preserved session code", () => {
    const modified = { ...intent, requirement: { ...intent.requirement, amountMinor: "100001" } };
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint(modified) },
      modified,
    );
    expect(decision).toMatchObject({ allowed: false, code: "session_rule_exceeded" });
  });

  it("rejects an aggregate budget overrun including reserved spend", () => {
    const decision = evaluatePaymentPolicy(
      {
        ...policy,
        spentTotalMinor: "400001",
        reservedTotalMinor: "50000",
        requestFingerprint: paymentRequestFingerprint(intent),
      },
      intent,
    );
    expect(decision).toMatchObject({ allowed: false, code: "session_total_exceeded" });
  });

  it("rejects an expired authorization", () => {
    const decision = evaluatePaymentPolicy(
      {
        ...policy,
        expiresAt: "2026-11-19T15:00:00Z",
        requestFingerprint: paymentRequestFingerprint(intent),
      },
      intent,
    );
    expect(decision).toMatchObject({ allowed: false, code: "session_expired" });
  });

  it("rejects the wrong network", () => {
    const modified = { ...intent, requirement: { ...intent.requirement, network: "eip155:8453" } };
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint(modified) },
      modified,
    );
    expect(decision).toMatchObject({ allowed: false, code: "payment_network_forbidden" });
  });

  it("rejects the wrong token", () => {
    const modified = {
      ...intent,
      requirement: { ...intent.requirement, asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
    };
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint(modified) },
      modified,
    );
    expect(decision).toMatchObject({ allowed: false, code: "payment_asset_forbidden" });
  });

  it("rejects a modified recipient even when the amount is unchanged", () => {
    const modified = { ...intent, requirement: { ...intent.requirement, payTo: "0x1111111111111111111111111111111111111111" } };
    const decision = evaluatePaymentPolicy(
      { ...policy, requestFingerprint: paymentRequestFingerprint(modified) },
      modified,
    );
    expect(decision).toMatchObject({ allowed: false, code: "payment_recipient_forbidden" });
  });

  it("rejects a duplicate payment instead of paying twice", () => {
    const fingerprint = paymentRequestFingerprint(intent);
    const decision = evaluatePaymentPolicy(
      {
        ...policy,
        requestFingerprint: fingerprint,
        priorIntent: { fingerprint, status: "CONFIRMED" },
      },
      intent,
    );
    expect(decision).toMatchObject({ allowed: false, code: "duplicate_payment" });
  });

  it("rejects an idempotency-key conflict with different requirements", () => {
    const decision = evaluatePaymentPolicy(
      {
        ...policy,
        requestFingerprint: paymentRequestFingerprint(intent),
        priorIntent: { fingerprint: "b".repeat(64), status: "FAILED" },
      },
      intent,
    );
    expect(decision).toMatchObject({ allowed: false, code: "idempotency_conflict" });
  });

  it("rejects a reused provider nonce", () => {
    const decision = evaluatePaymentPolicy(
      {
        ...policy,
        requestFingerprint: paymentRequestFingerprint(intent),
        priorNonce: "0x" + "1".repeat(64),
      },
      intent,
    );
    expect(decision).toMatchObject({ allowed: false, code: "duplicate_payment" });
  });

  it("rejects invalid amounts, schemes and inactive sessions", () => {
    const badAmount = { ...intent, requirement: { ...intent.requirement, amountMinor: "0" } };
    expect(
      evaluatePaymentPolicy(
        { ...policy, requestFingerprint: paymentRequestFingerprint(badAmount) },
        badAmount,
      ),
    ).toMatchObject({ allowed: false, code: "invalid_amount" });

    const badScheme = { ...intent, requirement: { ...intent.requirement, scheme: "upto" } };
    expect(
      evaluatePaymentPolicy(
        { ...policy, requestFingerprint: paymentRequestFingerprint(badScheme) },
        badScheme,
      ),
    ).toMatchObject({ allowed: false, code: "payment_scheme_forbidden" });

    expect(
      evaluatePaymentPolicy(
        { ...policy, status: "revoked", requestFingerprint: paymentRequestFingerprint(intent) },
        intent,
      ),
    ).toMatchObject({ allowed: false, code: "session_inactive" });
  });
});
