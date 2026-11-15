import { createHash } from "node:crypto";
import { attestedChat, type AttestationEvidence, type AttestedChatResult } from "./attestation.js";
import { postChat, ProviderError, type ChatMessage, type ChatResult } from "./chat.js";

export * from "./chat.js";
export * from "./attestation.js";

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

  /**
   * Extraction path: refuses to return model output unless the exact response
   * is bound to fresh Intel TDX/NVIDIA NRAS evidence and the response signature.
   */
  async attestedExtraction(messages: ChatMessage[], maxTokens = 1024): Promise<AttestedChatResult> {
    return attestedChat(
      {
        baseUrl: this.baseUrl,
        apiKey: this.config.apiKey,
        model: this.config.model,
        timeoutMs: this.config.timeoutMs,
      },
      messages,
      maxTokens,
    );
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

export type ServReasoningResult = ChatResult & { traceId: string };

export class ServClient {
  private readonly baseUrl: string;
  constructor(private readonly config: ServConfig) {
    this.baseUrl = (config.baseUrl ?? "https://inference-api.openserv.ai/v1").replace(/\/$/, "");
  }

  async reason(system: string, user: string, maxTokens = 512): Promise<ServReasoningResult> {
    if (!system.trim()) throw new ProviderError("SERV requires an explicit system prompt.", "MISSING_CONFIG");
    const result = await postChat(
      `${this.baseUrl}/chat/completions`,
      this.config.apiKey,
      this.config.model,
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { maxTokens, timeoutMs: this.config.timeoutMs, tokenParameter: "max_completion_tokens" },
    );
    return { ...result, traceId: result.id ?? createHash("sha256").update(`${system}:${user}:${result.content}`).digest("hex") };
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

export type { AttestationEvidence, AttestedChatResult };
