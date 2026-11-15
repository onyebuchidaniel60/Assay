import { z } from "zod";

const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "preview", "demo", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().optional(),
  NEARAI_BASE_URL: z.string().url().default("https://cloud-api.near.ai/v1"),
  NEARAI_API_KEY: z.string().min(1).optional(),
  NEARAI_MODEL: z.string().min(1).optional(),
  NEARAI_ATTESTATION_REQUIRED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODEL_JUDGEMENT: z.string().min(1).optional(),
  OPENROUTER_MODEL_GENERATION: z.string().min(1).optional(),
  SERV_BASE_URL: z.string().url().default("https://inference-api.openserv.ai/v1"),
  SERV_REASONING_API_KEY: z.string().min(1).optional(),
  SERV_MODEL: z.string().min(1).optional(),
  PRESIDIO_MODE: z.enum(["REDUCED_PII_MODE", "FULL_PRESIDIO"]).default("REDUCED_PII_MODE"),
  KITE_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  KITE_SESSION_ID: z.string().min(1).optional(),
  KITE_MAX_PER_PAYMENT_MINOR: z.coerce.number().int().nonnegative().default(500),
  KITE_MAX_TOTAL_MINOR: z.coerce.number().int().nonnegative().default(2000),
  REPPO_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  REPPO_API_KEY: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(input: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(input);
}

export const config = loadConfig();
