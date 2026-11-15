import type { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function notFound(entity: string): ApiError {
  return new ApiError(404, "NOT_FOUND", `${entity} was not found.`);
}

export function forbidden(message = "Your role cannot perform this action."): ApiError {
  return new ApiError(403, "FORBIDDEN", message);
}

export function conflict(code: string, message: string, details?: unknown): ApiError {
  return new ApiError(409, code, message, details);
}

export function unprocessable(code: string, message: string, details?: unknown): ApiError {
  return new ApiError(422, code, message, details);
}

export function zodDetails(error: ZodError): { fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
    fieldErrors[path] = [...(fieldErrors[path] ?? []), issue.message];
  }
  return { fieldErrors };
}

export function safeErrorPayload(error: unknown, requestId: string) {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
    };
  }
  if (error instanceof Error && error.name === "ZodError") {
    const zod = error as ZodError;
    return {
      statusCode: 422,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the highlighted fields.",
          requestId,
          details: zodDetails(zod),
        },
      },
    };
  }
  const statusCode =
    typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : 500;
  if (statusCode < 500) {
    return {
      statusCode,
      body: {
        error: {
          code: statusCode === 413 ? "PAYLOAD_TOO_LARGE" : "REQUEST_REJECTED",
          message: statusCode === 413 ? "The upload exceeds the 10 MiB limit." : "The request was rejected.",
          requestId,
        },
      },
    };
  }
  return {
    statusCode: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed. No result was recorded.",
        requestId,
      },
    },
  };
}
