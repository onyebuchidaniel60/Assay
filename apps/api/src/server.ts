import "./env.js";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { createDb, sql } from "@assay/db";
import { MAX_UPLOAD_BYTES } from "@assay/document";
import { loadConfig } from "./config.js";
import { resolveAuthUser } from "./auth.js";
import { safeErrorPayload } from "./lib/errors.js";
import { meta } from "./lib/http.js";
import { registerBorrowerRoutes } from "./routes/borrowers.js";
import { registerAnalysisRoutes } from "./routes/analysis.js";
import { registerAuditRoutes } from "./routes/audit.js";
import { registerIntegrationRoutes } from "./routes/integrations.js";
import { registerExternalEvidenceRoutes } from "./routes/external-evidence.js";
import { registerDemoRoutes } from "./routes/demo.js";

const db = createDb();

export function buildServer(options: { env?: NodeJS.ProcessEnv } = {}): FastifyInstance {
  const config = loadConfig(options.env ?? process.env);
  const app = Fastify({
    logger: {
      level: config.APP_ENV === "development" ? "info" : "warn",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "req.headers['idempotency-key']",
          "res.headers.set-cookie",
          "*.apiKey",
          "*.token",
          "*.secret",
          "*.password",
          "*.content",
          "*.text",
        ],
        censor: "[REDACTED]",
      },
    },
    requestIdHeader: "x-request-id",
    trustProxy: true,
    bodyLimit: 1024 * 1024,
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
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });

  app.register(multipart, {
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5, parts: 8 },
  });

  app.register(rateLimit, {
    max: 240,
    timeWindow: "1 minute",
    allowList: (request) => request.url.startsWith("/health/"),
    keyGenerator: (request) => `${request.ip}:${request.headers["x-forwarded-for"] ? "proxied" : "direct"}`,
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("x-frame-options", "DENY");
    return payload;
  });

  app.get("/", async (request) => ({
    data: {
      service: "assay-api",
      status: "phase-3",
      message: "Assay covenant operations API. Authentication is required for all /v1 resources.",
    },
    meta: meta(request),
  }));

  app.get("/health/live", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/health/ready", async (_request, reply) => {
    let ready = Boolean(config.DATABASE_URL);
    if (ready) {
      try {
        await db.execute(sql`select 1`);
      } catch {
        ready = false;
      }
    }
    if (!ready) reply.code(503);
    return { status: ready ? "ready" : "degraded", timestamp: new Date().toISOString() };
  });

  app.get("/v1/me", async (request, reply) => {
    const user = await resolveAuthUser(request, reply);
    if (!user) {
      reply.code(401);
      return {
        error: {
          code: "UNAUTHENTICATED",
          message: "Sign in with an invited staff account.",
          requestId: String(request.id),
        },
      };
    }
    return {
      data: {
        user,
        capabilities: {
          writeCovenant: ["ANALYST", "ADMIN"].includes(user.role),
          approve: user.role === "MANAGER",
          verifyAudit: true,
          administrate: user.role === "ADMIN",
        },
      },
      meta: meta(request),
    };
  });

  registerBorrowerRoutes(app);
  registerAnalysisRoutes(app);
  registerAuditRoutes(app);
  registerIntegrationRoutes(app);
  registerExternalEvidenceRoutes(app);
  registerDemoRoutes(app);

  app.setNotFoundHandler(async (request, reply) => {
    reply.code(404);
    return {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource is not available.",
        requestId: String(request.id),
      },
    };
  });

  app.setErrorHandler(async (error, request, reply) => {
    const payload = safeErrorPayload(error, String(request.id));
    if (payload.statusCode >= 500) {
      request.log.error({ err: error }, "request failed");
    }
    reply.code(payload.statusCode);
    return payload.body;
  });

  return app;
}
