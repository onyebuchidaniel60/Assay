import { z } from "zod";

/**
 * Canonical request/response contracts.
 *
 * All financial amounts are integer minor units encoded as decimal strings so
 * no JavaScript floating-point value or BigInt-unfriendly JSON number can
 * become authoritative.
 */

export const minorUnitsSchema = z
  .string()
  .regex(/^(0|[1-9]\d{0,17})$/, "Use a non-negative integer string of at most 18 digits (minor units).");

export const signedMinorUnitsSchema = z
  .string()
  .regex(/^-?(0|[1-9]\d{0,17})$/, "Use an integer string of at most 18 digits (minor units).");

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter uppercase currency code.");
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date (YYYY-MM-DD).");

export const referenceTokenSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, digits, dashes or underscores.");

export const roleSchema = z.enum(["ANALYST", "MANAGER", "AUDITOR", "ADMIN"]);

export const borrowerCreateSchema = z
  .object({
    displayAlias: z.string().trim().min(1).max(120),
    referenceToken: referenceTokenSchema,
  })
  .strict();

export const borrowerPatchSchema = z
  .object({
    displayAlias: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
    expectedVersion: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.displayAlias !== undefined || value.status !== undefined, {
    message: "Provide at least one editable field.",
  });

export const facilityCreateSchema = z
  .object({
    facilityReferenceToken: referenceTokenSchema,
    label: z.string().trim().min(1).max(160),
    currency: currencySchema,
  })
  .strict();

export const analysisCreateSchema = z
  .object({
    facilityId: z.string().uuid(),
    documentId: z.string().uuid(),
  })
  .strict();

export const permittedAddbackSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    description: z.string().trim().min(1).max(500),
    conditions: z.array(z.string().min(1).max(500)).max(20),
    capMinor: minorUnitsSchema.nullable(),
  })
  .strict();

export const covenantEvidenceSchema = z
  .object({
    page: z.number().int().positive(),
    quote: z.string().min(1).max(500),
    field: z.string().min(1).max(120),
  })
  .strict();

/** Normative extraction schema from MASTER_BLUEPRINT §5. */
export const covenantTermsSchema = z
  .object({
    covenantType: z.literal("DEBT_TO_ADJUSTED_EBITDA"),
    comparator: z.literal("LTE"),
    thresholdBps: z.number().int().min(1).max(100_000),
    currency: currencySchema.optional(),
    totalDebtDefinition: z.string().min(1).max(2000),
    ebitdaDefinition: z.string().min(1).max(2000),
    permittedAddbacks: z.array(permittedAddbackSchema).max(50),
    testingDate: isoDateSchema.nullable(),
    cureRightsSummary: z.string().max(2000).nullable(),
    evidence: z.array(covenantEvidenceSchema).min(1).max(50),
    confidence: z.number().min(0).max(1),
    uncertaintyNotes: z.array(z.string().max(500)).max(20),
  })
  .strict();

export const termsReviewSchema = z
  .object({
    revision: z.number().int().positive(),
    decision: z.enum(["CONFIRM", "REJECT"]),
    rationale: z.string().max(2000).optional(),
    edits: z
      .object({
        thresholdBps: z.number().int().min(1).max(100_000).optional(),
        totalDebtDefinition: z.string().min(1).max(2000).optional(),
        ebitdaDefinition: z.string().min(1).max(2000).optional(),
        permittedAddbacks: z.array(permittedAddbackSchema).max(50).optional(),
        testingDate: isoDateSchema.nullable().optional(),
        cureRightsSummary: z.string().max(2000).nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === "REJECT" && !value.rationale?.trim()) {
      ctx.addIssue({ code: "custom", path: ["rationale"], message: "A rejection reason is required." });
    }
  });

export const spanSchema = z
  .object({
    page: z.number().int().positive(),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    entityType: z.string().min(1).max(64).optional(),
  })
  .strict()
  .refine((value) => value.end > value.start, { message: "Span end must be after start." });

export const redactionReviewSchema = z
  .object({
    revision: z.number().int().positive(),
    decision: z.enum(["CONFIRM", "REJECT"]),
    falsePositiveSpans: z.array(spanSchema).max(200).optional(),
    additionalSpans: z.array(spanSchema.required({ entityType: true })).max(200).optional(),
    rationale: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === "REJECT" && !value.rationale?.trim()) {
      ctx.addIssue({ code: "custom", path: ["rationale"], message: "A rejection reason is required." });
    }
  });

export const financialInputsRequestSchema = z
  .object({
    currency: currencySchema,
    reportedEbitdaMinor: minorUnitsSchema,
    totalDebtMinor: minorUnitsSchema,
    addbacks: z
      .array(
        z
          .object({
            code: z.string().trim().min(1).max(64),
            amountMinor: minorUnitsSchema,
            sourceReference: z.string().trim().max(160).optional(),
          })
          .strict(),
      )
      .max(50)
      .default([]),
    attest: z.literal(true),
    termsVersion: z.number().int().positive(),
  })
  .strict();

export const proofRequestSchema = z
  .object({
    analysisVersion: z.number().int().positive(),
  })
  .strict();

export const approvalDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    proofArtifactId: z.string().uuid(),
    analysisVersion: z.number().int().positive(),
    riskAcknowledged: z.boolean().default(false),
    rationale: z.string().max(2000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.decision === "REJECT" && !value.rationale?.trim()) {
      ctx.addIssue({ code: "custom", path: ["rationale"], message: "A rejection reason is required." });
    }
  });

export const feedbackCreateSchema = z
  .object({
    analysisRunId: z.string().uuid(),
    correctionType: z.enum(["TERMS", "FINANCIAL_INPUT", "REDACTION", "OTHER"]),
    beforeValue: z.record(z.string(), z.unknown()),
    afterValue: z.record(z.string(), z.unknown()),
    note: z.string().max(1000).optional(),
    submitToReppo: z.boolean().default(false),
    maxWaitMinutes: z.union([z.literal(10), z.literal(15), z.literal(30)]).default(10),
  })
  .strict();

export const reppoSubmitSchema = z
  .object({
    feedbackRecordId: z.string().uuid(),
    maxWaitMinutes: z.union([z.literal(10), z.literal(15), z.literal(30)]).default(10),
  })
  .strict();

export const financialDataProviderIdSchema = z.enum(["sec-edgar", "financial-datasets", "lonestar-oracle"]);
export const financialEvidenceKindSchema = z.enum([
  "COMPANY_FACTS",
  "REVENUE_VERIFICATION",
  "INCOME_STATEMENT",
  "BALANCE_SHEET",
  "CASH_FLOW_STATEMENT",
  "EQUITY_FUNDAMENTALS",
]);

export const externalEvidenceRequestSchema = z
  .object({
    kind: financialEvidenceKindSchema,
    providerId: financialDataProviderIdSchema,
    ticker: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(12)
      .regex(/^[A-Z0-9.-]+$/, "Use a public ticker such as AAPL.")
      .optional(),
    cik: z.string().trim().regex(/^\d{1,10}$/, "Use a SEC CIK of 1–10 digits.").optional(),
    fiscalYear: z.number().int().min(1990).max(2100).optional(),
    reason: z.string().trim().min(10).max(1000),
    linkedField: z.string().trim().max(200).optional(),
    publicReferenceConfirmed: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.publicReferenceConfirmed) {
      ctx.addIssue({
        code: "custom",
        path: ["publicReferenceConfirmed"],
        message: "Confirm that the public ticker or CIK refers to the entity you intend to check.",
      });
    }
    if (value.providerId === "sec-edgar" && !value.ticker && !value.cik) {
      ctx.addIssue({ code: "custom", path: ["ticker"], message: "Provide a ticker or CIK for SEC EDGAR." });
    }
    if (value.providerId !== "sec-edgar" && !value.ticker) {
      ctx.addIssue({ code: "custom", path: ["ticker"], message: "This provider requires a public ticker." });
    }
  });

export const paymentAuthorizationSchema = z
  .object({
    paymentIntentId: z.string().uuid(),
    expectedQuoteSha256: z.string().regex(/^[0-9a-f]{64}$/, "Use the quote hash returned by the server."),
    confirm: z.literal(true),
  })
  .strict();

export type ExternalEvidenceRequest = z.infer<typeof externalEvidenceRequestSchema>;
export type PaymentAuthorizationRequest = z.infer<typeof paymentAuthorizationSchema>;

export const safeErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});

export type CovenantTerms = z.infer<typeof covenantTermsSchema>;
export type FinancialInputsRequest = z.infer<typeof financialInputsRequestSchema>;
export type RedactionReviewRequest = z.infer<typeof redactionReviewSchema>;
