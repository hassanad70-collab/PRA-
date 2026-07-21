import { test, expect } from "@playwright/test";

import { login, logout } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

test.describe("Authentication", () => {
  test("a new candidate can register and lands directly in their dashboard, already logged in", async ({ page }) => {
    const uniqueEmail = `e2e.register.${Date.now()}@example.test`;

    await page.goto("/register");
    await page.getByPlaceholder("Jane Doe").fill("New Candidate");
    await page.getByPlaceholder("you@example.com").fill(uniqueEmail);
    await page.getByLabel("Password", { exact: true }).fill("TestPass123!");
    await page.getByLabel("Confirm password").fill("TestPass123!");
    await page.getByRole("button", { name: "Create candidate account" }).click();

    // No "check your inbox" screen, no confirmation step — straight to the dashboard.
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("a registered candidate can log in with the same credentials", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  });

  test("wrong password is rejected with a clear error, not a crash", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, "definitely-wrong-password");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("logout clears the session and protected pages become inaccessible again", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await logout(page);

    await page.goto("/candidate/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("session persists across a page reload", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.reload();
    await expect(page).toHaveURL(/\/candidate\/dashboard$/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
