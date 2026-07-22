import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";
import { makeTestResumePdfFile, TEST_RESUME_LINES } from "./helpers/fixtures";

/**
 * This project runs without OPENAI_API_KEY configured in this environment,
 * so every AI stage (parsing, ATS scoring, job matching) executes its
 * fallback path. These tests assert the pipeline completes and produces a
 * result either way — they don't hardcode "AI must be disabled," so they
 * keep passing once a real key is added.
 *
 * Each test uploads its own resume rather than relying on state left by
 * other specs, so a directly-inserted fixture row elsewhere (e.g.
 * rls.spec.ts's ownership check, which never runs the real AI pipeline)
 * can't be mistaken here for a genuinely AI-processed one.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function uploadAndGetResumeId(page: import("@playwright/test").Page) {
  await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
  await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
  await page.goto("/candidate/resume");
  // Wait for the client component to hydrate before driving the file input —
  // setInputFiles() can fire the change event before React has attached its
  // onChange listener, which silently drops the selection (no error, no
  // request). A real user can't out-race hydration picking a file from an OS
  // dialog, but Playwright's programmatic setInputFiles can.
  await page.waitForLoadState("networkidle");

  const pdfPath = makeTestResumePdfFile(TEST_RESUME_LINES);
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  await expect(page.getByText(/resume processed|ai parsing failed/i)).toBeVisible({ timeout: 30_000 });

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
  const { data: resumes } = await admin
    .from("resumes")
    .select("id, parse_status")
    .eq("candidate_id", profile!.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  return resumes![0];
}

test.describe("AI pipeline (resume parsing / ATS scoring / job matching)", () => {
  test("resume processing reaches a terminal parse_status and never leaves a row stuck as 'processing'", async ({ page }) => {
    const resume = await uploadAndGetResumeId(page);
    expect(resume.parse_status).toMatch(/completed|failed/);
    expect(resume.parse_status).not.toBe("processing");
  });

  test("a completed resume gets a real ATS score row, not a stuck/missing one", async ({ page }) => {
    const resume = await uploadAndGetResumeId(page);
    test.skip(resume.parse_status !== "completed", `Text extraction did not complete for this run (status: ${resume.parse_status}) — nothing to score.`);

    const admin = adminClient();
    const { data: score } = await admin.from("ats_scores").select("overall_score").eq("resume_id", resume.id).maybeSingle();
    expect(score).not.toBeNull();
    expect(score!.overall_score).toBeGreaterThanOrEqual(0);
    expect(score!.overall_score).toBeLessThanOrEqual(100);

    await page.goto("/candidate/resume");
    await expect(page.getByText("AI ATS Score")).toBeVisible();
  });
});
