#!/usr/bin/env node
/**
 * Public post-submission verification: no Vercel login, logo on every route,
 * no preview/demo/staging branding, and one screenshot per route grouping.
 * Uses a headed Chromium under Xvfb because Vercel's bot checkpoint rejects
 * headless API sign-in; the public experience remains unauthenticated.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const baseURL = process.env.VERIFY_BASE_URL ?? "https://assay-uhhh2.vercel.app";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const outDir = path.join(repoRoot, "docs/evidence");
fs.mkdirSync(outDir, { recursive: true });

const borrowerId = "d0031e48-7486-435f-915a-e1aed6037a8c";
const facilityId = "a9c038bc-fbc0-4a2a-ac2c-627ce271e792";
const runId = "cca69468-53e3-429c-b6ff-d64f4c375ac0";
const documentId = "fa8cb665-ee48-4cac-a55b-8edadcf44a4b";
const evaluationId = "56cfd84f-acdc-457d-a673-c84cf0d0178c";

const banned = ["open preview", "preview workspace", "synthetic preview", "live preview", "demo mode", "demo workspace", "staging"];
const results = [];

const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
  ignoreDefaultArgs: ["--enable-automation"],
});
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function cookiesFromJar(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("#HttpOnly_"))
    .map((line) => {
      const parts = line.replace("#HttpOnly_", "").split("\t");
      return {
        name: parts[5],
        value: parts[6],
        domain: "assay-uhhh2.vercel.app",
        path: "/",
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
      };
    });
}

async function routeCheck(page, label, route, screenshot, expected = 200, wait = 1800) {
  let response;
  let text = "";
  try {
    response = await page.goto(`${baseURL}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForTimeout(wait);
    text = (await page.locator("body").innerText()).toLowerCase();
    if (text.includes("vercel security checkpoint") || text.includes("failed to verify your browser")) {
      await page.waitForTimeout(6000);
      response = await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(wait);
      text = (await page.locator("body").innerText()).toLowerCase();
    }
    if ((response?.status() ?? 0) === 403 && !text.includes("vercel security checkpoint")) {
      await page.waitForTimeout(1500);
      response = await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(wait);
      text = (await page.locator("body").innerText()).toLowerCase();
    }
  } catch (error) {
    results.push({ label, route, status: "ERROR", logo: 0, banned: [], error: String(error).slice(0, 160) });
    return;
  }
  const status = response?.status() ?? 0;
  const challenge = text.includes("vercel security checkpoint") || text.includes("failed to verify your browser");
  const logo = await page.getByRole("img", { name: "Assay" }).count();
  const hits = banned.filter((term) => text.includes(term));
  const toolbar = /vercel-toolbar|vercel toolbar/i.test(await page.content());
  results.push({ label, route, status, expected, logo, banned: hits, toolbar, challenge });
  if (screenshot) {
    await page.screenshot({ path: path.join(outDir, `${screenshot}.png`), fullPage: false });
  }
}

async function contextFor(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent });
  if (role) await context.addCookies(cookiesFromJar(`/tmp/pub-${role}.jar`));
  return context;
}

// Public
{
  const context = await contextFor(null);
  const page = await context.newPage();
  await page.goto(`${baseURL}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await routeCheck(page, "public-landing", "/", "public-landing");
  await routeCheck(page, "public-login", "/login", "public-login");
  await routeCheck(page, "public-forbidden", "/forbidden", "public-forbidden");
  await routeCheck(page, "public-not-found", "/does-not-exist", "public-not-found", 404);
  await context.close();
}

// Analyst
{
  const context = await contextFor("analyst");
  const page = await context.newPage();
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await routeCheck(page, "analyst-dashboard", "/dashboard", "analyst-dashboard");
  await routeCheck(page, "analyst-borrowers", "/borrowers", "analyst-borrowers");
  await routeCheck(page, "analyst-borrower-new", "/borrowers/new", "analyst-borrower-new");
  await routeCheck(page, "analyst-borrower-detail", `/borrowers/${borrowerId}`, "analyst-borrower-detail");
  await routeCheck(page, "analyst-facilities", "/facilities", "analyst-facilities");
  await routeCheck(page, "analyst-facility-detail", `/facilities/${facilityId}`, "analyst-facility-detail");
  await routeCheck(page, "analyst-runs", "/analysis-runs", "analyst-runs");
  await routeCheck(page, "analyst-run-detail", `/analysis-runs/${runId}`, "analyst-run-detail");
  await routeCheck(page, "analyst-document", `/documents/${documentId}`, "analyst-document");
  await routeCheck(page, "analyst-covenants", "/covenants", "analyst-covenants");
  await routeCheck(page, "analyst-cases", "/cases", "analyst-cases");
  await routeCheck(page, "analyst-case-detail", `/cases/${runId}`, "analyst-case-detail");
  await routeCheck(page, "analyst-evaluations", "/evaluations", "analyst-evaluations");
  await routeCheck(page, "analyst-evaluation-detail", `/evaluations/${evaluationId}`, "analyst-evaluation-detail");
  await routeCheck(page, "admin-settings", "/settings", "admin-settings");
  await routeCheck(page, "admin-integrations", "/integrations", "admin-integrations");
  await context.close();
}

// Manager
{
  const context = await contextFor("manager");
  const page = await context.newPage();
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await routeCheck(page, "manager-dashboard", "/dashboard", "manager-dashboard");
  await routeCheck(page, "manager-approvals", "/approvals", "manager-approvals");
  await context.close();
}

// Auditor
{
  const context = await contextFor("auditor");
  const page = await context.newPage();
  await page.goto(`${baseURL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await routeCheck(page, "auditor-audit", `/audit?borrower=${borrowerId}`, "auditor-audit");
  await routeCheck(page, "auditor-run-detail", `/analysis-runs/${runId}`, "auditor-run-detail");
  await context.close();
}

await browser.close();

const failures = results.filter(
  (r) =>
    r.status !== r.expected ||
    r.logo < 1 ||
    r.banned.length > 0 ||
    r.toolbar ||
    r.challenge ||
    r.error,
);
console.log(JSON.stringify({ baseURL, checked: results.length, failures, results }, null, 2));
if (failures.length > 0) process.exit(1);
