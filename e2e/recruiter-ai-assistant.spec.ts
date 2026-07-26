import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS, TEST_JOB_SLUG } from "./global-setup";

/**
 * OPENAI_API_KEY isn't configured in this environment, so both AI drafters
 * exercise their documented fallback content rather than a real generation
 * -- same accepted limitation as e2e/ai-workflow.spec.ts and
 * e2e/interview-assistant.spec.ts. These tests assert the draft/regenerate
 * *mechanics* work, not the quality of AI-generated content.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe("Recruiter AI Assistant", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
  });

  test("recruiter can draft a job posting with AI", async ({ page }) => {
    await page.goto("/recruiter/jobs/new");
    await page.getByLabel("Job title").fill("E2E AI Draft — Platform Engineer");
    await page.getByRole("button", { name: "Draft with AI" }).click();

    await expect(async () => {
      const value = await page.getByLabel("Job description").inputValue();
      expect(value.length).toBeGreaterThan(0);
    }).toPass({ timeout: 15_000 });
  });

  test("recruiter can draft a candidate message", async ({ page }) => {
    const admin = adminClient();
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();
    const { data: candidateProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.candidate.email)
      .single();

    let { data: resume } = await admin
      .from("resumes")
      .select("id")
      .eq("candidate_id", candidateProfile!.id)
      .limit(1)
      .maybeSingle();
    if (!resume) {
      const inserted = await admin
        .from("resumes")
        .insert({
          candidate_id: candidateProfile!.id,
          file_name: "ai-assistant-fixture.pdf",
          file_url: "https://example.test/x.pdf",
          file_path: `${candidateProfile!.id}/ai-assistant-fixture.pdf`,
          parse_status: "completed",
        })
        .select("id")
        .single();
      resume = inserted.data;
    }

    const { data: application } = await admin
      .from("applications")
      .upsert(
        { job_id: job!.id, candidate_id: candidateProfile!.id, resume_id: resume!.id, status: "submitted" },
        { onConflict: "job_id,candidate_id" }
      )
      .select("id")
      .single();

    await page.goto(`/recruiter/applications/${application!.id}`);
    await page.getByRole("button", { name: "Draft message" }).click();

    // Rejection needs no interview to exist, unlike interview_invite. Scoped
    // to the dialog -- the page's own StatusSelect is also a combobox.
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Rejection" }).click();
    await dialog.getByRole("button", { name: "Generate draft" }).click();

    await expect(dialog.getByText("Subject:")).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("button", { name: "Copy" })).toBeVisible();
  });
});
