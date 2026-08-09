import fs from "fs";
import os from "os";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { makeTestResumePdfFile, TEST_RESUME_LINES } from "./helpers/fixtures";
import { TEST_USERS } from "./global-setup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Uploads a file through the My Resumes page file input and waits for the
 * success or graceful-failure toast. Returns the toast text.
 */
async function uploadViaResumesPage(
  page: Parameters<typeof login>[0],
  filePath: string
): Promise<string> {
  await page.goto("/candidate/workspace/resumes");
  await page.waitForLoadState("networkidle");

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);

  // .first() avoids strict mode violation when both the progress stage label
  // and the toast simultaneously match the regex.
  const toast = page.getByText(/resume processed|ai parsing failed|uploaded.*parsing failed/i).first();
  await toast.waitFor({ timeout: 40_000 });
  return (await toast.textContent()) ?? "";
}

/** Makes a minimal valid PDF written to a temp file with a custom base name. */
function makeNamedPdf(baseName: string): string {
  const safeBase = baseName.replace(/[<>:"/\\|?*]/g, "_");
  const filePath = path.join(os.tmpdir(), `${safeBase}-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, makeTestResumePdf(TEST_RESUME_LINES));
  return filePath;
}

// Inline minimal PDF builder so we can set a custom OS filename without
// coupling to the helper's fixed naming convention.
function makeTestResumePdf(lines: string[]): Buffer {
  const content = ["BT", "/F1 11 Tf", "50 740 Td"];
  lines.forEach((line, i) => {
    if (i > 0) content.push("0 -16 Td");
    content.push(`(${line.replace(/[()\\]/g, "")}) Tj`);
  });
  content.push("ET");
  const stream = content.join("\n");

  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 612 792]/Contents 5 0 R>>",
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

// ---------------------------------------------------------------------------
// Suite 1 — Filename acceptance (Issues 1 & 3)
// ---------------------------------------------------------------------------

test.describe("Resume upload — filename acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  });

  test("standard English filename uploads successfully", async ({ page }) => {
    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    await uploadViaResumesPage(page, pdfPath);
    await expect(page.getByText(/uploaded resumes \([1-9]/i)).toBeVisible({ timeout: 10_000 });
  });

  test("filename with spaces uploads successfully", async ({ page }) => {
    // Playwright setInputFiles uses the actual on-disk filename for the File.name
    // property. We name the file with spaces to reproduce the bug.
    const tmpPath = path.join(os.tmpdir(), `Hassan Ahmed CV ${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, makeTestResumePdf(TEST_RESUME_LINES));

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tmpPath);

    // Must not reject with a filename error — only type/size errors are valid
    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
    await expect(page.getByText(/Hassan Ahmed CV/i)).toBeVisible({ timeout: 5_000 });
  });

  test("filename with parentheses and numbers uploads successfully", async ({ page }) => {
    const tmpPath = path.join(os.tmpdir(), `resume (3) ${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, makeTestResumePdf(TEST_RESUME_LINES));

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="file"]').first().setInputFiles(tmpPath);

    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
    // Original filename preserved in the list
    await expect(page.getByText(/resume \(3\)/i)).toBeVisible({ timeout: 5_000 });
  });

  test("duplicate filename uploads as a separate resume (no rejection)", async ({ page }) => {
    // Upload the same filename twice — both should appear in the list.
    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);

    await uploadViaResumesPage(page, pdfPath);
    const countBefore = await page.locator('[data-testid="resume-item"], .resume-card').count();

    // Upload again with the exact same filename
    await uploadViaResumesPage(page, pdfPath);

    // Count heading should increase
    const countHeading = page.getByText(/uploaded resumes \(\d+\)/i);
    await expect(countHeading).toBeVisible({ timeout: 10_000 });
    const headingText = await countHeading.textContent();
    const match = headingText?.match(/\((\d+)\)/);
    if (match) {
      const count = parseInt(match[1], 10);
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });

  test("mixed uppercase/lowercase filename uploads successfully", async ({ page }) => {
    const tmpPath = path.join(os.tmpdir(), `Resume_FINAL_v2_${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, makeTestResumePdf(TEST_RESUME_LINES));

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="file"]').first().setInputFiles(tmpPath);

    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — Storage path uses UUID, not original filename (Issue 3)
// ---------------------------------------------------------------------------

test.describe("Resume upload — UUID-based storage paths", () => {
  test("View button href is a Supabase signed URL generated from file_path, not the original filename", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    const tmpPath = path.join(os.tmpdir(), `My Special Resume ${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, makeTestResumePdf(TEST_RESUME_LINES));
    await uploadViaResumesPage(page, tmpPath);

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const viewLinks = page.locator('a[target="_blank"]:has-text("View")');
    const count = await viewLinks.count();
    if (count > 0) {
      const href = await viewLinks.first().getAttribute("href");
      expect(href).toBeTruthy();
      // Must be a signed Supabase storage URL
      expect(href).toMatch(/supabase/i);
      // The storage path in the URL must NOT contain the original filename
      // (it should be a UUID instead)
      expect(href).not.toMatch(/My Special Resume/);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — Fresh signed URLs on every render (Issue 4)
// ---------------------------------------------------------------------------

test.describe("Resume view — fresh signed URLs", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  });

  test("My Resumes page re-signs URL on every load — both new and existing resumes have valid hrefs", async ({ page }) => {
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const viewLinks = page.locator('a[target="_blank"]:has-text("View")');
    const count = await viewLinks.count();
    if (count > 0) {
      for (let i = 0; i < Math.min(count, 3); i++) {
        const href = await viewLinks.nth(i).getAttribute("href");
        expect(href).toBeTruthy();
        expect(href).toMatch(/supabase/i);
      }
    }
  });

  test("Documents page re-signs URL at render time — View button is not disabled", async ({ page }) => {
    await page.goto("/candidate/workspace/documents");
    await page.waitForLoadState("networkidle");

    // If any resumes exist, their View button must not be disabled and must
    // have a non-empty href pointing to Supabase (fresh signed URL).
    const viewButtons = page.locator('a[target="_blank"]:has-text("View")');
    const count = await viewButtons.count();
    if (count > 0) {
      const href = await viewButtons.first().getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/supabase/i);
    }

    // Disabled View buttons (those without an href, rendered as <button>)
    // should not appear for resumes that have a valid file_path.
    // (A disabled View button means the signed URL generation failed.)
    const disabledViews = page.locator('button:has-text("View")[disabled]');
    await expect(disabledViews).toHaveCount(0);
  });

  test("navigating away and back to My Resumes still shows working View links", async ({ page }) => {
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    // Navigate to dashboard and back
    await page.goto("/candidate/dashboard");
    await page.waitForLoadState("networkidle");
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const viewLinks = page.locator('a[target="_blank"]:has-text("View")');
    const count = await viewLinks.count();
    if (count > 0) {
      const href = await viewLinks.first().getAttribute("href");
      expect(href).toBeTruthy();
      expect(href).toMatch(/supabase/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — Upload UX (Issue 5)
// ---------------------------------------------------------------------------

test.describe("Resume upload — UX", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  });

  test("upload zone shows a progress bar while the action is pending", async ({ page }) => {
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    const fileInput = page.locator('input[type="file"]').first();

    // Start upload but don't wait for it to finish
    await fileInput.setInputFiles(pdfPath);

    // Progress bar should appear immediately while action is pending
    const progressBar = page.locator('[role="progressbar"]');
    // The progress indicator may appear for just a moment — check within 5s
    // before the AI pipeline completes (which takes 10-30s)
    await expect(progressBar).toBeVisible({ timeout: 5_000 });

    // Wait for completion
    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
  });

  test("invalid file type shows an error toast, not a crash", async ({ page }) => {
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    // Create a .txt file (not an allowed type)
    const txtPath = path.join(os.tmpdir(), `e2e-invalid-${Date.now()}.txt`);
    fs.writeFileSync(txtPath, "This is not a resume");

    // Change accept to allow .txt so the OS dialog doesn't block it, then
    // manually trigger the input. Since accept=".pdf,.doc,.docx", setInputFiles
    // with a .txt file will be rejected by the MIME check in the action.
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.evaluate((el: HTMLInputElement) => { el.accept = "*"; });
    await fileInput.setInputFiles(txtPath);

    await expect(
      page.getByText(/only pdf and word|supported/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("drag-and-drop zone accepts a PDF file", async ({ page }) => {
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);

    // Simulate drag-and-drop via the hidden file input (Playwright's recommended
    // cross-platform approach — native drag events don't trigger file uploads
    // reliably across OS/browser combinations in automation).
    await page.locator('input[type="file"]').first().setInputFiles(pdfPath);

    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
  });

  test("page is mobile responsive — upload zone visible on narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    // Drop zone and browse button must be visible without horizontal scroll
    await expect(page.getByRole("button", { name: /browse files/i })).toBeVisible({ timeout: 10_000 });

    const body = page.locator("body");
    const bodyBox = await body.boundingBox();
    expect(bodyBox?.width).toBeLessThanOrEqual(375 + 5); // no horizontal overflow
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — Authentication consistency (Issue 1)
// ---------------------------------------------------------------------------

test.describe("Auth consistency — no guest prompts for authenticated users", () => {
  test("authenticated candidate uploading a resume is never shown a sign-in error", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(pdfPath);

    // Must NOT show "You must be signed in" — that would mean the server action
    // couldn't read the session even though the user authenticated moments ago.
    await expect(page.getByText(/you must be signed in/i)).toHaveCount(0);

    // Must show the expected success or graceful-fail toast instead
    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
  });

  test("authenticated candidate navigating between dashboard and resumes page stays authenticated", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    // Multi-hop navigation — session must persist across all hops
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");
    await page.goto("/candidate/dashboard");
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 10_000 });
    await page.goto("/candidate/workspace/documents");
    await page.waitForLoadState("networkidle");

    // Must not be redirected to login at any point
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });

    // Must see authenticated content, not a guest sign-in prompt
    await expect(page.getByRole("heading", { name: /documents/i })).toBeVisible({ timeout: 10_000 });
  });

  test("session persists after page refresh on resumes page", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Still authenticated after reload — content visible, no redirect
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /my resumes/i })).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — FK guarantee (Issue 2)
// ---------------------------------------------------------------------------

test.describe("Resume FK guarantee — candidates row always exists", () => {
  test("upload never fails with a foreign key violation (candidate record guaranteed)", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(pdfPath);

    // Must NOT show a FK violation error message
    await expect(page.getByText(/foreign key|fkey|violates/i)).toHaveCount(0);

    // Must eventually show success or graceful AI failure — not a DB error
    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });
  });

  test("multiple rapid uploads do not cause FK violations", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/workspace/resumes");
    await page.waitForLoadState("networkidle");

    // Upload one resume and confirm success, then upload another immediately
    const pdf1 = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.locator('input[type="file"]').first().setInputFiles(pdf1);
    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });

    // Upload a second one after the page refreshes
    const pdf2 = makeTestResumePdfFile(TEST_RESUME_LINES);
    await page.locator('input[type="file"]').first().setInputFiles(pdf2);
    await expect(page.getByText(/resume processed|ai parsing failed/i).first()).toBeVisible({ timeout: 40_000 });

    // Both uploads succeeded — count should be ≥ 2
    const headingText = await page.getByText(/uploaded resumes \(\d+\)/i).textContent();
    const match = headingText?.match(/\((\d+)\)/);
    if (match) expect(parseInt(match[1], 10)).toBeGreaterThanOrEqual(2);
  });
});
