import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ReppoClient,
  ReppoError,
  allowedWaitMinutes,
  assertSafeEvaluation,
  normalizeReppoStatus,
} from "../src/index.js";

const originalFetch = globalThis.fetch;

function mockJson(body: unknown, status = 200) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Reppo safety preflight", () => {
  it("accepts a small synthetic correction trace", () => {
    expect(() =>
      assertSafeEvaluation(
        JSON.stringify({
          schema: "assay.synthetic-correction.v1",
          correctionType: "TERMS",
          changedFields: [{ field: "thresholdBps", before: 35000, after: 35000 }],
        }),
        "Synthetic covenant correction. No borrower identity or raw financial values.",
      ),
    ).not.toThrow();
  });

  it("rejects >50KB before any network call", () => {
    expect(() => assertSafeEvaluation("x".repeat(50 * 1024 + 1), "safe")).toThrow(/50 KB/);
  });

  it("rejects emails, account numbers, token-map placeholders and secret-like material", () => {
    expect(() => assertSafeEvaluation("contact analyst@example.test", "safe")).toThrow(/email/i);
    expect(() => assertSafeEvaluation("account 123456789012", "safe")).toThrow(/account/i);
    expect(() => assertSafeEvaluation("value [ORGANIZATION_AB12CD34]", "safe")).toThrow(/token-map/i);
    expect(() => assertSafeEvaluation("Bearer abcdefghijklmnop", "safe")).toThrow(/secret/i);
  });
});

describe("Reppo client", () => {
  it("submits to the live /agents/evals endpoint with taskType/input", async () => {
    const calls = mockJson({ id: "eval_123", status: "QUEUED" }, 201);
    const client = new ReppoClient({ apiKey: "test-key", baseUrl: "https://reppo.test/api/v1" });
    const result = await client.submit({
      taskType: "action",
      input: JSON.stringify({ synthetic: true, changedFields: ["thresholdBps"] }),
      context: "Synthetic correction.",
    });
    expect(result.providerEvalId).toBe("eval_123");
    expect(result.status).toBe("QUEUED");
    expect(calls[0]?.url).toBe("https://reppo.test/api/v1/agents/evals");
    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.taskType).toBe("action");
    expect(body.input).toContain("synthetic");
  });

  it("reads the live /agents/evals/{id} endpoint", async () => {
    const calls = mockJson({ id: "eval_123", status: "COMPLETED", score: 82, result: { route: "review" } });
    const client = new ReppoClient({ apiKey: "test-key", baseUrl: "https://reppo.test/api/v1" });
    const result = await client.get("eval_123");
    expect(result.score).toBe(82);
    expect(calls[0]?.url).toBe("https://reppo.test/api/v1/agents/evals/eval_123");
  });

  it("records provider validation errors and does not submit twice", async () => {
    const calls = mockJson({ error: "taskType: Required, input: Required" }, 400);
    const client = new ReppoClient({ apiKey: "test-key", baseUrl: "https://reppo.test/api/v1" });
    await expect(client.submit({ taskType: "action", input: "x" })).rejects.toMatchObject({
      code: "HTTP_ERROR",
      side: "client",
      httpStatus: 400,
      providerMessage: "taskType: Required, input: Required",
    });
    expect(calls).toHaveLength(1);
  });

  it("maps provider states without fabricating a verdict", () => {
    expect(normalizeReppoStatus("QUEUED")).toBe("PENDING");
    expect(normalizeReppoStatus("PROCESSING")).toBe("PENDING");
    expect(normalizeReppoStatus("COMPLETED")).toBe("COMPLETED");
    expect(normalizeReppoStatus("SETTLED")).toBe("COMPLETED");
    expect(normalizeReppoStatus("FAILED")).toBe("FAILED");
    expect(allowedWaitMinutes(15)).toBe(15);
    expect(allowedWaitMinutes(99)).toBe(10);
  });

  it("fails closed without a key", () => {
    expect(() => new ReppoClient({ apiKey: "" })).toThrow(ReppoError);
  });
});
