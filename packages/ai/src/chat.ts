import { z } from "zod";

const chatResponseSchema = z.object({
  id: z.string().optional(),
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
  id?: string;
  rawRequest?: string;
  rawResponse?: string;
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
  options: {
    maxTokens?: number | undefined;
    timeoutMs?: number | undefined;
    tokenParameter?: "max_tokens" | "max_completion_tokens" | undefined;
  } = {},
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
    const rawRequest = JSON.stringify(body);
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: rawRequest,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ProviderError(`Provider returned HTTP ${response.status}.`, "HTTP_ERROR");
    }
    const rawResponse = await response.text();
    let decoded: unknown;
    try {
      decoded = JSON.parse(rawResponse);
    } catch {
      throw new ProviderError("Provider returned non-JSON output.", "INVALID_RESPONSE");
    }
    const parsed = chatResponseSchema.safeParse(decoded);
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
      ...(parsed.data.id ? { id: parsed.data.id } : {}),
      rawRequest,
      rawResponse,
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
