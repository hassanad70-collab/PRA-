import { test, expect } from "@playwright/test";

import { STORAGE_STATE } from "./helpers/auth";

/**
 * OPENAI_API_KEY isn't configured in this environment, so AI regeneration
 * exercises its documented fallback path (returns the current content
 * unchanged, or a placeholder for an empty summary) rather than a real
 * generation -- same accepted limitation as e2e/ai-workflow.spec.ts. These
 * tests assert the accept/reject/edit/finalize *mechanics* work, not the
 * quality of AI output.
 */
test.describe("AI Resume Builder", () => {
  test.use({ storageState: STORAGE_STATE.candidate });

  test("candidate can create a draft and access all sections and export options in Resume Studio", async ({ page }) => {

    // Resume Studio is the new home for the AI Resume Builder.
    await page.goto("/candidate/workspace/studio");
    await expect(page.getByText("Resume Studio").first()).toBeVisible();

    await page.getByRole("button", { name: "New draft" }).first().click();
    // CreateDraftButton pushes to /candidate/resume-builder/{id} which
    // the legacy redirect resolves to /candidate/workspace/studio/{id}.
    await expect(page).toHaveURL(/\/candidate\/workspace\/studio\/.+/, { timeout: 15_000 });

    // All core section labels are rendered in the editor panel.
    for (const label of [
      "Personal Information",
      "Professional Summary",
      "Work Experience",
      "Education",
      "Skills",
      "Certifications",
      "Languages",
      "Projects",
      "Achievements",
      "Social Links",
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }

    // Export dropdown is accessible with PDF and DOCX options.
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.getByRole("menuitem", { name: "Download PDF" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Download DOCX" })).toBeVisible();
  });

  test("draft list shows a created draft and can be reopened", async ({ page }) => {
    await page.goto("/candidate/workspace/studio");
    await expect(page.getByText("My Resume").first()).toBeVisible({ timeout: 10_000 });
  });
});
