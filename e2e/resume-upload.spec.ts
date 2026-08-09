import fs from "fs";
import os from "os";
import path from "path";
import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";
import { makeTestResumePdfFile, TEST_RESUME_LINES } from "./helpers/fixtures";

test.describe("Resume upload", () => {
  test("My Resumes page shows upload component and not a broken redirect button", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    // The upload drag-and-drop zone must be visible on the page itself —
    // NOT hidden behind a link to /candidate/resume (which was the broken
    // redirect). Confirms the ResumeUpload component is mounted inline.
    await expect(page.getByText(/drag.*drop.*resume|drop your resume/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /browse files/i })).toBeVisible();

    // There must be NO link pointing at the legacy /candidate/resume path —
    // that path is a redirect stub that caused the circular-reload bug.
    const brokenLinks = page.locator('a[href*="/candidate/resume"]');
    await expect(brokenLinks).toHaveCount(0);
  });

  test("candidate can upload a PDF from My Resumes page and it appears in the list", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(pdfPath);

    // Wait for success or graceful failure toast
    await expect(
      page.getByText(/resume processed|ai parsing failed/i)
    ).toBeVisible({ timeout: 30_000 });

    // Page must refresh and show the uploaded resume in the list
    await expect(page.locator("body")).not.toContainText("Application error");

    // After successful upload the list heading should reflect at least 1 resume
    await expect(page.getByText(/uploaded resumes \([1-9]/i)).toBeVisible({ timeout: 10_000 });
  });

  test("View button on My Resumes page points to a real signed URL, not a blank/null href", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    // If there's at least one resume in the list, its View button must have a
    // proper Supabase signed URL (not empty, not "#").
    // Use target="_blank" to scope to resume View links only — nav links that
    // contain "View" text (e.g. "Overview") point to internal routes and never
    // carry target="_blank".
    const viewLinks = page.locator('a[target="_blank"]:has-text("View")');
    const count = await viewLinks.count();
    if (count > 0) {
      const href = await viewLinks.first().getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/supabase/i);
    }
  });

  test("candidate can upload a real PDF resume through the ATS Checker and it processes without crashing", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/workspace/ats-checker");
    // Wait for the client component to hydrate before driving the file input —
    // setInputFiles() can fire the change event before React has attached its
    // onChange listener, which silently drops the selection (no error, no
    // request). A real user can't out-race hydration picking a file from an OS
    // dialog, but Playwright's programmatic setInputFiles can.
    await page.waitForLoadState("networkidle");

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(pdfPath);

    // The action can take a while (text extraction + AI pipeline, even in
    // fallback mode); wait for either the success or the graceful-failure
    // toast rather than a fixed timeout.
    await expect(
      page.getByText(/resume processed|ai parsing failed/i)
    ).toBeVisible({ timeout: 30_000 });

    // Either way, the page must not have thrown — the resume list re-renders.
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("oversized files are rejected client-side with a clear message, not silently dropped", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/workspace/ats-checker");
    await page.waitForLoadState("networkidle");

    // Just over the app's 10MB limit, not so far over that it also trips
    // Next.js's own (much larger) server-action body size cap.
    const oversizedPath = path.join(os.tmpdir(), `e2e-oversized-${Date.now()}.pdf`);
    fs.writeFileSync(oversizedPath, Buffer.alloc(10.2 * 1024 * 1024, 0));
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(oversizedPath);

    await expect(page.getByText(/smaller than 10MB/i)).toBeVisible({ timeout: 10_000 });
  });
});
