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
    correctionType: z.enum(["TERMS", "FINANCIAL_INPUT", "REDACTION", "OTHER"]),
    beforeValue: z.record(z.string(), z.unknown()),
    afterValue: z.record(z.string(), z.unknown()),
    note: z.string().max(1000).optional(),
  })
  .strict();

export const kiteSessionSchema = z
  .object({
    sessionId: z.string().min(8),
    status: z.enum(["active", "expired", "used_up", "revoked"]),
    asset: z.string().min(1),
    maxPerTransaction: minorUnitsSchema,
    maxTotal: minorUnitsSchema,
    spentTotal: minorUnitsSchema,
    reservedTotal: minorUnitsSchema,
    expiresAt: z.string().datetime(),
  })
  .strict();

export const kitePaymentIntentSchema = z
  .object({
    amountMinor: minorUnitsSchema,
    asset: z.string().min(1),
    idempotencyKey: z.string().min(8).max(200),
    serviceId: z.string().min(1).max(120),
  })
  .strict();

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
