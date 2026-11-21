#!/usr/bin/env node
/**
 * Build readable 1-2 line caption cues from the prepared narration timeline.
 * Timing is proportional to each cue's share of its narration segment.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const timeline = JSON.parse(fs.readFileSync(path.join(here, "audio-v3/manifest.json"), "utf8")).timeline;

function splitCues(text, target = 68) {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).map((item) => item.trim()).filter(Boolean);
  const cues = [];
  for (const sentence of sentences) {
    if (sentence.length <= target) {
      cues.push(sentence);
      continue;
    }
    const parts = sentence.split(/(?<=,|;|:)\s+/);
    let current = "";
    for (const part of parts) {
      if (!current) {
        current = part;
      } else if ((current + " " + part).length <= target) {
        current += " " + part;
      } else {
        if (current.length > target * 1.35) {
          const words = current.split(/\s+/);
          let line = "";
          for (const word of words) {
            if ((line + " " + word).trim().length > target) {
              if (line) cues.push(line.trim());
              line = word;
            } else {
              line = `${line} ${word}`.trim();
            }
          }
          if (line) cues.push(line.trim());
        } else {
          cues.push(current.trim());
        }
        current = part;
      }
    }
    if (current) {
      if (current.length > target * 1.35) {
        const words = current.split(/\s+/);
        let line = "";
        for (const word of words) {
          if ((line + " " + word).trim().length > target) {
            if (line) cues.push(line.trim());
            line = word;
          } else {
            line = `${line} ${word}`.trim();
          }
        }
        if (line) cues.push(line.trim());
      } else {
        cues.push(current.trim());
      }
    }
  }
  return cues;
}

function wrap(text, width = 42) {
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

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
}

const entries = [];
for (const segment of timeline) {
  const cues = splitCues(segment.text);
  const weights = cues.map((cue) => cue.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = segment.startSeconds;
  cues.forEach((cue, index) => {
    const cueDuration = index === cues.length - 1
      ? segment.endSeconds - cursor
      : (segment.durationSeconds * weights[index]) / totalWeight;
    const start = cursor;
    const end = Math.min(segment.endSeconds, cursor + cueDuration);
    entries.push({ start, end, text: cue });
    cursor = end;
  });
}

const srt = entries
  .map((entry, index) => `${index + 1}\n${srtTime(entry.start)} --> ${srtTime(entry.end)}\n${wrap(entry.text).join("\n")}\n`)
  .join("\n");
fs.writeFileSync(path.join(here, "captions-v3.srt"), srt);
fs.writeFileSync(path.join(here, "captions-v3.json"), `${JSON.stringify(entries, null, 2)}\n`);
console.log(`wrote ${entries.length} caption cues, max chars ${Math.max(...entries.map((entry) => entry.text.length))}`);
