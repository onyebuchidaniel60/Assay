#!/usr/bin/env node
/**
 * Record real 1080p footage from the deployed Assay application.
 * No mocked responses, no fixture data, no re-enacted payment click.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "/root/Assay/apps/web/node_modules/@playwright/test/index.mjs";

const baseURL = process.env.DEMO_BASE_URL ?? "https://assay-uhhh2.vercel.app";
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const outDir = path.join(here, "raw-v3");
fs.mkdirSync(outDir, { recursive: true });
const timeline = JSON.parse(fs.readFileSync(path.join(here, "audio-v3/manifest.json"), "utf8")).timeline;
const durationFor = (id) => timeline.find((item) => item.id === id)?.durationSeconds ?? 15;

const credentials = {
  analyst: { email: process.env.DEMO_ANALYST_EMAIL, password: process.env.DEMO_ANALYST_PASSWORD },
  manager: { email: process.env.DEMO_CREDIT_MANAGER_EMAIL, password: process.env.DEMO_CREDIT_MANAGER_PASSWORD },
  auditor: { email: process.env.DEMO_AUDITOR_EMAIL, password: process.env.DEMO_AUDITOR_PASSWORD },
};
for (const [role, value] of Object.entries(credentials)) {
  if (!value.email || !value.password) throw new Error(`Missing demo credentials for ${role}.`);
}

const APPROVED_RUN = "fc6362d8-f6a1-4276-8955-343a7c23ca28";
const PAYMENT_RUN = "856a437a-0449-4d2e-8cab-024fc0fa8140";
const APPROVED_BORROWER = "9042b156-a046-458d-af28-cf9e712e7625";
const PAYMENT_BORROWER = "5a79c0fb-0710-44f3-ac6b-251e71c2e1d7";
const TX = "0xc0a9997fae6db0049622555905b59cb2c9585ab17b8825051e3f260538a9e134";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function scroll(page, total, durationMs, steps = 24) {
  for (let index = 0; index < steps; index += 1) {
    await page.mouse.wheel(0, total / steps);
    await wait(durationMs / steps);
  }
}

async function record({ name, role = "analyst", seconds, action }) {
  const browser = await chromium.launch({ headless: false, args: ["--disable-blink-features=AutomationControlled"] });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    reducedMotion: "no-preference",
    ...(role ? { storageState: `/root/assay-secrets/demo-auth/${role}.json` } : {}),
  });
  const page = await context.newPage();
  const actionStart = Date.now();
  await action(page);
  const remaining = seconds * 1000 - (Date.now() - actionStart);
  if (remaining > 0) await wait(remaining);
  const video = page.video();
  await context.close();
  await browser.close();
  if (!video) throw new Error(`No video captured for ${name}`);
  const saved = await video.path();
  const target = path.join(outDir, `${name}.webm`);
  fs.renameSync(saved, target);
  console.log(`${name}: ${seconds.toFixed(2)}s target -> ${path.relative(repoRoot, target)}`);
}

// Each scene records a little longer than its narration so the editor can
// choose a clean in-point without speeding up or freezing footage.
for (const scene of [
  {
    name: "s01-dashboard",
    seconds: durationFor("seg01") + 4,
    action: async (page) => {
      await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2500);
      await scroll(page, 420, 5000);
      await page.waitForTimeout(1200);
      await scroll(page, -420, 2500);
      await page.waitForTimeout(1800);
    },
  },
  {
    name: "s02-workspace",
    seconds: durationFor("seg02") + 4,
    action: async (page) => {
      await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2200);
      await scroll(page, 330, 3200);
      await page.waitForTimeout(1200);
      await page.goto(`${baseURL}/analysis-runs`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(1800);
      await scroll(page, 300, 3800);
    },
  },
  {
    name: "s03-approved-run",
    seconds: durationFor("seg03") + 4,
    action: async (page) => {
      await page.goto(`${baseURL}/analysis-runs/${APPROVED_RUN}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2600);
      await scroll(page, 560, 4200);
      await page.waitForTimeout(900);
      await scroll(page, 700, 5200);
      await page.waitForTimeout(900);
      await scroll(page, 760, 6200);
      await page.waitForTimeout(1200);
    },
  },
  {
    name: "s04-privacy",
    role: "auditor",
    seconds: durationFor("seg04") + 4,
    action: async (page) => {
      await page.goto(`${baseURL}/audit?borrower=${APPROVED_BORROWER}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2400);
      await scroll(page, 300, 2600);
      await page.waitForTimeout(1200);
      await scroll(page, 420, 4200);
      await page.waitForTimeout(900);
      await scroll(page, 420, 4200);
    },
  },
  {
    name: "s05-payment-flow",
    seconds: durationFor("seg05") + 5,
    action: async (page) => {
      await page.goto(`${baseURL}/analysis-runs/${PAYMENT_RUN}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2600);
      await scroll(page, 540, 3800);
      await page.waitForTimeout(800);
      await scroll(page, 620, 4800);
      await page.waitForTimeout(1000);
      await scroll(page, 620, 4800);
      await page.waitForTimeout(1200);
      await scroll(page, 720, 6000);
      await page.waitForTimeout(1200);
      await scroll(page, 620, 5000);
    },
  },
  {
    name: "s06-explorer",
    role: null,
    seconds: durationFor("seg06") + 4,
    action: async (page) => {
      await page.goto(`https://explorer.arc.io/tx/${TX}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(5000);
      await scroll(page, 120, 2400);
      await page.waitForTimeout(1200);
      await scroll(page, 120, 2400);
    },
  },
  {
    name: "s07-evidence",
    seconds: durationFor("seg07") + 4,
    action: async (page) => {
      await page.goto(`${baseURL}/analysis-runs/${PAYMENT_RUN}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2200);
      const evidence = page.getByText("Retrieved evidence", { exact: false }).first();
      await evidence.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1800);
      await scroll(page, 330, 5200);
      await page.waitForTimeout(1400);
      await scroll(page, 260, 4000);
    },
  },
  {
    name: "s08-payment-audit",
    role: "auditor",
    seconds: durationFor("seg08") + 4,
    action: async (page) => {
      await page.goto(`${baseURL}/audit?borrower=${PAYMENT_BORROWER}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await page.waitForTimeout(2400);
      const verify = page.getByRole("button", { name: /^Verify chain$/ });
      await verify.click();
      await page.waitForTimeout(2800);
      await scroll(page, 340, 2400);
      await page.waitForTimeout(1200);
      await scroll(page, 380, 3200);
    },
  },
]) {
  await record(scene);
}

console.log("recorded all deployed-app scenes");
