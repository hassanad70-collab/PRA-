import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { STORAGE_STATE } from "./helpers/auth";
import { TEST_JOB_SLUG, TEST_USERS } from "./global-setup";

/**
 * Coverage for Recruiter Intelligence v2.0 (Phases 1-8), which shipped
 * without per-phase e2e tests under the milestone's agreed one-review-at-
 * the-end workflow. OPENAI_API_KEY isn't configured in this environment, so
 * every AI-backed panel below exercises its documented deterministic
 * fallback path rather than a real generation -- same accepted limitation
 * as e2e/interview-assistant.spec.ts and e2e/ai-workflow.spec.ts. These
 * tests assert the UI/data-flow mechanics work, not AI output quality.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureResume(admin: ReturnType<typeof adminClient>, candidateId: string, fileName: string) {
  let { data: resume } = await admin.from("resumes").select("id").eq("candidate_id", candidateId).limit(1).maybeSingle();
  if (!resume) {
    // generateCandidateInsight (Phase 2) requires resume.parsed_data to be
    // non-null, so this fixture needs at least a minimal parsed shape, not
    // just a "completed" parse_status.
    const inserted = await admin
      .from("resumes")
      .insert({
        candidate_id: candidateId,
        file_name: fileName,
        file_url: "https://example.test/x.pdf",
        file_path: `${candidateId}/${fileName}`,
        parse_status: "completed",
        parsed_data: {
          full_name: "E2E Fixture Candidate",
          years_of_experience: 4,
          summary: "Fixture resume for the Recruiter Intelligence v2.0 e2e suite.",
          experience: [{ company_name: "Fixture Co", job_title: "Software Engineer", is_current: true }],
          education: [],
          skills: ["TypeScript", "Testing"],
        },
      })
      .select("id")
      .single();
    resume = inserted.data;
  }
  return resume!.id as string;
}

test.describe.serial("Recruiter Intelligence v2.0", () => {
  test.use({ storageState: STORAGE_STATE.recruiter });

  let jobId: string;
  let applicationId: string;
  let applicationOtherId: string;
  let interviewId: string;

  test.beforeAll(async () => {
    const admin = adminClient();
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();
    jobId = job!.id;

    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    const { data: candidateOtherProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidateOther.email).single();

    const resumeId = await ensureResume(admin, candidateProfile!.id, "v2-fixture.pdf");
    const resumeOtherId = await ensureResume(admin, candidateOtherProfile!.id, "v2-fixture-other.pdf");

    const { data: app } = await admin
      .from("applications")
      .upsert({ job_id: jobId, candidate_id: candidateProfile!.id, resume_id: resumeId, status: "submitted" }, { onConflict: "job_id,candidate_id" })
      .select("id")
      .single();
    applicationId = app!.id;

    const { data: appOther } = await admin
      .from("applications")
      .upsert(
        { job_id: jobId, candidate_id: candidateOtherProfile!.id, resume_id: resumeOtherId, status: "submitted" },
        { onConflict: "job_id,candidate_id" }
      )
      .select("id")
      .single();
    applicationOtherId = appOther!.id;

    // Seed screening_results so the AI-score column, Shortlist tab, and
    // Comparison table all have real ranked data to render instead of
    // "no score yet" empty states.
    await admin.from("screening_results").upsert(
      {
        application_id: applicationId,
        overall_score: 82,
        ai_summary: "Strong candidate for this role.",
        interview_recommendation: "yes",
        rank_position: 1,
        // Reset insight fields so Phase 2 always starts with the "Generate" button, not "Regenerate".
        insight_generated_at: null,
        hiring_confidence_score: null,
        risks: null,
        red_flags: null,
        suggested_interview_focus: null,
        suggested_questions: null,
      },
      { onConflict: "application_id" }
    );
    await admin.from("screening_results").upsert(
      {
        application_id: applicationOtherId,
        overall_score: 65,
        ai_summary: "Adequate fit, some gaps.",
        interview_recommendation: "neutral",
        rank_position: 2,
      },
      { onConflict: "application_id" }
    );

    // Clean slate for interviews on the primary fixture application.
    await admin.from("interviews").delete().eq("application_id", applicationId);
    const { data: interview, error: interviewError } = await admin
      .from("interviews")
      .insert({
        application_id: applicationId,
        scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 30,
        interview_type: "video",
        status: "scheduled",
      })
      .select("id")
      .single();
    if (interviewError || !interview) throw new Error(`Failed to seed fixture interview: ${interviewError?.message}`);
    interviewId = interview.id;
  });

  test.afterAll(async () => {
    const admin = adminClient();
    await admin.from("interviews").delete().eq("id", interviewId);
    // recruiter-workflow.spec.ts shares this same fixture job and assumes a
    // single applicant on it, so the second application seeded above for
    // Phase 3/7 comparison/bulk-action coverage must not leak past this file.
    await admin.from("screening_results").delete().eq("application_id", applicationOtherId);
    await admin.from("applications").delete().eq("id", applicationOtherId);
  });

  test("Phase 1: Executive Dashboard shows the extended hiring KPIs", async ({ page }) => {
    await page.goto("/en/recruiter/dashboard");
    await expect(page.getByRole("heading", { name: "Hiring Command Center" })).toBeVisible();
    await expect(page.getByText("Offers pending")).toBeVisible();
    await expect(page.getByText("Hires this month")).toBeVisible();
    await expect(page.getByText("Time to hire")).toBeVisible();
    await expect(page.getByText("Hiring velocity")).toBeVisible();
    await expect(page.getByText("Offer acceptance rate")).toBeVisible();
    await expect(page.getByText("Upcoming interviews")).toBeVisible();
    await expect(page.getByText("Recently hired")).toBeVisible();
  });

  test("Phase 2: recruiter can generate an AI candidate insight (deterministic fallback)", async ({ page }) => {
    await page.goto(`/recruiter/applications/${applicationId}`);
    await expect(page.getByRole("heading", { name: "AI Candidate Insight" })).toBeVisible();
    await page.getByRole("button", { name: "Generate AI insight" }).click();

    await expect(page.getByText("Hiring confidence")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("No notable risks identified.")).toBeVisible();
    await expect(page.getByText("No red flags identified.")).toBeVisible();
  });

  test("Phase 3: recruiter can compare two candidates side by side", async ({ page }) => {
    await page.goto(`/recruiter/jobs/${jobId}/compare?ids=${applicationId},${applicationOtherId}`);
    await expect(page.getByRole("heading", { name: "Candidate Comparison" })).toBeVisible();
    await expect(page.getByText(TEST_USERS.candidate.fullName)).toBeVisible();
    await expect(page.getByText(TEST_USERS.candidateOther.fullName)).toBeVisible();
    await expect(page.getByText("Overall Recommendation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export to PDF" })).toBeVisible();
  });

  test("Phase 4: Shortlist tab ranks candidates and exposes approve/reject actions", async ({ page }) => {
    await page.goto(`/recruiter/jobs/${jobId}/candidates`);
    await expect(page.getByText(TEST_USERS.candidate.fullName)).toBeVisible();
    await expect(page.getByText(/Suggested next action/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Approve" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Move to interview" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject" }).first()).toBeVisible();
  });

  test("Phase 5: Recruiter Copilot answers an example query (deterministic fallback when AI is disabled)", async ({ page }) => {
    await page.goto("/en/recruiter/dashboard");
    await page.getByRole("button", { name: "Copilot" }).click();
    await expect(page.getByRole("heading", { name: "Recruiter Copilot" })).toBeVisible();
    await page.getByText("Who should I interview first?").click();

    await expect(page.getByText("Enable the OpenAI API key to use the Recruiter Copilot.")).toBeVisible({ timeout: 15_000 });
  });

  test("Phase 6: Hiring Analytics page renders trend charts and CSV export buttons", async ({ page }) => {
    await page.goto("/recruiter/analytics");
    await expect(page.getByRole("heading", { name: "Hiring Analytics" })).toBeVisible();
    await expect(page.getByText("Interview conversion rate")).toBeVisible();
    await expect(page.getByText("Time to hire trend")).toBeVisible();
    await expect(page.getByText("Source of hire")).toBeVisible();
    await expect(page.getByText("Recruitment funnel drop-off")).toBeVisible();
    await expect(page.getByText("Recruiter productivity")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" }).first()).toBeVisible();
  });

  test("Phase 7: recruiter can select multiple applicants and bulk-move their status", async ({ page }) => {
    const admin = adminClient();
    // Both fixture applications must be in the same status for a clean,
    // predictable bulk-move assertion.
    await admin.from("applications").update({ status: "submitted" }).in("id", [applicationId, applicationOtherId]);

    await page.goto(`/recruiter/jobs/${jobId}/candidates`);
    await page.getByRole("tab", { name: /Applicants/ }).click();

    const checkboxes = page.getByRole("checkbox");
    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();

    await expect(page.getByTestId("bulk-actions-toolbar")).toBeVisible();
    await page.getByTestId("bulk-actions-toolbar").getByRole("combobox").filter({ hasText: "Move to…" }).click();
    await page.getByRole("option", { name: "Screening" }).click();

    await expect(page.getByText(/Applied to \d+ application/)).toBeVisible({ timeout: 10_000 });

    const { data: rows } = await admin.from("applications").select("status").in("id", [applicationId, applicationOtherId]);
    expect(rows?.every((r) => r.status === "screening")).toBe(true);

    // Restore so later tests (Phase 3/4 above already ran; this only guards
    // any spec that re-runs after this one in the same suite invocation).
    await admin.from("applications").update({ status: "submitted" }).in("id", [applicationId, applicationOtherId]);
  });

  test("Phase 8: Interview Intelligence renders the scorecard, AI summary button, and hiring decision timeline", async ({ page }) => {
    const admin = adminClient();
    await admin
      .from("interviews")
      .update({
        status: "completed",
        feedback: "Solid communicator, clear technical reasoning.",
        star_evaluation: { situation: "Debugging a live incident", task: "Find the root cause", action: "Checked logs and recent deploys", result: "Fixed within the hour" },
        competency_ratings: { Communication: 4, "Technical Skills": 5 },
        hiring_recommendation: "yes",
      })
      .eq("id", interviewId);

    try {
      await page.goto(`/recruiter/applications/${applicationId}`);
      await expect(page.getByText("Scorecard")).toBeVisible();
      // "Communication" also labels a dimension in the AI Screening Summary
      // section further down the page, so scope to the first match.
      await expect(page.getByText("Communication").first()).toBeVisible();
      await expect(page.getByText("Solid communicator, clear technical reasoning.")).toBeVisible();
      await expect(page.getByText("Hiring decision timeline")).toBeVisible();
      await expect(page.getByText("Application submitted")).toBeVisible();

      await page.getByRole("button", { name: "Generate AI summary" }).click();
      await expect(page.getByRole("button", { name: "Regenerate" })).toBeVisible({ timeout: 15_000 });
    } finally {
      await admin
        .from("interviews")
        .update({ status: "scheduled", feedback: null, star_evaluation: null, competency_ratings: null, hiring_recommendation: null, ai_summary: null })
        .eq("id", interviewId);
    }
  });
});
