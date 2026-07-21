import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS, TEST_JOB_SLUG } from "./global-setup";

test.describe("Recruiter workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
  });

  test("dashboard renders with no ambiguous-column or console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await expect(page.getByRole("heading", { name: "HR Dashboard" })).toBeVisible();
    await expect(page.getByText("Open jobs")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("can view the jobs list", async ({ page }) => {
    await page.getByRole("link", { name: "Jobs" }).click();
    await expect(page).toHaveURL(/\/recruiter\/jobs$/);
  });

  test("can open the new-job form and see required fields", async ({ page }) => {
    await page.goto("/recruiter/jobs/new");
    await expect(page.getByLabel("Job title")).toBeVisible();
    await expect(page.getByLabel("Job description")).toBeVisible();
  });

  test("a recruiter only ever sees their own company's jobs, never another company's", async ({ page }) => {
    await page.goto("/recruiter/jobs");
    // e2e-other-company's jobs must never appear on this recruiter's list.
    await expect(page.getByText(TEST_USERS.recruiterOther.companyName)).not.toBeVisible();
  });

  test("a recruiter can see applicants for their job (regression test for the getApplicationsForJob broken-embed bug)", async ({ page }) => {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();

    let { data: resume } = await admin.from("resumes").select("id").eq("candidate_id", candidateProfile!.id).limit(1).maybeSingle();
    if (!resume) {
      const inserted = await admin
        .from("resumes")
        .insert({
          candidate_id: candidateProfile!.id,
          file_name: "regression-fixture.pdf",
          file_url: "https://example.test/x.pdf",
          file_path: `${candidateProfile!.id}/regression-fixture.pdf`,
          parse_status: "completed",
        })
        .select("id")
        .single();
      resume = inserted.data;
    }

    await admin.from("applications").upsert(
      { job_id: job!.id, candidate_id: candidateProfile!.id, resume_id: resume!.id, status: "submitted" },
      { onConflict: "job_id,candidate_id" }
    );

    await page.goto(`/recruiter/jobs/${job!.id}/candidates`);
    await expect(page.getByText(TEST_USERS.candidate.fullName)).toBeVisible();
  });
});
