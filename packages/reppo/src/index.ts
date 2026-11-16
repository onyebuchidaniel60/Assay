import { z } from "zod";

/**
 * Reppo Eval Router adapter.
 *
 * The legacy `/agents/eval-requests/*` endpoints documented in the first
 * blueprint were removed by the provider and now return HTML 404. The live
 * contract uses `/agents/evals` with `taskType`/`input`; this adapter targets
 * the live endpoint and records the migration in docs/INTEGRATIONS.md.
 */
export const REPPO_BASE_URL = "https://eval.reppo.xyz/api/v1";
export const REPPO_MAX_PAYLOAD_BYTES = 50 * 1024;
export const REPPO_MAX_CONTEXT_BYTES = 32 * 1024;

export const reppoTasks = ["claim", "response", "action"] as const;
export type ReppoTask = (typeof reppoTasks)[number];

const submitResponseSchema = z
  .object({
    id: z.string().optional(),
    evalId: z.string().optional(),
    status: z.string(),
  })
  .passthrough();

const evaluationSchema = z
  .object({
    id: z.string().optional(),
    evalId: z.string().optional(),
    status: z.string(),
    score: z.number().nullable().optional(),
    route: z.string().nullable().optional(),
    creditsCharged: z.number().nullable().optional(),
    createdAt: z.string().optional(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    result: z.record(z.string(), z.unknown()).nullable().optional(),
    error: z.unknown().optional(),
  })
  .passthrough();

export type ReppoEvaluation = z.infer<typeof evaluationSchema> & { id: string };

export type ReppoSubmitResult = {
  providerEvalId: string;
  status: string;
};

export class ReppoError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MISSING_CONFIG"
      | "PAYLOAD_TOO_LARGE"
      | "CONTEXT_TOO_LARGE"
      | "UNSAFE_PAYLOAD"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE"
      | "NETWORK_ERROR"
      | "TIMEOUT",
    public readonly side: "client" | "provider" | "network" | "config",
    public readonly httpStatus: number | null = null,
    public readonly providerMessage: string | null = null,
  ) {
    super(message);
    this.name = "ReppoError";
  }
}

export class ReppoSafetyError extends ReppoError {
  constructor(message: string) {
    super(message, "UNSAFE_PAYLOAD", "client");
    this.name = "ReppoSafetyError";
  }
}

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const TOKEN_MAP_PATTERN = /\[(ORGANIZATION|PERSON|LOCATION|ASSAY_[A-Z]+)_[A-F0-9]{8}\]/;
const ACCOUNT_PATTERN = /\b\d{8,17}\b/;
const SECRET_PATTERN = /(Bearer\s+[A-Za-z0-9._-]{10,}|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|sk-[A-Za-z0-9]{20,})/;
const FORBIDDEN_KEYS = /(borrowerName|legalName|displayAlias|referenceToken|tokenMap|documentText|agreementText|rawText|sourceExcerpt|witness)/i;

/**
 * Preflight guard for every outbound evaluation. The payload is constructed
 * from an allowlist, then rejected if any disallowed material is detected.
 */
export function assertSafeEvaluation(input: string, context: string | null | undefined): void {
  const payloadBytes = Buffer.byteLength(input, "utf8");
  if (payloadBytes > REPPO_MAX_PAYLOAD_BYTES) {
    throw new ReppoError(`Payload is ${payloadBytes} bytes; the limit is 50 KB.`, "PAYLOAD_TOO_LARGE", "client");
  }
  if (context && Buffer.byteLength(context, "utf8") > REPPO_MAX_CONTEXT_BYTES) {
    throw new ReppoError("Context exceeds the 32 KB limit.", "CONTEXT_TOO_LARGE", "client");
  }
  if (EMAIL_PATTERN.test(input) || EMAIL_PATTERN.test(context ?? "")) {
    throw new ReppoSafetyError("Evaluation contains an email address.");
  }
  if (TOKEN_MAP_PATTERN.test(input) || TOKEN_MAP_PATTERN.test(context ?? "")) {
    throw new ReppoSafetyError("Evaluation contains a token-map placeholder.");
  }
  if (ACCOUNT_PATTERN.test(input)) {
    throw new ReppoSafetyError("Evaluation contains an account-like number.");
  }
  if (SECRET_PATTERN.test(input) || SECRET_PATTERN.test(context ?? "")) {
    throw new ReppoSafetyError("Evaluation contains secret-like material.");
  }
  if (FORBIDDEN_KEYS.test(input)) {
    throw new ReppoSafetyError("Evaluation contains a forbidden identity/document field.");
  }
}

export type ReppoClientConfig = {
  apiKey: string;
  baseUrl?: string | undefined;
  timeoutMs?: number | undefined;
};

export class ReppoClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: ReppoClientConfig) {
    if (!config.apiKey) {
      throw new ReppoError("REPPO_API_KEY is missing.", "MISSING_CONFIG", "config");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? REPPO_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  async submit(input: {
    taskType: ReppoTask;
    input: string;
    context?: string | undefined;
  }): Promise<ReppoSubmitResult> {
    assertSafeEvaluation(input.input, input.context);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/agents/evals`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          taskType: input.taskType,
          input: input.input,
          ...(input.context ? { context: input.context } : {}),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ReppoError(
        error instanceof Error ? error.message : "Reppo submission failed before a response.",
        error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR",
        "network",
      );
    }
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ReppoError(
        `Reppo returned non-JSON HTTP ${response.status}.`,
        "INVALID_RESPONSE",
        "provider",
        response.status,
        text.slice(0, 300),
      );
    }
    if (!response.ok) {
      const providerMessage =
        body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : null;
      throw new ReppoError(
        providerMessage ?? `Reppo returned HTTP ${response.status}.`,
        "HTTP_ERROR",
        response.status >= 500 ? "provider" : "client",
        response.status,
        providerMessage,
      );
    }
    const parsed = submitResponseSchema.safeParse(body);
    if (!parsed.success || (!parsed.data.id && !parsed.data.evalId)) {
      throw new ReppoError("Reppo submit response did not include an evaluation id.", "INVALID_RESPONSE", "provider", response.status);
    }
    return { providerEvalId: parsed.data.id ?? parsed.data.evalId ?? "", status: parsed.data.status };
  }

  async get(providerEvalId: string): Promise<ReppoEvaluation> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/agents/evals/${encodeURIComponent(providerEvalId)}`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ReppoError(
        error instanceof Error ? error.message : "Reppo read failed before a response.",
        error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR",
        "network",
      );
    }
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new ReppoError(
        `Reppo returned non-JSON HTTP ${response.status}.`,
        "INVALID_RESPONSE",
        "provider",
        response.status,
        text.slice(0, 300),
      );
    }
    if (!response.ok) {
      const providerMessage =
        body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : null;
      throw new ReppoError(
        providerMessage ?? `Reppo returned HTTP ${response.status}.`,
        "HTTP_ERROR",
        response.status >= 500 ? "provider" : "client",
        response.status,
        providerMessage,
      );
    }
    const parsed = evaluationSchema.safeParse(body);
    if (!parsed.success || (!parsed.data.id && !parsed.data.evalId)) {
      throw new ReppoError("Reppo evaluation response was malformed.", "INVALID_RESPONSE", "provider", response.status);
    }
    return { ...parsed.data, id: parsed.data.id ?? parsed.data.evalId ?? providerEvalId };
  }
}

export function normalizeReppoStatus(status: string): "PENDING" | "COMPLETED" | "FAILED" {
  const normalized = status.trim().toUpperCase();
  if (normalized === "COMPLETED" || normalized === "SETTLED") return "COMPLETED";
  if (normalized === "FAILED") return "FAILED";
  return "PENDING";
}

export function allowedWaitMinutes(value: unknown, fallback = 10): 10 | 15 | 30 {
  const number = Number(value);
  return number === 15 || number === 30 ? number : number === 10 ? 10 : (fallback as 10);
}

export function reppoFromEnv(env: NodeJS.ProcessEnv = process.env): ReppoClient {
  return new ReppoClient({ apiKey: env.REPPO_API_KEY ?? "", baseUrl: env.REPPO_BASE_URL, timeoutMs: 30_000 });
}
