import fs from "fs";
import os from "os";
import path from "path";
import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";
import { makeTestResumePdfFile, TEST_RESUME_LINES } from "./helpers/fixtures";

test.describe("Resume upload", () => {
  test("candidate can upload a real PDF resume through the UI and it processes without crashing", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/resume");

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
    await page.goto("/candidate/resume");

    // Just over the app's 10MB limit, not so far over that it also trips
    // Next.js's own (much larger) server-action body size cap.
    const oversizedPath = path.join(os.tmpdir(), `e2e-oversized-${Date.now()}.pdf`);
    fs.writeFileSync(oversizedPath, Buffer.alloc(10.2 * 1024 * 1024, 0));
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(oversizedPath);

    await expect(page.getByText(/smaller than 10MB/i)).toBeVisible({ timeout: 10_000 });
  });
});
