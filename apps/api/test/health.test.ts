import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

let app: ReturnType<typeof buildServer> | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe("Assay API health", () => {
  it("reports liveness without secrets", async () => {
    app = buildServer({ env: { APP_ENV: "test", CORS_ALLOWED_ORIGINS: "http://localhost:3000" } });
    const response = await app.inject({ method: "GET", url: "/health/live" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe("ok");
    expect(JSON.stringify(body)).not.toContain("API_KEY");
  });

  it("reports readiness without exposing dependency details", async () => {
    app = buildServer({ env: { APP_ENV: "test", CORS_ALLOWED_ORIGINS: "http://localhost:3000" } });
    const response = await app.inject({ method: "GET", url: "/health/ready" });
    expect([200, 503]).toContain(response.statusCode);
    const body = response.json();
    expect(["ready", "degraded"]).toContain(body.status);
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp"]);
  });

  it("returns a safe unauthenticated envelope", async () => {
    app = buildServer({ env: { APP_ENV: "test", CORS_ALLOWED_ORIGINS: "http://localhost:3000" } });
    const response = await app.inject({ method: "GET", url: "/v1/me" });
    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).not.toContain("stack");
  });

  it("rejects unknown routes with a safe envelope", async () => {
    app = buildServer({ env: { APP_ENV: "test", CORS_ALLOWED_ORIGINS: "http://localhost:3000" } });
    const response = await app.inject({ method: "GET", url: "/not-a-route" });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });
});
