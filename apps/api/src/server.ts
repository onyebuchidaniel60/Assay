import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { loadConfig } from "./config.js";

export function buildServer(options: { env?: NodeJS.ProcessEnv } = {}): FastifyInstance {
  const config = loadConfig(options.env ?? process.env);
  const app = Fastify({
    logger: {
      level: config.APP_ENV === "development" ? "info" : "warn",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers.set-cookie",
          "*.apiKey",
          "*.token",
          "*.secret",
          "*.password",
        ],
        censor: "[REDACTED]",
      },
    },
    requestIdHeader: "x-request-id",
    trustProxy: true,
  });

  const allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  app.get("/", async () => ({
    data: {
      service: "assay-api",
      status: "phase-1-shell",
      message: "Assay API foundation. Domain routes are implemented in Phase 3.",
    },
    meta: { requestId: "request-id-placeholder" },
  }));

  app.get("/health/live", async () => ({
    status: "ok",
    service: "assay-api",
    environment: config.APP_ENV,
    timestamp: new Date().toISOString(),
  }));

  app.get("/health/ready", async (_request, reply) => {
    const checks: Record<string, string> = {
      config: "ok",
      database: config.DATABASE_URL ? "configured" : "not_configured",
      layer2: config.NEARAI_API_KEY ? "configured" : "not_configured",
      generalInference: config.OPENROUTER_API_KEY ? "configured" : "not_configured",
      serv: config.SERV_REASONING_API_KEY ? "configured" : "not_configured",
      pii: config.PRESIDIO_MODE,
    };

    const ready = Boolean(config.DATABASE_URL);
    if (!ready) {
      reply.code(503);
    }

    return {
      status: ready ? "ready" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/v1/me", async (_request, reply) => {
    reply.code(401);
    return {
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is not wired in the Phase 1 shell.",
        requestId: "request-id-placeholder",
      },
    };
  });

  app.setNotFoundHandler(async (_request, reply) => {
    reply.code(404);
    return {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource is not available.",
        requestId: "request-id-placeholder",
      },
    };
  });

  app.setErrorHandler(async (error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.code(statusCode);
    return {
      error: {
        code: statusCode === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
        message: statusCode === 500 ? "The request could not be processed." : error.message,
        requestId: "request-id-placeholder",
      },
    };
  });

  return app;
}
