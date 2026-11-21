#!/usr/bin/env node
/**
 * Prepare cached ElevenLabs narration for the final Assay demo.
 * Applies a subtle 1.06x tempo lift (pitch preserved), loudness
 * normalisation, short inter-scene gaps, and writes captions/timings.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(here, "narration-manifest-v3.json"), "utf8"));
const outDir = path.join(here, "audio-v3");
fs.mkdirSync(outDir, { recursive: true });

function ffmpeg(args) {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}
function durationOf(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { encoding: "utf8" },
  ).trim();
  return Number(out);
}

const prepared = [];
for (const segment of manifest.segments) {
  const input = path.join(repoRoot, segment.file);
  const output = path.join(outDir, `${segment.id}.wav`);
  ffmpeg([
    "-i",
    input,
    "-af",
    "atempo=1.06,loudnorm=I=-16:TP=-1.5:LRA=11,adelay=150:all=1,apad=pad_dur=0.30",
    "-ar",
    "48000",
    "-ac",
    "1",
    output,
  ]);
  const duration = durationOf(output);
  prepared.push({ ...segment, preparedFile: path.relative(repoRoot, output), preparedDuration: duration });
  console.log(`${segment.id}: ${segment.durationSeconds}s -> ${duration.toFixed(3)}s`);
}

const listFile = path.join(outDir, "concat.txt");
fs.writeFileSync(listFile, prepared.map((item) => `file '${path.basename(item.preparedFile)}'`).join("\n") + "\n");
const narration = path.join(outDir, "narration.wav");
ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", narration]);

let cursor = 0;
const timeline = prepared.map((item) => {
  const start = cursor;
  cursor += item.preparedDuration;
  return {
    id: item.id,
    text: item.text,
    file: item.preparedFile,
    startSeconds: Number(start.toFixed(3)),
    durationSeconds: Number(item.preparedDuration.toFixed(3)),
    endSeconds: Number(cursor.toFixed(3)),
  };
});

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
}

function wrap(text, width = 74) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > width) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

const srt = timeline
  .map((item, index) => {
    const lines = wrap(item.text);
    return `${index + 1}\n${srtTime(item.startSeconds)} --> ${srtTime(item.endSeconds)}\n${lines.join("\n")}\n`;
  })
  .join("\n");
const srtFile = path.join(here, "captions-v3.srt");
fs.writeFileSync(srtFile, srt);

fs.writeFileSync(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify({ provider: manifest.provider, voiceName: manifest.voiceName, modelId: manifest.modelId, totalSeconds: cursor, timeline }, null, 2)}\n`,
);
console.log(`narration ${durationOf(narration).toFixed(3)}s -> ${path.relative(repoRoot, narration)}`);
console.log(`captions -> ${path.relative(repoRoot, srtFile)}`);
