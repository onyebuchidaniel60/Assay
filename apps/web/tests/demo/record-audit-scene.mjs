#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseURL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(repoRoot, "artifacts/demo/raw");
const borrowerId = process.env.DEMO_BORROWER_ID ?? "7a755b9b-7e52-4ed4-8cc5-3efd9d20a472";
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: outDir, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const signIn = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
  data: { email: process.env.DEMO_AUDITOR_EMAIL, password: process.env.DEMO_AUDITOR_PASSWORD },
});
if (!signIn.ok()) throw new Error("Auditor sign-in failed.");
await page.goto(`${baseURL}/audit?borrower=${borrowerId}`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
await page.getByRole("button", { name: /Verify chain/i }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(5000);
await page.mouse.wheel(0, 420);
await page.waitForTimeout(3000);
const video = page.video();
await context.close();
await browser.close();
const saved = await video.path();
fs.renameSync(saved, path.join(outDir, "05-audit.webm"));
console.log("recorded 05-audit");
