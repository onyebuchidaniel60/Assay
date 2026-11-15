import { expect, test } from "@playwright/test";

const demoEmail = process.env.DEMO_ANALYST_EMAIL;
const demoPassword = process.env.DEMO_ANALYST_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  if (!demoEmail || !demoPassword) return;
  const response = await page.request.post("/api/auth/sign-in/email", {
    data: { email: demoEmail, password: demoPassword },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("Assay authenticated shell", () => {
  test("landing page exposes the product and entry points", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Assay/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Read the clause");
    await expect(page.getByRole("link", { name: /Enter the preview workspace/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Invite-only sign-in/i })).toBeVisible();
  });

  test("dashboard is navigable and separates actual from forecast", async ({ page }) => {
    test.skip(!demoEmail || !demoPassword, "Demo analyst credentials are not configured.");
    await signIn(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Every covenant/i })).toBeVisible();
    await expect(page.getByText("Actual breaches").first()).toBeVisible();
    await expect(page.getByText("Runs in review").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Open analysis queue/i })).toBeVisible();
    await page.getByRole("link", { name: /Open analysis queue/i }).click();
    await expect(page.getByRole("heading", { name: /Analysis runs/i })).toBeVisible();
  });

  test("facility and covenant registers render real records", async ({ page }) => {
    test.skip(!demoEmail || !demoPassword, "Demo analyst credentials are not configured.");
    await signIn(page);
    await page.goto("/facilities");
    await expect(page.getByRole("heading", { name: "Facilities", level: 1 })).toBeVisible();
    await page.locator('a[href^="/facilities/"]').first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.goto("/covenants");
    await expect(page.getByRole("heading", { name: /Covenant register/i })).toBeVisible();
  });

  test("login form is a real Neon Auth sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(/Neon Auth · invite-only/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Sign in$/i })).toBeVisible();
  });
});
