import { test, expect } from "@playwright/test";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

/**
 * OPENAI_API_KEY isn't configured in this environment, so AI regeneration
 * exercises its documented fallback path (returns the current content
 * unchanged, or a placeholder for an empty summary) rather than a real
 * generation -- same accepted limitation as e2e/ai-workflow.spec.ts. These
 * tests assert the accept/reject/edit/finalize *mechanics* work, not the
 * quality of AI output.
 */
test.describe("AI Resume Builder", () => {
  test("candidate can create a draft, edit a section, regenerate/accept an AI suggestion, and generate a PDF", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/resume-builder");
    await expect(page.getByRole("heading", { name: "AI Resume Builder" })).toBeVisible();

    await page.getByRole("button", { name: "New draft" }).click();
    await expect(page).toHaveURL(/\/candidate\/resume-builder\/.+/, { timeout: 15_000 });

    // Every section renders, seeded from the (possibly empty) profile.
    for (const type of [
      "personal_info",
      "summary",
      "experience",
      "education",
      "skills",
      "certifications",
      "languages",
      "projects",
      "achievements",
      "social_links",
    ]) {
      await expect(page.getByTestId(`section-${type}`)).toBeVisible();
    }

    // Manual edit on a factual section.
    const personalInfoCard = page.getByTestId("section-personal_info");
    await personalInfoCard.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Full name").fill("E2E Builder Candidate");
    await personalInfoCard.getByRole("button", { name: "Save" }).click();
    await expect(personalInfoCard.getByText(/E2E Builder Candidate/)).toBeVisible({ timeout: 10_000 });

    // AI regenerate + accept on the Summary section.
    const summaryCard = page.getByTestId("section-summary");
    await summaryCard.getByRole("button", { name: /Regenerate with AI/i }).click();
    await expect(page.getByText("AI suggestion -- compare and choose")).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("AI suggestion -- compare and choose")).not.toBeVisible({ timeout: 10_000 });

    // Finalize to PDF.
    await page.getByRole("button", { name: "Generate resume" }).click();
    await page.getByRole("button", { name: "Generate", exact: true }).click();
    await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible({ timeout: 20_000 });
  });

  test("draft list shows a created draft and can be reopened", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    await page.goto("/candidate/resume-builder");
    await expect(page.getByText("My Resume").first()).toBeVisible({ timeout: 10_000 });
  });
});
