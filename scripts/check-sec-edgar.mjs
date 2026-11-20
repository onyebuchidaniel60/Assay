#!/usr/bin/env node
/**
 * Probe the real SEC EDGAR provider. Requires SEC_EDGAR_USER_AGENT.
 * Usage: SEC_EDGAR_USER_AGENT='Assay (contact: ...)' node scripts/check-sec-edgar.mjs AAPL 2025
 */
import { SecEdgarProvider } from "../packages/financial-data/dist/index.js";

const [ticker = "AAPL", fiscalYearArg = "2025"] = process.argv.slice(2);
const provider = new SecEdgarProvider({ userAgent: process.env.SEC_EDGAR_USER_AGENT ?? "" });
if (!process.env.SEC_EDGAR_USER_AGENT) {
  console.error("SEC_EDGAR_USER_AGENT is required.");
  process.exit(2);
}
try {
  const result = await provider.retrieve({
    kind: "REVENUE_VERIFICATION",
    ticker,
    fiscalYear: Number(fiscalYearArg),
    reason: "Operator-run SEC EDGAR reachability and provenance check.",
  });
  console.log(JSON.stringify({
    validationStatus: result.validationStatus,
    sourceUrl: result.sourceUrl,
    reportingPeriod: result.reportingPeriod,
    company: result.data.company,
    facts: result.data.facts,
    contentSha256: result.contentSha256,
    limitations: result.limitations,
    validationErrors: result.validationErrors,
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ code: error.code ?? "ERROR", message: error.message, statusCode: error.statusCode ?? null }, null, 2));
  process.exit(1);
}
