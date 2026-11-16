#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
const baseURL = "https://assay-uhhh2.vercel.app";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const browser = await chromium.launch({ headless: false, args:["--disable-blink-features=AutomationControlled"], ignoreDefaultArgs:["--enable-automation"] });
const context = await browser.newContext({ viewport:{width:1440,height:900}, userAgent:"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" });
const page = await context.newPage();
await page.goto(`${baseURL}/login`, { waitUntil:"domcontentloaded", timeout:90000 });
await page.waitForTimeout(6000);
if ((await page.title()).toLowerCase().includes("vercel")) { await page.reload({ waitUntil:"domcontentloaded" }); await page.waitForTimeout(3000); }
const email = process.env.DEMO_ANALYST_EMAIL;
const password = process.env.DEMO_ANALYST_PASSWORD;
if (!email || !password) throw new Error("DEMO_ANALYST_EMAIL and DEMO_ANALYST_PASSWORD are required.");
await page.getByLabel("Work email").fill(email);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: /^Sign in/ }).click();
await page.waitForURL("**/dashboard", { timeout: 90000 });
await page.waitForTimeout(2500);
await expect(page.getByRole("img", { name: "Assay" }).first()).toBeVisible();
await page.screenshot({ path: path.join(repoRoot, "docs/evidence/public-signed-in.png"), fullPage:false });
console.log(JSON.stringify({ url: page.url(), title: await page.title(), logo: await page.getByRole("img", { name: "Assay" }).count() }));
await browser.close();
