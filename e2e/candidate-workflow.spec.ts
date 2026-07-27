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
    await expect(page.getByRole("link", { name: "Resume Intelligence" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse Jobs" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Applications" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Interviews" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("can view the dedicated Interviews page", async ({ page }) => {
    await page.getByRole("link", { name: "Interviews" }).click();
    await expect(page).toHaveURL(/\/candidate\/interviews$/);
    await expect(page.getByRole("heading", { name: "Interviews" })).toBeVisible();
    await expect(page.getByText(/Upcoming \(\d+\)/)).toBeVisible();
    await expect(page.getByText(/Past \(\d+\)/)).toBeVisible();
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

  test("can toggle discoverability to recruiters on the profile page", async ({ page }) => {
    await page.goto("/candidate/profile");
    const toggle = page.getByLabel("Open to being discovered by recruiters");
    const initiallyChecked = await toggle.isChecked();

    await toggle.click();
    await expect(toggle).toBeChecked({ checked: !initiallyChecked, timeout: 10_000 });

    await page.reload();
    await expect(page.getByLabel("Open to being discovered by recruiters")).toBeChecked({ checked: !initiallyChecked });

    // Restore original state so this doesn't leak into other tests.
    await page.getByLabel("Open to being discovered by recruiters").click();
    await expect(page.getByLabel("Open to being discovered by recruiters")).toBeChecked({ checked: initiallyChecked });
  });
});
