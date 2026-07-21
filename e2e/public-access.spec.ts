import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { TEST_JOB_SLUG } from "./global-setup";

test.describe("Public (unauthenticated) access", () => {
  test("landing page is public", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /hire smarter/i })).toBeVisible();
  });

  test("job browsing is public and lists published jobs without requiring login", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.getByRole("heading", { name: "Browse Jobs" })).toBeVisible();
    await expect(page.getByText("E2E Test — Software Engineer")).toBeVisible();
  });

  test("a public job detail page is viewable and prompts sign-in to apply", async ({ page }) => {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();

    await page.goto(`/jobs/${job!.id}`);
    await expect(page.getByRole("heading", { name: "E2E Test — Software Engineer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in to apply" })).toBeVisible();
  });

  test("clicking 'Sign in to apply' preserves the return destination through login", async ({ page }) => {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();

    await page.goto(`/jobs/${job!.id}`);
    await page.getByRole("link", { name: "Sign in to apply" }).click();
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=(%2F|/)candidate(%2F|/)jobs(%2F|/)${job!.id}`));
  });

  test("public company profile page is viewable without login", async ({ page }) => {
    await page.goto("/companies/e2e-test-company");
    await expect(page.getByRole("heading", { name: "E2E Test Company", exact: true })).toBeVisible();
    await expect(page.getByText("E2E Test — Software Engineer")).toBeVisible();
  });

  test("robots.txt and sitemap.xml are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
  });
});
