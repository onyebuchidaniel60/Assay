import { expect, test } from "@playwright/test";

test.describe("Assay Phase 1 shell", () => {
  test("landing page exposes the product and entry points", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Assay/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Read the clause");
    await expect(page.getByRole("link", { name: /Enter the preview workspace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Invite-only sign-in/i })).toBeVisible();
  });

  test("dashboard is navigable and separates actual from forecast", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Every covenant/i })).toBeVisible();
    await expect(page.getByText("Actual breaches").first()).toBeVisible();
    await expect(page.getByText("Scenario at risk").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Harborline Logistics/i }).first()).toBeVisible();
    await page.getByRole("link", { name: /Open queue/i }).click();
    await expect(page.getByRole("heading", { name: /Analysis runs/i })).toBeVisible();
  });

  test("facility and covenant detail routes render", async ({ page }) => {
    await page.goto("/facilities/demo");
    await expect(page.getByRole("heading", { name: /Term Loan A/i })).toBeVisible();
    await page.goto("/covenants/demo");
    await expect(page.getByRole("heading", { name: /Maximum leverage/i })).toBeVisible();
    await expect(page.getByText(/Source clause/i).first()).toBeVisible();
  });

  test("audit verification fixture is a real interaction", async ({ page }) => {
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: /Audit trail/i })).toBeVisible();
    await page.getByRole("link", { name: /Run chain check/i }).click();
    await expect(page.getByText(/Fixture chain check complete/i)).toBeVisible();
  });

  test("login form is clearly a preview and does not fake auth", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/Authentication is not wired yet/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue to preview/i })).toBeVisible();
  });
});
