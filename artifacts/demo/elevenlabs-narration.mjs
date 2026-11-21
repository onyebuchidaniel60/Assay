#!/usr/bin/env node
/**
 * ElevenLabs narration generator for the Assay demo.
 *
 * - Reads the API key from a local secret file (never from git).
 * - Caches every successful segment by text/voice/model/settings hash.
 * - Retries only transient failures (429/5xx/network), never auth errors.
 * - Verifies each MP3 with ffprobe before writing the manifest.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const secretFile = process.env.ELEVENLABS_ENV_FILE ?? "/root/assay-secrets/elevenlabs.env";
const segmentsFile = process.env.DEMO_NARRATION_JSON ?? path.join(here, "narration-v3.json");
const cacheDir = path.join(here, "narration-cache");
const manifestFile = path.join(here, "narration-manifest-v3.json");

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const fileEnv = readEnvFile(secretFile);
const apiKey = process.env.ELEVENLABS_API_KEY ?? fileEnv.ELEVENLABS_API_KEY;
const voiceId = process.env.ELEVENLABS_VOICE_ID ?? fileEnv.ELEVENLABS_VOICE_ID;
const voiceName = process.env.ELEVENLABS_VOICE_NAME ?? fileEnv.ELEVENLABS_VOICE_NAME ?? voiceId;
const modelId = process.env.ELEVENLABS_MODEL_ID ?? fileEnv.ELEVENLABS_MODEL_ID ?? "eleven_v4";
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured. Refusing to generate narration.");
if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID is not configured. Refusing to generate narration.");

const voiceSettings = {
  stability: 0.45,
  similarity_boost: 0.78,
  style: 0.28,
  use_speaker_boost: true,
};
const outputFormat = "mp3_44100_128";

const segments = JSON.parse(fs.readFileSync(segmentsFile, "utf8"));
if (!Array.isArray(segments) || segments.length === 0) throw new Error("Narration segment list is empty.");
fs.mkdirSync(cacheDir, { recursive: true });

function cacheKey(segment) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        text: segment.text,
        voiceId,
        modelId,
        voiceSettings,
        outputFormat,
      }),
    )
    .digest("hex")
    .slice(0, 24);
}

function durationOf(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" },
  ).trim();
  const duration = Number(out);
  if (!Number.isFinite(duration) || duration <= 0.5) throw new Error(`Invalid audio duration for ${file}: ${out}`);
  return duration;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesize(segment) {
  const key = cacheKey(segment);
  const target = path.join(cacheDir, `${segment.id}-${key}.mp3`);
  if (fs.existsSync(target) && fs.statSync(target).size > 1024) {
    return { file: target, duration: durationOf(target), cacheHit: true };
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`;
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "content-type": "application/json",
          accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: segment.text,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
      });
    } catch (error) {
      lastError = `network error on attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`;
    }

    if (response) {
      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        const bytes = Buffer.from(await response.arrayBuffer());
        if (!contentType.includes("audio") || bytes.length < 1024) {
          throw new Error(`ElevenLabs returned an unexpected payload for ${segment.id} (${contentType}, ${bytes.length} bytes).`);
        }
        const temp = `${target}.tmp`;
        fs.writeFileSync(temp, bytes);
        const duration = durationOf(temp);
        fs.renameSync(temp, target);
        return { file: target, duration, cacheHit: false };
      }
      const body = await response.text();
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        throw new Error(`ElevenLabs rejected ${segment.id} with HTTP ${response.status}: ${body.slice(0, 300)}`);
      }
      lastError = `HTTP ${response.status} on attempt ${attempt}: ${body.slice(0, 200)}`;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`ElevenLabs failed ${segment.id}: ${lastError}`);
      }
    }
    if (attempt < 3) await sleep(attempt === 1 ? 2000 : 5000);
  }
  throw new Error(`ElevenLabs failed ${segment.id} after retries: ${lastError}`);
}

const manifest = {
  provider: "ElevenLabs",
  modelId,
  voiceId,
  voiceName,
  outputFormat,
  voiceSettings,
  generatedAt: new Date().toISOString(),
  segments: [],
};

for (const segment of segments) {
  const result = await synthesize(segment);
  manifest.segments.push({
    id: segment.id,
    text: segment.text,
    file: path.relative(repoRoot, result.file),
    durationSeconds: Number(result.duration.toFixed(3)),
    bytes: fs.statSync(result.file).size,
    cacheHit: result.cacheHit,
  });
  console.log(
    `${segment.id}: ${result.duration.toFixed(2)}s ${result.cacheHit ? "(cached)" : "(generated)"} ` +
      `[voice=${voiceName}, model=${modelId}]`,
  );
}

manifest.totalSeconds = Number(manifest.segments.reduce((sum, item) => sum + item.durationSeconds, 0).toFixed(3));
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${path.relative(repoRoot, manifestFile)} (${manifest.totalSeconds}s total)`);
