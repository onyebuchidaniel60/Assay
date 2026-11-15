import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NearAIClient,
  OpenRouterClient,
  ProviderError,
  ServClient,
  fromEnv,
  postChat,
} from "../src/index.js";

const originalFetch = globalThis.fetch;

function mockJson(body: unknown, init: { status?: number } = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (url: string | URL | Request, requestInit?: RequestInit) => {
    calls.push({ url: String(url), init: requestInit ?? {} });
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("postChat", () => {
  it("sends the configured model and rejects a mismatched response model", async () => {
    const calls = mockJson({
      model: "some-other-model",
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
    });
    await expect(
      postChat("https://example.test/v1/chat/completions", "secret", "expected-model", [
        { role: "user", content: "hi" },
      ]),
    ).rejects.toMatchObject({ code: "MODEL_MISMATCH" });
    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.model).toBe("expected-model");
    expect(body.stream).toBeUndefined();
  });

  it("returns the exact model and content on a valid response", async () => {
    mockJson({
      model: "expected-model",
      choices: [{ message: { content: "assay" }, finish_reason: "stop" }],
      usage: { total_tokens: 4 },
    });
    const result = await postChat("https://example.test/v1/chat/completions", "secret", "expected-model", [
      { role: "user", content: "hi" },
    ]);
    expect(result.content).toBe("assay");
    expect(result.model).toBe("expected-model");
    expect(result.usage).toEqual({ total_tokens: 4 });
  });

  it("surfaces provider HTTP errors without fabricating content", async () => {
    mockJson({ error: { message: "bad key" } }, { status: 401 });
    await expect(
      postChat("https://example.test/v1/chat/completions", "secret", "model", [{ role: "user", content: "hi" }]),
    ).rejects.toMatchObject({ code: "HTTP_ERROR" });
  });

  it("rejects an invalid chat envelope", async () => {
    mockJson({ unexpected: true });
    await expect(
      postChat("https://example.test/v1/chat/completions", "secret", "model", [{ role: "user", content: "hi" }]),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });
});

describe("provider clients", () => {
  it("NEAR AI uses max_completion_tokens and the exact configured model", async () => {
    const calls = mockJson({
      model: "z-ai/model",
      choices: [{ message: { content: "{}" }, finish_reason: "stop" }],
    });
    const client = new NearAIClient({ apiKey: "k", model: "z-ai/model", baseUrl: "https://near.test/v1" });
    const result = await client.chat([{ role: "user", content: "extract" }], 128);
    expect(result.content).toBe("{}");
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.max_completion_tokens).toBe(128);
    expect(body.max_tokens).toBeUndefined();
  });

  it("hashes the attestation report bytes", async () => {
    const calls = mockJson({ report: { nonce: "abc" } });
    const client = new NearAIClient({ apiKey: "k", model: "z-ai/model", baseUrl: "https://near.test/v1" });
    const result = await client.fetchAttestationReport("abc");
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(result.report).toHaveProperty("report");
    expect(calls[0]?.url).toContain("nonce=abc");
    expect(calls[0]?.url).toContain("signing_algo=ecdsa");
  });

  it("OpenRouter judgement and generation use their own model ids", async () => {
    const calls = mockJson({
      model: "openai/judge",
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
    });
    const client = new OpenRouterClient({
      apiKey: "k",
      judgementModel: "openai/judge",
      generationModel: "deepseek/gen",
      baseUrl: "https://or.test/api/v1",
    });
    await client.judgement([{ role: "user", content: "judge" }]);
    expect(JSON.parse(String(calls[0]?.init.body)).model).toBe("openai/judge");
  });

  it("SERV requires a system prompt and otherwise uses max_completion_tokens", async () => {
    const client = new ServClient({ apiKey: "k", model: "serv-standard", baseUrl: "https://serv.test/v1" });
    await expect(client.reason("", "hi")).rejects.toBeInstanceOf(ProviderError);
    const calls = mockJson({
      model: "serv-standard",
      choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
    });
    const result = await client.reason("bounded node", "hi", 32);
    expect(result.model).toBe("serv-standard");
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.max_completion_tokens).toBe(32);
    expect(body.messages[0]).toEqual({ role: "system", content: "bounded node" });
    expect(body.model).toBe("serv-standard");
  });
});

describe("fromEnv", () => {
  it("fails closed when configuration is missing", () => {
    expect(() => fromEnv({} as NodeJS.ProcessEnv)).toThrow(ProviderError);
  });

  it("constructs all three clients from complete environment values", () => {
    const clients = fromEnv({
      NEARAI_API_KEY: "near",
      NEARAI_MODEL: "z-ai/glm-5.3-flash",
      OPENROUTER_API_KEY: "or",
      OPENROUTER_MODEL_JUDGEMENT: "openai/gpt-4o-mini",
      OPENROUTER_MODEL_GENERATION: "deepseek/deepseek-v3.2",
      SERV_REASONING_API_KEY: "serv",
      SERV_MODEL: "serv-standard",
    } as NodeJS.ProcessEnv);
    expect(clients.nearai).toBeInstanceOf(NearAIClient);
    expect(clients.openrouter).toBeInstanceOf(OpenRouterClient);
    expect(clients.serv).toBeInstanceOf(ServClient);
  });
});
