import { createHash, randomBytes } from "node:crypto";
import { getCollateralAndVerify } from "@phala/dcap-qvl";
import { recoverMessageAddress } from "viem";
import { z } from "zod";
import { postChat, type ChatMessage, type ChatResult } from "./chat.js";

const NRAS_URL = "https://nras.attestation.nvidia.com/v3/attest/gpu";

const modelListSchema = z.object({
  models: z.array(
    z
      .object({
        modelId: z.string(),
        metadata: z
          .object({
            verifiable: z.boolean().optional(),
            attestationSupported: z.boolean().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  ),
});

const attestationReportSchema = z
  .object({
    gateway_attestation: z
      .object({
        signing_address: z.string(),
        signing_algo: z.string(),
        intel_quote: z.string(),
        report_data: z.string().optional(),
        request_nonce: z.string(),
      })
      .passthrough()
      .optional(),
    model_attestations: z
      .array(
        z
          .object({
            model_name: z.string(),
            signing_address: z.string(),
            signing_algo: z.string(),
            request_nonce: z.string(),
            intel_quote: z.string(),
            nvidia_payload: z.string(),
            compose_manager_attestation: z
              .object({
                actions_hash: z.string().optional(),
                nonce: z.string().optional(),
                quote: z.string().optional(),
                report_data: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

const signatureSchema = z.object({
  text: z.string(),
  signature: z.string(),
  signing_address: z.string(),
  signing_algo: z.string(),
  signature_kind: z.string().optional(),
});

export type AttestationEvidence = {
  verified: boolean;
  modelId: string;
  modelVerifiable: boolean;
  modelAttestationSupported: boolean;
  nonce: string;
  reportSha256: string;
  tdxStatus: string;
  tdxVerified: boolean;
  composeVerified: boolean;
  nvidiaVerdict: boolean;
  signingAddress: string;
  responseSignatureVerified: boolean;
  requestHashVerified: boolean;
  responseHashVerified: boolean;
  verifiedAt: string;
};

export type AttestedChatResult = {
  chat: ChatResult;
  evidence: AttestationEvidence;
};

export class AttestationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MODEL_NOT_ELIGIBLE"
      | "REPORT_FETCH_FAILED"
      | "REPORT_INVALID"
      | "NONCE_MISMATCH"
      | "SIGNER_MISMATCH"
      | "TDX_INVALID"
      | "NRAS_INVALID"
      | "SIGNATURE_INVALID"
      | "HASH_MISMATCH"
      | "MISSING_CHAT_ID",
  ) {
    super(message);
    this.name = "AttestationError";
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hexToBytes(value: string): Buffer {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]*$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new AttestationError("Quote or report data is not valid hex.", "REPORT_INVALID");
  }
  return Buffer.from(normalized, "hex");
}

function bytesFrom(value: string | Uint8Array): Buffer {
  return typeof value === "string" ? hexToBytes(value) : Buffer.from(value);
}

function paddedAddress(address: string): Buffer {
  const normalized = address.startsWith("0x") ? address.slice(2) : address;
  if (!/^[0-9a-fA-F]{40}$/.test(normalized)) {
    throw new AttestationError("Signing address is not a 20-byte EVM address.", "REPORT_INVALID");
  }
  const out = Buffer.alloc(32);
  Buffer.from(normalized, "hex").copy(out);
  return out;
}

type TdxResult = { status: string; reportData: Buffer; mrConfigId: string };

async function verifyTdxQuote(quoteHex: string): Promise<TdxResult> {
  let result: Awaited<ReturnType<typeof getCollateralAndVerify>>;
  try {
    result = await getCollateralAndVerify(Buffer.from(hexToBytes(quoteHex)));
  } catch {
    throw new AttestationError("Intel TDX quote verification failed.", "TDX_INVALID");
  }
  const status = String(result.status ?? "");
  if (status !== "UpToDate" && status !== "OutOfDate") {
    throw new AttestationError(`Intel TDX quote status is ${status || "unknown"}.`, "TDX_INVALID");
  }
  const report = result.report as { data?: { reportData?: string | Uint8Array; mrConfigId?: string | Uint8Array } } | undefined;
  const reportData = report?.data?.reportData;
  if (!reportData) throw new AttestationError("TDX report data is missing.", "TDX_INVALID");
  const mrConfig = report?.data?.mrConfigId;
  return {
    status,
    reportData: bytesFrom(reportData),
    mrConfigId: typeof mrConfig === "string" ? mrConfig : mrConfig ? Buffer.from(mrConfig).toString("hex") : "",
  };
}

async function nvidiaVerdict(nvidiaPayload: string, nonce: string): Promise<boolean> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(nvidiaPayload) as Record<string, unknown>;
  } catch {
    throw new AttestationError("NVIDIA payload is not JSON.", "NRAS_INVALID");
  }
  if (String(payload.nonce ?? "").toLowerCase() !== nonce.toLowerCase()) {
    throw new AttestationError("NVIDIA payload nonce does not match the request nonce.", "NONCE_MISMATCH");
  }
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(NRAS_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`NRAS HTTP ${response.status}`);
      const body = (await response.json()) as unknown;
      if (!Array.isArray(body) || body.length === 0) throw new Error("NRAS response is malformed.");
      const jwt = body
        .map((entry) => (Array.isArray(entry) ? entry[1] : undefined))
        .find((value): value is string => typeof value === "string");
      if (!jwt) throw new Error("NRAS response did not include a JWT.");
      const claims = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as Record<
        string,
        unknown
      >;
      return claims["x-nvidia-overall-att-result"] === true;
    } catch (error) {
      lastError = error;
    }
  }
  throw new AttestationError(
    `NVIDIA NRAS verification failed: ${lastError instanceof Error ? lastError.message : "unknown"}.`,
    "NRAS_INVALID",
  );
}

function parseSignatureHashes(text: string): { requestHash: string; responseHash: string } {
  const parts = text.split(":");
  if (parts.length !== 2 && parts.length !== 3) {
    throw new AttestationError("Signature payload text has an unexpected shape.", "REPORT_INVALID");
  }
  return { requestHash: parts[parts.length - 2] ?? "", responseHash: parts[parts.length - 1] ?? "" };
}

export type AttestedChatConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number | undefined;
};

/**
 * Performs a NEAR AI chat completion and refuses to return content unless the
 * exact response is bound to a fresh Intel TDX + NVIDIA NRAS attestation and
 * the provider's ECDSA response signature.
 */
export async function attestedChat(
  config: AttestedChatConfig,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<AttestedChatResult> {
  const baseUrl = config.baseUrl.replace(/\/$/, "");

  const modelsResponse = await fetch(`${baseUrl}/model/list`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!modelsResponse?.ok) {
    throw new AttestationError("Could not read the provider model list.", "MODEL_NOT_ELIGIBLE");
  }
  const parsedModels = modelListSchema.safeParse(await modelsResponse.json());
  if (!parsedModels.success) throw new AttestationError("Model list response was invalid.", "MODEL_NOT_ELIGIBLE");
  const model = parsedModels.data.models.find((item) => item.modelId === config.model);
  if (!model) throw new AttestationError("Configured model is not present.", "MODEL_NOT_ELIGIBLE");
  const verifiable = model.metadata?.verifiable === true;
  const attestationSupported = model.metadata?.attestationSupported === true;
  if (!verifiable || !attestationSupported) {
    throw new AttestationError("Configured model is not verifiable or does not support attestation.", "MODEL_NOT_ELIGIBLE");
  }

  const nonce = randomBytes(32).toString("hex");
  const reportResponse = await fetch(
    `${baseUrl}/attestation/report?model=${encodeURIComponent(config.model)}&nonce=${nonce}&signing_algo=ecdsa`,
    { headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(45_000) },
  ).catch(() => null);
  if (!reportResponse?.ok) throw new AttestationError("Attestation report could not be fetched.", "REPORT_FETCH_FAILED");
  const reportText = await reportResponse.text();
  const reportSha256 = sha256(reportText);
  let reportJson: unknown;
  try {
    reportJson = JSON.parse(reportText);
  } catch {
    throw new AttestationError("Attestation report is not JSON.", "REPORT_INVALID");
  }
  const parsedReport = attestationReportSchema.safeParse(reportJson);
  if (!parsedReport.success) throw new AttestationError("Attestation report is malformed.", "REPORT_INVALID");

  const chat = await postChat(`${baseUrl}/chat/completions`, config.apiKey, config.model, messages, {
    maxTokens,
    timeoutMs: config.timeoutMs ?? 120_000,
    tokenParameter: "max_completion_tokens",
  });
  if (!chat.id) throw new AttestationError("Provider response did not include a chat id.", "MISSING_CHAT_ID");
  if (!chat.rawRequest || !chat.rawResponse) {
    throw new AttestationError("Provider response bytes were not retained for signature checking.", "SIGNATURE_INVALID");
  }

  const signatureResponse = await fetch(`${baseUrl}/signature/${encodeURIComponent(chat.id)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!signatureResponse?.ok) throw new AttestationError("Provider signature could not be fetched.", "SIGNATURE_INVALID");
  const parsedSignature = signatureSchema.safeParse(await signatureResponse.json());
  if (!parsedSignature.success) throw new AttestationError("Provider signature payload is malformed.", "SIGNATURE_INVALID");
  const signature = parsedSignature.data;

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({
      message: signature.text,
      signature: signature.signature as `0x${string}`,
    });
  } catch {
    throw new AttestationError("Provider response signature could not be recovered.", "SIGNATURE_INVALID");
  }
  if (recovered.toLowerCase() !== signature.signing_address.toLowerCase()) {
    throw new AttestationError("Provider response signature does not match the signing address.", "SIGNATURE_INVALID");
  }

  const hashes = parseSignatureHashes(signature.text);
  const requestHashVerified = hashes.requestHash === sha256(chat.rawRequest);
  const responseHashVerified = hashes.responseHash === sha256(chat.rawResponse);
  if (!requestHashVerified || !responseHashVerified) {
    throw new AttestationError("Signed request or response hash does not match the retained bytes.", "HASH_MISMATCH");
  }

  const attestation = parsedReport.data.model_attestations.find(
    (item) => item.signing_address.toLowerCase() === signature.signing_address.toLowerCase(),
  );
  if (!attestation) {
    throw new AttestationError("No model attestation matches the response signer.", "SIGNER_MISMATCH");
  }
  if (attestation.model_name !== config.model) {
    throw new AttestationError("Model attestation is for a different model.", "MODEL_NOT_ELIGIBLE");
  }
  if (attestation.request_nonce.toLowerCase() !== nonce.toLowerCase()) {
    throw new AttestationError("Model attestation nonce does not match the request.", "NONCE_MISMATCH");
  }

  const tdx = await verifyTdxQuote(attestation.intel_quote);
  const expectedAddress = paddedAddress(signature.signing_address);
  const expectedNonce = Buffer.from(nonce, "hex");
  if (!tdx.reportData.subarray(0, 32).equals(expectedAddress)) {
    throw new AttestationError("TDX report data does not bind the response signer.", "SIGNER_MISMATCH");
  }
  if (!tdx.reportData.subarray(32, 64).equals(expectedNonce)) {
    throw new AttestationError("TDX report data does not embed the request nonce.", "NONCE_MISMATCH");
  }

  let composeVerified = false;
  const compose = attestation.compose_manager_attestation;
  if (compose?.quote) {
    const composeTdx = await verifyTdxQuote(compose.quote);
    const actionsHash = compose.actions_hash ? hexToBytes(compose.actions_hash) : undefined;
    if (actionsHash && !composeTdx.reportData.subarray(0, 32).equals(actionsHash)) {
      throw new AttestationError("Compose-manager report data does not bind the actions hash.", "REPORT_INVALID");
    }
    if (!composeTdx.reportData.subarray(32, 64).equals(expectedNonce)) {
      throw new AttestationError("Compose-manager report data does not embed the request nonce.", "NONCE_MISMATCH");
    }
    composeVerified = Boolean(actionsHash);
  }

  const gpuVerdict = await nvidiaVerdict(attestation.nvidia_payload, nonce);
  if (!gpuVerdict) throw new AttestationError("NVIDIA attestation verdict is not true.", "NRAS_INVALID");

  return {
    chat,
    evidence: {
      verified: true,
      modelId: config.model,
      modelVerifiable: verifiable,
      modelAttestationSupported: attestationSupported,
      nonce,
      reportSha256,
      tdxStatus: tdx.status,
      tdxVerified: true,
      composeVerified,
      nvidiaVerdict: gpuVerdict,
      signingAddress: signature.signing_address,
      responseSignatureVerified: true,
      requestHashVerified,
      responseHashVerified,
      verifiedAt: new Date().toISOString(),
    },
  };
}
