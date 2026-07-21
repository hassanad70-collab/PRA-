import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

test.describe("Authorization / route protection", () => {
  test("an anonymous visitor is redirected to login from every protected area", async ({ page }) => {
    for (const path of ["/candidate/dashboard", "/recruiter/dashboard", "/admin/dashboard"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("anonymous visitor is redirected to /login with a redirect param preserving the original destination", async ({ page }) => {
    await page.goto("/candidate/resume");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcandidate%2Fresume/);
  });

  test("a candidate cannot reach recruiter or admin areas", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/recruiter/dashboard");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/);

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/);
  });

  test("a recruiter cannot reach admin or candidate areas", async ({ page }) => {
    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });

    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/);

    await page.goto("/candidate/dashboard");
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/);
  });

  test("a super_admin can reach the admin panel and is not bounced to a candidate/recruiter home", async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  });

  test("an authenticated user is redirected away from /login and /register (already signed in)", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/login");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/);

    await page.goto("/register");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/);
  });
});
