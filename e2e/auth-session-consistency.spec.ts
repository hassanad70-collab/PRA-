import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS, TEST_JOB_SLUG } from "./global-setup";

/**
 * Regression suite for the auth session consistency issue.
 *
 * Root cause 1: The public job detail page had `export const revalidate = 300`
 * and never called getCurrentUser(), so it always rendered "Sign in to apply"
 * even when a valid session existed. An authenticated candidate saw a "sign in"
 * prompt on every public job URL — the most common cross-page navigation path.
 *
 * Root cause 2: src/middleware.ts used Headers.forEach to copy Set-Cookie headers
 * from the Supabase session response to the intl response. Headers.forEach can
 * combine multiple Set-Cookie values into one comma-separated string, which is
 * invalid per the HTTP spec and causes chunked session tokens to be dropped.
 * Fixed by using headers.getSetCookie() which returns individual values.
 */

async function getTestJobId() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();
  return job!.id as string;
}

test.describe("Auth session consistency — public job detail page", () => {
  test("authenticated candidate sees 'Apply now', NOT 'Sign in to apply'", async ({ page }) => {
    const jobId = await getTestJobId();

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    // Navigate to the public job detail page as an authenticated candidate.
    // Before the fix this page always rendered "Sign in to apply" regardless
    // of session state because it was ISR-cached without an auth check.
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState("networkidle");

    // Must see "Apply now" — the auth-aware CTA for candidates.
    await expect(page.getByRole("link", { name: /apply now/i })).toBeVisible({ timeout: 10_000 });

    // Must NOT see "Sign in to apply" — that's the guest-only CTA.
    await expect(page.getByRole("link", { name: /sign in to apply/i })).toHaveCount(0);
  });

  test("authenticated candidate 'Apply now' button links to the candidate-side job detail", async ({ page }) => {
    const jobId = await getTestJobId();

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState("networkidle");

    const applyLink = page.getByRole("link", { name: /apply now/i });
    const href = await applyLink.getAttribute("href");

    // The href must point to the authenticated candidate job detail (/candidate/jobs/…),
    // not to a login page — confirming the page recognized the active session.
    expect(href).toMatch(/\/candidate\/jobs\//);
    expect(href).not.toMatch(/\/login/);
  });

  test("unauthenticated visitor still sees 'Sign in to apply' on the public job detail page", async ({ page }) => {
    const jobId = await getTestJobId();

    // No login — pure guest
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("link", { name: /sign in to apply/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /apply now/i })).toHaveCount(0);
  });

  test("session persists navigating from dashboard to public job page and back", async ({ page }) => {
    const jobId = await getTestJobId();

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    // Navigate to a public page — session must survive this cross-layout hop.
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState("networkidle");
    // Session still active: candidate CTA visible, not the sign-in prompt.
    await expect(page.getByRole("link", { name: /apply now/i })).toBeVisible({ timeout: 10_000 });

    // Navigate back to a protected route — must NOT redirect to login.
    await page.goto("/candidate/dashboard");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("authenticated recruiter sees NO apply CTA on the public job detail page", async ({ page }) => {
    const jobId = await getTestJobId();

    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });

    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState("networkidle");

    // Recruiters are authenticated but are not candidates — no apply CTA should
    // appear (neither "Apply now" nor "Sign in to apply").
    await expect(page.getByRole("link", { name: /apply now/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /sign in to apply/i })).toHaveCount(0);
  });
});
