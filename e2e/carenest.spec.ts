import { test, expect } from "@playwright/test";

test.describe("CareNest End-to-End User Journeys", () => {
  test("Landing Page renders with tagline and role switcher perspectives", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CareNest/);
    await expect(page.locator("h1")).toContainText("One connected circle of care");
    await expect(page.getByText("Eleanor Vance").first()).toBeVisible();
    await expect(page.getByText("Sarah Vance").first()).toBeVisible();
    await expect(page.getByText("Marcus Reed, RN").first()).toBeVisible();
  });

  test("Authentication page displays Senior PIN quick access and demo logins", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sign In to Your Care Circle")).toBeVisible();
    await expect(page.getByText("Senior Quick PIN (1234)")).toBeVisible();

    // Toggle Senior PIN
    await page.getByText("Senior Quick PIN (1234)").click();
    await expect(page.getByPlaceholder("••••")).toBeVisible();
  });

  test("Escalation Engine health check endpoint responds", async ({ request }) => {
    const response = await request.get("/api/scheduler/process-escalations");
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe("HEALTHY");
  });
});
