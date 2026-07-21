import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

test.describe("Candidate workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  });

  test("dashboard renders with no console errors and correct nav", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Resume & ATS" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Applications" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("can navigate to profile and see the profile editor", async ({ page }) => {
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/candidate\/profile$/);
  });

  test("can browse jobs from within the authenticated area", async ({ page }) => {
    await page.getByRole("link", { name: "Browse Jobs" }).click();
    await expect(page).toHaveURL(/\/candidate\/jobs$/);
    await expect(page.getByRole("heading", { name: "Browse Jobs" })).toBeVisible();
  });

  test("can view applications page", async ({ page }) => {
    await page.getByRole("link", { name: "Applications" }).click();
    await expect(page).toHaveURL(/\/candidate\/applications$/);
  });
});
