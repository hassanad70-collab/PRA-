import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_OTHER_COMPANY_JOB_SLUG, TEST_USERS } from "./global-setup";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * UI-level coverage for the opt-in AI candidate-discovery feature, on top of
 * the direct-DB RLS coverage in rls.spec.ts. These tests confirm the same
 * rule holds through the actual pages a recruiter uses -- a direct URL visit
 * to a non-opted-in candidate's profile, and the "AI Recommended" tab -- not
 * just at the query layer.
 */
test.describe("AI candidate discovery (opt-in matching)", () => {
  test("a recruiter cannot open a non-opted-in candidate's profile via direct URL", async ({ page }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.candidateOther.email)
      .single();
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_OTHER_COMPANY_JOB_SLUG).single();

    // Make sure this candidate is neither opted in nor AI-matched to this company.
    await admin.from("candidates").update({ is_open_to_work: false }).eq("id", candidateProfile!.id);
    await admin.from("job_matches").delete().eq("job_id", job!.id).eq("candidate_id", candidateProfile!.id);

    await login(page, TEST_USERS.recruiterOther.email, TEST_USERS.recruiterOther.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });

    // Next.js's App Router doesn't reliably surface a 404 HTTP status for a
    // nested dynamic route's notFound() boundary under this project's custom
    // middleware, so the meaningful assertion is the rendered content: RLS
    // blocked the row, the page called notFound(), and no candidate data
    // (name, position, resumes, etc.) is exposed anywhere on the page.
    await page.goto(`/recruiter/candidates/${candidateProfile!.id}`);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("once opted in and AI-matched, a recruiter sees the candidate in AI Recommended with a match explanation, and can open their profile", async ({
    page,
  }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("email", TEST_USERS.candidateOther.email)
      .single();
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_OTHER_COMPANY_JOB_SLUG).single();

    // job_matches.resume_id is NOT NULL, so a real resume row is required.
    let { data: resume } = await admin.from("resumes").select("id").eq("candidate_id", candidateProfile!.id).limit(1).maybeSingle();
    if (!resume) {
      const inserted = await admin
        .from("resumes")
        .insert({
          candidate_id: candidateProfile!.id,
          file_name: "discovery-test.pdf",
          file_url: "https://example.test/x.pdf",
          file_path: `${candidateProfile!.id}/discovery-test.pdf`,
          parse_status: "completed",
        })
        .select("id")
        .single();
      resume = inserted.data;
    }

    await admin.from("candidates").update({ is_open_to_work: true }).eq("id", candidateProfile!.id);
    const matchUpsert = await admin.from("job_matches").upsert(
      {
        job_id: job!.id,
        candidate_id: candidateProfile!.id,
        resume_id: resume!.id,
        match_score: 87,
        ai_summary: "Strong alignment on core technical skills and seniority.",
        strengths: ["TypeScript", "System design"],
        missing_skills: ["Kubernetes"],
      },
      { onConflict: "job_id,candidate_id" }
    );
    if (matchUpsert.error) throw new Error(`Failed to seed job_matches: ${matchUpsert.error.message}`);

    try {
      await login(page, TEST_USERS.recruiterOther.email, TEST_USERS.recruiterOther.password);
      await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });

      await page.goto(`/recruiter/jobs/${job!.id}/candidates`);
      await page.getByRole("tab", { name: /AI Recommended/i }).click();

      await expect(page.getByText(candidateProfile!.full_name)).toBeVisible();
      await expect(page.getByText("87% match")).toBeVisible();
      await expect(page.getByText("Strong alignment on core technical skills and seniority.")).toBeVisible();
      await expect(page.getByText("Top matching skills")).toBeVisible();
      await expect(page.getByText("Kubernetes")).toBeVisible();

      await page.getByText(candidateProfile!.full_name).click();
      await expect(page).toHaveURL(new RegExp(`/recruiter/candidates/${candidateProfile!.id}$`));
      await expect(page.getByRole("heading", { name: candidateProfile!.full_name })).toBeVisible();

      // Turning the opt-in off removes them from the tab immediately.
      await admin.from("candidates").update({ is_open_to_work: false }).eq("id", candidateProfile!.id);
      await page.goto(`/recruiter/jobs/${job!.id}/candidates`);
      await page.getByRole("tab", { name: /AI Recommended/i }).click();
      await expect(page.getByText(candidateProfile!.full_name)).not.toBeVisible();
    } finally {
      await admin.from("candidates").update({ is_open_to_work: false }).eq("id", candidateProfile!.id);
      await admin.from("job_matches").delete().eq("job_id", job!.id).eq("candidate_id", candidateProfile!.id);
    }
  });
});
