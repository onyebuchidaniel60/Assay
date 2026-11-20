export class FinancialDataError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 502,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "FinancialDataError";
  }
}
