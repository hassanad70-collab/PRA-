import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { makeTestResumePdfFile, TEST_RESUME_LINES } from "./helpers/fixtures";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe("Guest ATS Resume Checker", () => {
  test("the page is public and requires no login", async ({ page }) => {
    await page.goto("/ai-tools/ats-checker");
    await expect(page.getByRole("heading", { name: "Free AI Resume Checker" })).toBeVisible();
    await expect(page.getByText("Drag & drop your resume here")).toBeVisible();
  });

  test("a guest can upload a resume and see the complete ATS analysis, then gets a signup CTA", async ({ page }) => {
    await page.goto("/ai-tools/ats-checker");
    // Wait for hydration before driving the file input — setInputFiles() can
    // fire before React attaches its onChange listener, silently dropping
    // the selection (same race fixed in the authenticated resume-upload spec).
    await page.waitForLoadState("networkidle");

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.locator('input[type="file"]').setInputFiles(pdfPath);

    await expect(page.getByRole("heading", { name: "Your ATS Score" })).toBeVisible({ timeout: 30_000 });

    // The complete analysis must be visible — no hidden/gated sections.
    await expect(page.getByText("Experience")).toBeVisible();
    await expect(page.getByText("Skills")).toBeVisible();
    await expect(page.getByText("Formatting")).toBeVisible();

    await expect(page.getByText("Create a free account to save this analysis")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create your free account" })).toBeVisible();

    // No account was ever created, and no candidate/resume/ats_score row
    // exists — the guest run must be fully ephemeral.
    const admin = adminClient();
    const { data: usage } = await admin.from("guest_tool_usage").select("id").eq("tool_key", "ats_checker").limit(1);
    expect(usage!.length).toBeGreaterThan(0);
  });

  test("a second scan from the same guest session is blocked with a clear message, not a crash", async ({ page }) => {
    await page.goto("/ai-tools/ats-checker");
    await page.waitForLoadState("networkidle");

    const firstPdf = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.locator('input[type="file"]').setInputFiles(firstPdf);
    await expect(page.getByRole("heading", { name: "Your ATS Score" })).toBeVisible({ timeout: 30_000 });

    // Reload and try again with the same guest session cookie still set.
    await page.goto("/ai-tools/ats-checker");
    await page.waitForLoadState("networkidle");

    const secondPdf = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.locator('input[type="file"]').setInputFiles(secondPdf);

    await expect(page.getByText("Free scan used")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/already used your free ATS scan/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error");
  });
});
