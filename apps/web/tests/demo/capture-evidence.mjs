#!/usr/bin/env node
/**
 * Captures final-build UI evidence for docs/evidence.
 * Runs against the local production build pointed at the Render API.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseURL = process.env.EVIDENCE_BASE_URL ?? "http://127.0.0.1:3000";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(repoRoot, "docs/evidence");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const signIn = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
  data: { email: process.env.DEMO_ANALYST_EMAIL, password: process.env.DEMO_ANALYST_PASSWORD },
});
if (!signIn.ok()) throw new Error(`Sign-in failed: ${signIn.status()}`);

async function shot(name, url, ready) {
  await page.goto(`${baseURL}${url}`, { waitUntil: "networkidle" });
  if (ready) await ready();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false });
  console.log(`captured ${name}`);
}

await shot("login", "/login");
await shot("dashboard", "/dashboard");
await shot("evaluations", "/evaluations");
await page.goto(`${baseURL}/evaluations`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Open", exact: true }).first().click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, "evaluation-detail.png"), fullPage: false });
console.log("captured evaluation-detail");
await shot("audit", "/audit?borrower=d0031e48-7486-435f-915a-e1aed6037a8c");
await shot("settings", "/settings");
await shot("integrations", "/integrations");

await context.close();
await browser.close();
