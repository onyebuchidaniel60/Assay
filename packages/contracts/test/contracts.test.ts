import { describe, expect, it } from "vitest";
import {
  borrowerCreateSchema,
  covenantTermsSchema,
  facilityCreateSchema,
  financialInputsRequestSchema,
  redactionReviewSchema,
  termsReviewSchema,
} from "../src/index.js";

const validTerms = {
  covenantType: "DEBT_TO_ADJUSTED_EBITDA" as const,
  comparator: "LTE" as const,
  thresholdBps: 35000,
  totalDebtDefinition: "Consolidated Total Debt as defined in clause 1.1.",
  ebitdaDefinition: "Consolidated EBITDA for the trailing twelve months.",
  permittedAddbacks: [
    {
      code: "RESTRUCTURING",
      description: "Non-recurring restructuring costs",
      conditions: ["Incurred in the period"],
      capMinor: "500000000",
    },
  ],
  testingDate: "2026-09-30",
  cureRightsSummary: null,
  evidence: [{ page: 12, quote: "shall not exceed 3.50:1.00", field: "thresholdBps" }],
  confidence: 0.91,
  uncertaintyNotes: [],
};

describe("shared request contracts", () => {
  it("accepts a valid synthetic borrower and rejects extra fields", () => {
    expect(borrowerCreateSchema.parse({ displayAlias: "Borrower Demo 01", referenceToken: "BOR-001" })).toBeTruthy();
    expect(() =>
      borrowerCreateSchema.parse({ displayAlias: "Borrower", referenceToken: "BOR-1", organizationId: "other" }),
    ).toThrow();
  });

  it("validates facility currency and reference shape", () => {
    expect(
      facilityCreateSchema.parse({ facilityReferenceToken: "FAC-001", label: "Revolving Facility", currency: "USD" }),
    ).toBeTruthy();
    expect(() =>
      facilityCreateSchema.parse({ facilityReferenceToken: "FAC-001", label: "Facility", currency: "usd" }),
    ).toThrow();
  });

  it("accepts the normative covenant terms schema and requires evidence", () => {
    expect(covenantTermsSchema.parse(validTerms).thresholdBps).toBe(35000);
    expect(() => covenantTermsSchema.parse({ ...validTerms, evidence: [] })).toThrow();
  });

  it("requires a confirmed review reason on rejection", () => {
    expect(() => termsReviewSchema.parse({ revision: 1, decision: "REJECT" })).toThrow(/reason/i);
    expect(termsReviewSchema.parse({ revision: 1, decision: "CONFIRM", edits: { thresholdBps: 32500 } })).toBeTruthy();
  });

  it("rejects malformed spans and unsupported redaction decisions", () => {
    expect(() =>
      redactionReviewSchema.parse({ revision: 1, decision: "CONFIRM", falsePositiveSpans: [{ page: 1, start: 4, end: 2 }] }),
    ).toThrow();
    expect(
      redactionReviewSchema.parse({
        revision: 2,
        decision: "CONFIRM",
        additionalSpans: [{ page: 1, start: 4, end: 10, entityType: "ASSAY_REFERENCE" }],
      }),
    ).toBeTruthy();
  });

  it("requires integer minor units and explicit attestation", () => {
    const base = {
      currency: "USD",
      reportedEbitdaMinor: "100000000",
      totalDebtMinor: "325000000",
      addbacks: [{ code: "RESTRUCTURING", amountMinor: "5000000" }],
      attest: true as const,
      termsVersion: 1,
    };
    expect(financialInputsRequestSchema.parse(base)).toBeTruthy();
    expect(() => financialInputsRequestSchema.parse({ ...base, totalDebtMinor: "32.5" })).toThrow();
    expect(() => financialInputsRequestSchema.parse({ ...base, attest: false })).toThrow();
  });
});
