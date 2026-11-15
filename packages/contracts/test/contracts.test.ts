import { describe, expect, it } from "vitest";
import {
  assessmentCreateSchema,
  borrowerCreateSchema,
  covenantDraftSchema,
  facilityCreateSchema,
  financialInputsSchema,
  formulaAstSchema,
  kitePaymentIntentSchema,
} from "../src/index.js";

describe("shared request contracts", () => {
  it("accepts a valid borrower and rejects extra fields", () => {
    expect(borrowerCreateSchema.parse({ legalName: "Northwind", referenceCode: "NWC-1" })).toMatchObject({
      classification: "CORPORATE",
    });
    expect(() => borrowerCreateSchema.parse({ legalName: "X", referenceCode: "X", organizationId: "other" })).toThrow();
  });

  it("rejects a facility with maturity before agreement", () => {
    expect(() =>
      facilityCreateSchema.parse({
        name: "Term Loan A",
        referenceCode: "FAC-1",
        facilityType: "TERM_LOAN",
        currency: "USD",
        committedAmount: "50000000",
        agreementDate: "2026-01-01",
        maturityDate: "2025-12-31",
      }),
    ).toThrow(/Maturity/);
  });

  it("validates the recursive formula AST", () => {
    const ast = {
      kind: "divide",
      numerator: { kind: "metric", key: "gross_debt" },
      denominator: { kind: "metric", key: "ltm_ebitda" },
    };
    expect(formulaAstSchema.parse(ast)).toBeTruthy();
    expect(() => formulaAstSchema.parse({ kind: "call", name: "fetch" })).toThrow();
    expect(() => formulaAstSchema.parse({ kind: "constant", value: "1" })).toThrow();
  });

  it("requires a source reference for covenant drafts", () => {
    expect(() =>
      covenantDraftSchema.parse({
        name: "Maximum leverage",
        thresholdBps: 35000,
        operator: "LTE",
        formulaAst: { kind: "metric", key: "gross_debt" },
        effectiveFrom: "2026-01-01",
        sourceRefs: [],
      }),
    ).toThrow();
  });

  it("rejects implicit or malformed financial inputs", () => {
    expect(() => financialInputsSchema.parse({ debt: "32", reportedEbitda: "10" })).toThrow();
    expect(financialInputsSchema.parse({ debt: "32", reportedEbitda: "10", currency: "USD", testDate: "2026-09-30" })).toBeTruthy();
    expect(() => financialInputsSchema.parse({ debt: "32", reportedEbitda: "10", currency: "usd", testDate: "2026-09-30" })).toThrow();
  });

  it("validates assessment and Kite idempotency shapes", () => {
    expect(() => assessmentCreateSchema.parse({ testDate: "2026-09-30", evidenceMap: {}, idempotencyKey: "short" })).toThrow();
    expect(kitePaymentIntentSchema.parse({ amount: "0.1", asset: "PIEUSD", idempotencyKey: "assay-kite-smoke-1" })).toBeTruthy();
  });
});
