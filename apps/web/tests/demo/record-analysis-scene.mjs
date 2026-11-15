#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseURL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(repoRoot, "artifacts/demo/raw");
const runId = process.env.DEMO_RUN_ID ?? "83b77b69-60c0-498e-b122-6405789efa94";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const signIn = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
  data: { email: process.env.DEMO_ANALYST_EMAIL, password: process.env.DEMO_ANALYST_PASSWORD },
});
if (!signIn.ok()) throw new Error("Analyst sign-in failed.");
await page.goto(`${baseURL}/analysis-runs/${runId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
for (const amount of [300, 360, 360, 360, 360]) {
  await page.mouse.wheel(0, amount);
  await page.waitForTimeout(5200);
}
const video = page.video();
await context.close();
await browser.close();
const saved = await video.path();
fs.renameSync(saved, path.join(outDir, "03-analysis.webm"));
console.log("recorded 03-analysis (slow)");
