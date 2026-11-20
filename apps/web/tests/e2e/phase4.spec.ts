import { expect, test, type Page } from "@playwright/test";

const analystEmail = process.env.DEMO_ANALYST_EMAIL;
const analystPassword = process.env.DEMO_ANALYST_PASSWORD;
const managerEmail = process.env.DEMO_CREDIT_MANAGER_EMAIL;
const managerPassword = process.env.DEMO_CREDIT_MANAGER_PASSWORD;
const auditorEmail = process.env.DEMO_AUDITOR_EMAIL;
const auditorPassword = process.env.DEMO_AUDITOR_PASSWORD;

async function signIn(page: Page, email?: string, password?: string) {
  test.skip(!email || !password, "Demo credentials are not configured.");
  const response = await page.request.post("/api/auth/sign-in/email", { data: { email, password } });
  expect(response.ok()).toBeTruthy();
}

test.describe("Assay authenticated workspace", () => {
  test("analyst sees real portfolio and run data", async ({ page }) => {
    await signIn(page, analystEmail, analystPassword);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every covenant");
    await expect(page.getByText("Borrowers", { exact: true }).first()).toBeVisible();

    await page.goto("/borrowers");
    await expect(page.getByRole("heading", { name: "Borrowers", level: 1 })).toBeVisible();
    await expect(page.getByText("BOR-004").first()).toBeVisible();

    await page.goto("/analysis-runs");
    await expect(page.getByRole("heading", { name: "Analysis runs", level: 1 })).toBeVisible();
    const open = page.getByRole("link", { name: "Open", exact: true }).first();
    await expect(open).toBeVisible();

    await page.goto("/integrations");
    await expect(page.getByText("NEAR AI Cloud", { exact: true })).toBeVisible();
    await expect(page.getByText("Arc Testnet · Circle Gateway")).toBeVisible();
  });

  test("analyst can open the approved run and inspect proof evidence", async ({ page }) => {
    await signIn(page, analystEmail, analystPassword);
    await page.goto("/analysis-runs");
    await page.locator("tr", { hasText: "APPROVED" }).first().getByRole("link", { name: "Open", exact: true }).click();
    await expect(page.getByText(/Run #\d+/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Compliance proof", { exact: true })).toBeVisible();
    await expect(page.getByText("Public signals", { exact: true })).toBeVisible();
    await expect(page.getByText(/Verification key/)).toBeVisible();
    await expect(page.getByText("Manager decision", { exact: true })).toBeVisible();
  });

  test("manager sees the restricted decision queue", async ({ page }) => {
    await signIn(page, managerEmail, managerPassword);
    await page.goto("/approvals");
    await expect(page.getByRole("heading", { name: "Approvals", level: 1 })).toBeVisible();
    await expect(page.getByText(/Nothing awaiting approval|Run [0-9a-f]{8}/).first()).toBeVisible();
    await expect(page.getByText("Raw debt")).toBeVisible();
  });

  test("auditor verifies the signed borrower chain", async ({ page }) => {
    await signIn(page, auditorEmail, auditorPassword);
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: "Audit trail", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Verify chain/i }).click();
    await expect(page.getByText(/Chain verification: VALID/)).toBeVisible();
    await expect(page.getByText("ANALYSIS APPROVED")).toBeVisible();
  });

  test("settings shows the signed-in role and server-side boundary", async ({ page }) => {
    await signIn(page, analystEmail, analystPassword);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
    await expect(page.getByText("ANALYST", { exact: true })).toBeVisible();
    await expect(page.getByText(/Secrets stay server-side/i)).toBeVisible();
  });
});

test.describe("Assay final presentation", () => {
  test("logo, favicon and live Reppo verdict are visible", async ({ page }) => {
    await signIn(page, analystEmail, analystPassword);
    await page.goto("/dashboard");
    await expect(page.getByRole("img", { name: "Assay" }).first()).toBeVisible();
    const favicon = await page.request.get("/favicon.ico");
    expect(favicon.ok()).toBeTruthy();
    await page.goto("/evaluations");
    await expect(page.getByText("COMPLETED").first()).toBeVisible();
    await expect(page.getByText("98", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Open", exact: true }).first().click();
    await expect(page.getByText("accept", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("low", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("review", { exact: true }).first()).toBeVisible();
  });
});
