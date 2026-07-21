import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS, TEST_JOB_SLUG } from "./global-setup";

test.describe("Job application", () => {
  test.beforeAll(async () => {
    // Ensure the test candidate has at least one resume to apply with,
    // independent of whether resume-upload.spec.ts has run yet.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    const { data: existing } = await admin.from("resumes").select("id").eq("candidate_id", profile!.id).limit(1).maybeSingle();
    if (!existing) {
      await admin.from("resumes").insert({
        candidate_id: profile!.id,
        file_name: "e2e-fixture.pdf",
        file_url: "https://example.test/fixture.pdf",
        file_path: `${profile!.id}/e2e-fixture.pdf`,
        parse_status: "completed",
        is_primary: true,
      });
      await admin.from("candidates").update({ primary_resume_id: null }).eq("id", profile!.id);
    }
  });

  test("candidate can apply to a published job end-to-end through the UI", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    // Withdraw any prior test application so this test is repeatable.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();
    await admin.from("applications").delete().eq("job_id", job!.id).eq("candidate_id", profile!.id);

    await page.goto(`/candidate/jobs/${job!.id}`);
    await page.getByRole("button", { name: "Apply now" }).click();
    await page.getByRole("button", { name: "Submit application" }).click();

    await expect(page.getByText(/application submitted/i)).toBeVisible({ timeout: 15_000 });

    await page.goto("/candidate/applications");
    await expect(page.getByText("E2E Test — Software Engineer")).toBeVisible();
  });

  test("a candidate cannot apply to the same job twice", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: job } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).single();

    await page.goto(`/candidate/jobs/${job!.id}`);
    // Having applied in the previous test, the page should now show the
    // application status badge instead of an Apply button.
    await expect(page.getByText(/applied —/i)).toBeVisible({ timeout: 10_000 });
  });
});
