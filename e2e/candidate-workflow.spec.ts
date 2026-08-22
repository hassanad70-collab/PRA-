import { test, expect } from "@playwright/test";

import { STORAGE_STATE } from "./helpers/auth";

test.describe("Candidate workflow", () => {
  test.use({ storageState: STORAGE_STATE.candidate });

  test.beforeEach(async ({ page }) => {
    await page.goto("/candidate/dashboard");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  });

  test("dashboard renders with no console errors and correct nav", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // Scope all nav assertions to the sidebar to avoid matching duplicate links
    // in the dashboard Quick Actions section.
    const sidebar = page.getByRole("complementary");

    // Root nav item
    await expect(sidebar.getByRole("link", { name: "Overview" })).toBeVisible();

    // AI Career Workspace group
    await expect(sidebar.getByRole("link", { name: "AI Career Chatbot" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "ATS Resume Checker" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Resume Studio" })).toBeVisible();

    // Jobs group
    await expect(sidebar.getByRole("link", { name: "Browse Jobs" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Applications" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Interviews" })).toBeVisible();

    // Account group
    await expect(sidebar.getByRole("link", { name: "Settings" })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("can view the dedicated Interviews page", async ({ page }) => {
    await page.getByRole("link", { name: "Interviews" }).click();
    await expect(page).toHaveURL(/\/candidate\/interviews$/);
    await expect(page.getByRole("heading", { name: "Interviews" })).toBeVisible();
    await expect(page.getByText(/Upcoming \(\d+\)/)).toBeVisible();
    await expect(page.getByText(/Past \(\d+\)/)).toBeVisible();
  });

  test("can navigate to settings (profile) via nav", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/candidate\/settings$/);
  });

  test("can browse jobs from within the authenticated area", async ({ page }) => {
    await page.getByRole("complementary").getByRole("link", { name: "Browse Jobs" }).click();
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
