#!/usr/bin/env node
/**
 * Records real Playwright interactions for the Assay demo. Each scene uses the
 * authenticated local web app backed by the deployed Render API. No mocked UI
 * and no synthetic provider success are injected.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseURL = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(repoRoot, "artifacts/demo/raw");
const runId = process.env.DEMO_RUN_ID ?? "83b77b69-60c0-498e-b122-6405789efa94";
const borrowerId = process.env.DEMO_BORROWER_ID ?? "7a755b9b-7e52-4ed4-8cc5-3efd9d20a472";
fs.mkdirSync(outDir, { recursive: true });

const credentials = {
  analyst: { email: process.env.DEMO_ANALYST_EMAIL, password: process.env.DEMO_ANALYST_PASSWORD },
  manager: { email: process.env.DEMO_CREDIT_MANAGER_EMAIL, password: process.env.DEMO_CREDIT_MANAGER_PASSWORD },
  auditor: { email: process.env.DEMO_AUDITOR_EMAIL, password: process.env.DEMO_AUDITOR_PASSWORD },
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scene(name, role, action, tail = 2500) {
  const before = new Set(fs.readdirSync(outDir));
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const login = credentials[role];
  if (!login?.email || !login?.password) throw new Error(`Missing demo credentials for ${role}.`);
  const response = await page.request.post(`${baseURL}/api/auth/sign-in/email`, {
    data: { email: login.email, password: login.password },
  });
  if (!response.ok()) throw new Error(`Sign-in failed for ${role}.`);
  await action(page);
  await page.waitForTimeout(tail);
  const video = page.video();
  await context.close();
  await browser.close();
  if (video) {
    const saved = await video.path();
    const target = path.join(outDir, `${name}.webm`);
    fs.renameSync(saved, target);
    console.log(`recorded ${name}`);
  }
  for (const file of fs.readdirSync(outDir)) {
    if (!before.has(file) && file.endsWith(".webm") && file !== `${name}.webm`) {
      fs.rmSync(path.join(outDir, file), { force: true });
    }
  }
}

async function slowScroll(page, amount, pauses = 1) {
  for (let index = 0; index < pauses; index += 1) {
    await page.mouse.wheel(0, amount);
    await page.waitForTimeout(1800);
  }
}

await scene("01-dashboard", "analyst", async (page) => {
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "networkidle" });
  await wait(2500);
  await slowScroll(page, 380);
  await slowScroll(page, 420);
  await page.mouse.wheel(0, -900);
  await wait(2000);
});

await scene("02-facility", "analyst", async (page) => {
  await page.goto(`${baseURL}/facilities`, { waitUntil: "networkidle" });
  await wait(2500);
  await page.getByRole("link", { name: /Revolving Credit Facility 013/i }).first().click();
  await page.waitForLoadState("networkidle");
  await wait(2500);
  await slowScroll(page, 560);
  await slowScroll(page, 420);
});

await scene("03-analysis", "analyst", async (page) => {
  await page.goto(`${baseURL}/analysis-runs/${runId}`, { waitUntil: "networkidle" });
  await wait(3000);
  await slowScroll(page, 500);
  await slowScroll(page, 520);
  await slowScroll(page, 520, 2);
  await slowScroll(page, 520, 2);
});

if (process.env.DEMO_SKIP_APPROVAL !== "1") {
await scene("04-approval", "manager", async (page) => {
  await page.goto(`${baseURL}/approvals`, { waitUntil: "networkidle" });
  await wait(3000);
  await slowScroll(page, 380);
  const card = page.locator("article").filter({ hasText: "BOR-013" }).first();
  await card.scrollIntoViewIfNeeded();
  await wait(1800);
  await card.locator('select[name="decision"]').selectOption("APPROVE");
  await wait(800);
  await card
    .locator('input[name="rationale"]')
    .fill("Baseline compliant at 3.48x; both stress cases breach and are acknowledged as risk flags. Proof verified.");
  await page.waitForTimeout(700);
  await card.locator('input[name="riskAcknowledged"]').check();
  await page.waitForTimeout(1000);
  if (process.env.DEMO_DRY_RUN === "1") {
    await page.waitForTimeout(2500);
    return;
  }
  await card.getByRole("button", { name: /Record manager decision/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
});

}

await scene("05-audit", "auditor", async (page) => {
  await page.goto(`${baseURL}/audit?borrower=${borrowerId}`, { waitUntil: "networkidle" });
  await wait(2500);
  await page.getByRole("button", { name: /Verify chain/i }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await slowScroll(page, 420);
});

await scene("06-integrations", "analyst", async (page) => {
  await page.goto(`${baseURL}/integrations`, { waitUntil: "networkidle" });
  await wait(2500);
  await slowScroll(page, 420);
  await slowScroll(page, 380);
});

console.log("all scenes recorded");
