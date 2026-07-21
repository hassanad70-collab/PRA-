import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

test.describe("Admin workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  });

  test("dashboard shows platform-wide KPIs with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/admin/dashboard");
    await expect(page.getByText("Total companies")).toBeVisible();
    await expect(page.getByText("Total recruiters")).toBeVisible();
    await expect(page.getByText("Total candidates")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("can view the users list across every role", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByText(TEST_USERS.candidate.email)).toBeVisible();
    await expect(page.getByText(TEST_USERS.recruiter.email)).toBeVisible();
  });

  test("can view the companies list, including both test companies", async ({ page }) => {
    await page.goto("/admin/companies");
    await expect(page.getByText(TEST_USERS.recruiter.companyName)).toBeVisible();
    await expect(page.getByText(TEST_USERS.recruiterOther.companyName)).toBeVisible();
  });

  test("can view audit logs", async ({ page }) => {
    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("heading", { name: "Audit Logs" })).toBeVisible();
  });

  test("can view system settings across all five sections", async ({ page }) => {
    await page.goto("/admin/settings");
    for (const tab of ["General", "Email", "AI", "Storage", "Security"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(page.getByRole("tabpanel")).toBeVisible();
    }
  });
});
