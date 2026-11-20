import { z } from "zod";

const optionalEnv = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema.optional());

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

  // Arc payments. Mainnet uses standard x402 exact (USDC EIP-3009); Testnet uses Circle Gateway. Execution is opt-in and fails closed.
  ARC_PAYMENTS_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  PAYMENT_EXECUTION_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  PAYMENT_DRY_RUN: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  ARC_NETWORK: z.string().default("eip155:5042002"),
  ARC_SETTLEMENT_MODEL: z.enum(["circle-gateway", "x402-exact"]).optional(),
  ARC_TESTNET_RPC_URL: z.string().url().default("https://rpc.testnet.arc.network"),
  ARC_MAINNET_RPC_URL: z.string().url().default("https://rpc.mainnet.arc.io"),
  ARC_TESTNET_PRIVATE_KEY: optionalEnv(z.string().regex(/^0x[0-9a-fA-F]{64}$/)),
  ARC_MAINNET_PRIVATE_KEY: optionalEnv(z.string().regex(/^0x[0-9a-fA-F]{64}$/)),
  ARC_TESTNET_PAYER_ADDRESS: optionalEnv(z.string().regex(/^0x[0-9a-fA-F]{40}$/)),
  ARC_MAINNET_PAYER_ADDRESS: optionalEnv(z.string().regex(/^0x[0-9a-fA-F]{40}$/)),
  CIRCLE_GATEWAY_FACILITATOR_URL: z.string().url().default("https://gateway-api-testnet.circle.com"),
  CIRCLE_GATEWAY_MAINNET_FACILITATOR_URL: z.string().url().default("https://gateway-api.circle.com"),
  PAYMENT_SESSION_ID: z.string().min(8).default("assay-arc-testnet-session-1"),
  PAYMENT_SESSION_EXPIRES_AT: optionalEnv(z.string().datetime()),
  PAYMENT_MAX_PER_TX_MINOR: z.coerce.number().int().nonnegative().default(100_000),
  PAYMENT_MAX_TOTAL_MINOR: z.coerce.number().int().nonnegative().default(500_000),
  PAYMENT_ALLOWED_PROVIDERS: z.string().default(""),
  PAYMENT_ALLOWED_ENDPOINTS: z.string().default(""),
  PAYMENT_ALLOWED_RECIPIENTS: z.string().default(""),
  PAYMENT_ALLOWED_NETWORKS: z.string().default("eip155:5042002"),
  PAYMENT_ALLOWED_ASSETS: z.string().default("0x3600000000000000000000000000000000000000"),
  PAYMENT_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(20_000),
  PAYMENT_RECONCILE_INTERVAL_SECONDS: z.coerce.number().int().min(10).max(3_600).default(60),
  PAYMENT_RECONCILE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(120).default(10),

  // Free public financial data.
  SEC_EDGAR_USER_AGENT: z.string().max(300).default(""),

  // Paid financial-data provider configuration. These are server-side only.
  FINANCIAL_DATASETS_API_KEY: z.string().optional(),
  FINANCIAL_DATASETS_BASE_URL: z.string().url().default("https://api.financialdatasets.ai"),
  LONESTAR_ORACLE_BASE_URL: z.string().url().default("https://equity.lonestaroracle.xyz"),

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
