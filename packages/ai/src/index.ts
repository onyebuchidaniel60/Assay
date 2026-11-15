import { createHash } from "node:crypto";
import { z } from "zod";

const chatResponseSchema = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable().optional() }).passthrough(),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
  usage: z.record(z.string(), z.unknown()).optional(),
});

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult = {
  content: string;
  model: string;
  finishReason: string | null;
  usage?: Record<string, unknown>;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MODEL_MISMATCH"
      | "HTTP_ERROR"
      | "INVALID_RESPONSE"
      | "TIMEOUT"
      | "MISSING_CONFIG",
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export async function postChat(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: { maxTokens?: number | undefined; timeoutMs?: number | undefined; tokenParameter?: "max_tokens" | "max_completion_tokens" | undefined } = {},
): Promise<ChatResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: 0,
      [options.tokenParameter ?? "max_tokens"]: options.maxTokens ?? 256,
    };
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ProviderError(`Provider returned HTTP ${response.status}.`, "HTTP_ERROR");
    }
    const parsed = chatResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new ProviderError("Provider returned an invalid chat envelope.", "INVALID_RESPONSE");
    if (parsed.data.model !== model) {
      throw new ProviderError(`Provider returned model "${parsed.data.model}", expected "${model}".`, "MODEL_MISMATCH");
    }
    const choice = parsed.data.choices[0];
    return {
      content: choice?.message.content ?? "",
      model: parsed.data.model,
      finishReason: choice?.finish_reason ?? null,
      ...(parsed.data.usage ? { usage: parsed.data.usage } : {}),
    };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError("Provider request timed out.", "TIMEOUT");
    }
    throw new ProviderError(error instanceof Error ? error.message : "Provider request failed.", "HTTP_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}

export type NearAIConfig = {
  baseUrl?: string | undefined;
  apiKey: string;
  model: string;
  timeoutMs?: number | undefined;
};

export class NearAIClient {
  private readonly baseUrl: string;
  constructor(private readonly config: NearAIConfig) {
    this.baseUrl = (config.baseUrl ?? "https://cloud-api.near.ai/v1").replace(/\/$/, "");
  }

  async chat(messages: ChatMessage[], maxTokens = 512): Promise<ChatResult> {
    return postChat(`${this.baseUrl}/chat/completions`, this.config.apiKey, this.config.model, messages, {
      maxTokens,
      timeoutMs: this.config.timeoutMs,
      tokenParameter: "max_completion_tokens",
    });
  }

  async fetchAttestationReport(nonce: string): Promise<{ report: Record<string, unknown>; sha256: string }> {
    const url = `${this.baseUrl}/attestation/report?model=${encodeURIComponent(this.config.model)}&nonce=${encodeURIComponent(nonce)}&signing_algo=ecdsa`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${this.config.apiKey}` } });
    if (!response.ok) throw new ProviderError(`Attestation endpoint returned HTTP ${response.status}.`, "HTTP_ERROR");
    const text = await response.text();
    try {
      const report = JSON.parse(text) as Record<string, unknown>;
      return { report, sha256: createHash("sha256").update(text).digest("hex") };
    } catch {
      throw new ProviderError("Attestation endpoint did not return JSON.", "INVALID_RESPONSE");
    }
  }
}

export type OpenRouterConfig = {
  baseUrl?: string | undefined;
  apiKey: string;
  judgementModel: string;
  generationModel: string;
  timeoutMs?: number | undefined;
};

export class OpenRouterClient {
  private readonly baseUrl: string;
  constructor(private readonly config: OpenRouterConfig) {
    this.baseUrl = (config.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  }

  async judgement(messages: ChatMessage[], maxTokens = 512): Promise<ChatResult> {
    return postChat(`${this.baseUrl}/chat/completions`, this.config.apiKey, this.config.judgementModel, messages, {
      maxTokens,
      timeoutMs: this.config.timeoutMs,
    });
  }

  async generation(messages: ChatMessage[], maxTokens = 1024): Promise<ChatResult> {
    return postChat(`${this.baseUrl}/chat/completions`, this.config.apiKey, this.config.generationModel, messages, {
      maxTokens,
      timeoutMs: this.config.timeoutMs,
    });
  }
}

export type ServConfig = {
  baseUrl?: string | undefined;
  apiKey: string;
  model: string;
  timeoutMs?: number | undefined;
};

export class ServClient {
  private readonly baseUrl: string;
  constructor(private readonly config: ServConfig) {
    this.baseUrl = (config.baseUrl ?? "https://inference-api.openserv.ai/v1").replace(/\/$/, "");
  }

  async reason(system: string, user: string, maxTokens = 512): Promise<ChatResult> {
    if (!system.trim()) throw new ProviderError("SERV requires an explicit system prompt.", "MISSING_CONFIG");
    return postChat(
      `${this.baseUrl}/chat/completions`,
      this.config.apiKey,
      this.config.model,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { maxTokens, timeoutMs: this.config.timeoutMs, tokenParameter: "max_completion_tokens" },
    );
  }
}

export function fromEnv(env: NodeJS.ProcessEnv = process.env) {
  const nearKey = env.NEARAI_API_KEY;
  const nearModel = env.NEARAI_MODEL;
  const openRouterKey = env.OPENROUTER_API_KEY;
  const judgement = env.OPENROUTER_MODEL_JUDGEMENT;
  const generation = env.OPENROUTER_MODEL_GENERATION;
  const servKey = env.SERV_REASONING_API_KEY;
  const servModel = env.SERV_MODEL;
  if (!nearKey || !nearModel) throw new ProviderError("NEAR AI configuration is missing.", "MISSING_CONFIG");
  if (!openRouterKey || !judgement || !generation) throw new ProviderError("OpenRouter configuration is missing.", "MISSING_CONFIG");
  if (!servKey || !servModel) throw new ProviderError("SERV configuration is missing.", "MISSING_CONFIG");
  return {
    nearai: new NearAIClient({ apiKey: nearKey, model: nearModel, baseUrl: env.NEARAI_BASE_URL }),
    openrouter: new OpenRouterClient({
      apiKey: openRouterKey,
      judgementModel: judgement,
      generationModel: generation,
      baseUrl: env.OPENROUTER_BASE_URL,
    }),
    serv: new ServClient({ apiKey: servKey, model: servModel, baseUrl: env.SERV_BASE_URL }),
  };
}
