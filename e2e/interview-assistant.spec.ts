import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login, STORAGE_STATE } from "./helpers/auth";
import { TEST_USERS, TEST_JOB_SLUG } from "./global-setup";

/**
 * OPENAI_API_KEY isn't configured in this environment, so question
 * generation exercises the documented fallback set rather than a real
 * generation -- same accepted limitation as e2e/ai-workflow.spec.ts and
 * e2e/resume-builder.spec.ts. These tests assert the scheduling/feedback
 * *mechanics* work, not the quality of AI-generated content.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe.serial("AI Interview Assistant", () => {
  test.use({ storageState: STORAGE_STATE.recruiter });

  let jobId: string;
  let applicationId: string;

  test.beforeAll(async () => {
    const admin = adminClient();
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();
    jobId = job!.id;

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
          file_name: "interview-fixture.pdf",
          file_url: "https://example.test/x.pdf",
          file_path: `${candidateProfile!.id}/interview-fixture.pdf`,
          parse_status: "completed",
        })
        .select("id")
        .single();
      resume = inserted.data;
    }

    const { data: application } = await admin
      .from("applications")
      .upsert(
        { job_id: jobId, candidate_id: candidateProfile!.id, resume_id: resume!.id, status: "submitted" },
        { onConflict: "job_id,candidate_id" }
      )
      .select("id")
      .single();
    applicationId = application!.id;

    // Clean slate -- this fixture application may carry interviews left
    // over from a previous local run.
    await admin.from("interviews").delete().eq("application_id", applicationId);
  });

  test("recruiter can generate an AI interview question bank for a job", async ({ page }) => {
    await page.goto(`/recruiter/jobs/${jobId}`);
    await page.getByRole("tab", { name: "Interview Questions" }).click();
    await page.getByRole("button", { name: /Generate with AI|Regenerate with AI/ }).click();

    await expect(page.getByText("No interview questions yet.")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Technical", { exact: true })).toBeVisible();
  });

  test("recruiter can schedule an interview and the candidate sees it on their applications page", async ({ page }) => {
    await page.goto(`/recruiter/applications/${applicationId}`);
    await page.getByRole("button", { name: "Schedule interview" }).click();

    const scheduledAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const localValue = scheduledAt.toISOString().slice(0, 16);
    await page.getByLabel("Date and time").fill(localValue);
    await page.getByLabel("Location or link").fill("https://meet.example.test/e2e-interview");
    await page.getByRole("button", { name: "Schedule", exact: true }).click();

    await expect(page.getByText("Scheduled", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("https://meet.example.test/e2e-interview")).toBeVisible();

    // Clear cookies locally (no server-side signOut) to avoid revoking the shared recruiter session.
    await page.context().clearCookies();
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/applications");
    await expect(page.getByText("https://meet.example.test/e2e-interview")).toBeVisible();
  });

  test("recruiter can submit interview feedback, marking it completed", async ({ page }) => {
    await page.goto(`/recruiter/applications/${applicationId}`);
    await page.getByRole("button", { name: "Give feedback" }).click();
    await page.getByRole("button", { name: "Save feedback" }).click();

    await expect(page.getByText("Completed", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Recommendation:/)).toBeVisible();
  });
});
