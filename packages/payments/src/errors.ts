export class PaymentProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 502,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}

export class PaymentRequestError extends PaymentProviderError {
  constructor(code: string, message: string, statusCode = 422, details?: unknown) {
    super(code, message, statusCode, details);
    this.name = "PaymentRequestError";
  }
}
