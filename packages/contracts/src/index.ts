import { z } from "zod";

export const decimalStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, "Use a non-negative decimal string with at most 8 decimal places.");

export const signedDecimalStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,8})?$/, "Use a decimal string with at most 8 decimal places.");

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter uppercase currency code.");
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date (YYYY-MM-DD).");

export const roleSchema = z.enum(["CREDIT_ANALYST", "CREDIT_MANAGER", "PORTFOLIO_MANAGER", "AUDITOR", "ORG_ADMIN"]);

export const borrowerCreateSchema = z
  .object({
    legalName: z.string().trim().min(1).max(240),
    referenceCode: z.string().trim().min(1).max(80),
    classification: z.enum(["CORPORATE", "OTHER"]).default("CORPORATE"),
  })
  .strict();

export const facilityCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    referenceCode: z.string().trim().min(1).max(80),
    facilityType: z.string().trim().min(1).max(80),
    currency: currencySchema,
    committedAmount: decimalStringSchema,
    outstandingAmount: decimalStringSchema.optional(),
    agreementDate: isoDateSchema,
    maturityDate: isoDateSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.maturityDate && value.maturityDate < value.agreementDate) {
      ctx.addIssue({ code: "custom", path: ["maturityDate"], message: "Maturity must be on or after the agreement date." });
    }
  });

export const metricKeySchema = z.enum([
  "gross_debt",
  "ltm_ebitda",
  "unrestricted_cash",
  "eligible_ebitda_addback",
  "other_contractual_adjustment",
]);

export type FormulaAst =
  | { kind: "metric"; key: z.infer<typeof metricKeySchema> }
  | { kind: "constant"; value: string; sourceRef: string }
  | { kind: "sum"; terms: FormulaAst[] }
  | { kind: "subtract"; left: FormulaAst; right: FormulaAst }
  | { kind: "min"; left: FormulaAst; right: FormulaAst }
  | { kind: "max"; left: FormulaAst; right: FormulaAst }
  | { kind: "divide"; numerator: FormulaAst; denominator: FormulaAst };

export const formulaAstSchema: z.ZodType<FormulaAst> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("metric"), key: metricKeySchema }).strict(),
    z.object({ kind: z.literal("constant"), value: decimalStringSchema, sourceRef: z.string().min(1) }).strict(),
    z.object({ kind: z.literal("sum"), terms: z.array(formulaAstSchema).min(1).max(12) }).strict(),
    z.object({ kind: z.literal("subtract"), left: formulaAstSchema, right: formulaAstSchema }).strict(),
    z.object({ kind: z.literal("min"), left: formulaAstSchema, right: formulaAstSchema }).strict(),
    z.object({ kind: z.literal("max"), left: formulaAstSchema, right: formulaAstSchema }).strict(),
    z.object({ kind: z.literal("divide"), numerator: formulaAstSchema, denominator: formulaAstSchema }).strict(),
  ]),
);

export const covenantDraftSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    thresholdBps: z.number().int().positive().max(1_000_000),
    operator: z.enum(["LTE", "GTE", "LT", "GT"]),
    formulaAst: formulaAstSchema,
    effectiveFrom: isoDateSchema,
    sourceRefs: z
      .array(
        z.object({
          documentVersionId: z.string().uuid(),
          page: z.number().int().positive(),
          quote: z.string().min(1).max(4000),
        }),
      )
      .min(1),
  })
  .strict();

export const financialInputsSchema = z
  .object({
    debt: decimalStringSchema,
    reportedEbitda: decimalStringSchema,
    addBacks: z
      .array(
        z.object({
          label: z.string().min(1).max(160),
          amount: decimalStringSchema,
          eligible: z.boolean(),
          sourceRef: z.string().max(160).optional(),
        }),
      )
      .max(50)
      .default([]),
    currency: currencySchema,
    testDate: isoDateSchema,
    periodStart: isoDateSchema.optional(),
    periodEnd: isoDateSchema.optional(),
  })
  .strict();

export const assessmentCreateSchema = z
  .object({
    testDate: isoDateSchema,
    evidenceMap: z.record(metricKeySchema, z.string().uuid()),
    idempotencyKey: z.string().min(8).max(200),
  })
  .strict();

export const approvalDecisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT", "CHANGES_REQUESTED"]),
    reason: z.string().max(2000).optional(),
    expectedVersion: z.number().int().nonnegative(),
  })
  .strict();

export const kiteSessionSchema = z
  .object({
    sessionId: z.string().min(8),
    status: z.enum(["active", "expired", "used_up", "revoked"]),
    asset: z.string().min(1),
    maxPerTransaction: decimalStringSchema,
    maxTotal: decimalStringSchema,
    spentTotal: decimalStringSchema,
    reservedTotal: decimalStringSchema,
    expiresAt: z.string().datetime(),
  })
  .strict();

export const kitePaymentIntentSchema = z
  .object({
    amount: decimalStringSchema,
    asset: z.string().min(1),
    idempotencyKey: z.string().min(8).max(200),
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
