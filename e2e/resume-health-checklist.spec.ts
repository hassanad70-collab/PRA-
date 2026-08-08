import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

/**
 * Regression coverage for a reported pipeline-consistency bug: a resume
 * whose parsed_data genuinely contained email/phone/experience/education/
 * skills was still shown by the Resume Health Checklist as missing all of
 * them, while the ATS score (read from the same resume row) displayed
 * normally. Root cause: the AI structured-extraction call and the ATS
 * scoring call are independent -- the scorer reads raw text directly and
 * can succeed even when structured extraction silently degraded to its
 * empty-array/no-contact-info fallback, and nothing previously
 * distinguished that degraded state from a genuine "this resume has no
 * email" fact. Fixed by giving degraded extractions a distinct
 * parse_status ("completed_partial") and having the checklist surface that
 * explicitly instead of silently disagreeing with the score.
 *
 * These tests seed `resumes.parsed_data` directly (bypassing the OpenAI
 * call, same as every other AI-feature spec in this suite, since no API key
 * is configured in this environment) so they exercise exactly the checklist
 * rendering logic (runStructuralChecks + ResumeHealthChecklist), not AI
 * output quality.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const FULLY_PARSED = {
  full_name: "E2E Candidate",
  email: "e2e.candidate@example.test",
  phone: "+1-555-0100",
  summary: "Experienced software engineer with a track record of shipping reliable systems.",
  experience: [
    {
      company_name: "Fixture Co",
      job_title: "Senior Software Engineer",
      start_date: "2020-01",
      end_date: null,
      is_current: true,
      description: "Led development of the core platform, increased throughput by 35%.",
    },
  ],
  education: [{ institution: "Fixture University", degree: "B.S. Computer Science" }],
  skills: ["TypeScript", "React", "PostgreSQL", "Testing"],
  certificates: [],
  languages: [],
  projects: [],
  achievements: [],
};

// The exact shape src/lib/ai/resume-parser.ts's FALLBACK_DATA produces when
// structured extraction is unavailable/fails -- truthy summary placeholder,
// but no email/phone and every list field empty.
const DEGRADED_FALLBACK = {
  summary: "Resume uploaded. Enable OpenAI API key to extract structured data.",
  experience: [],
  education: [],
  skills: [],
  certificates: [],
  languages: [],
  projects: [],
  achievements: [],
};

const ARABIC_PARSED = {
  full_name: "مرشح تجريبي",
  email: "arabic.e2e@example.test",
  phone: "+966-50-000-0000",
  summary: "مهندس برمجيات ذو خبرة في بناء أنظمة موثوقة.",
  experience: [
    {
      company_name: "شركة تجريبية",
      job_title: "مهندس برمجيات أول",
      start_date: "2019-01",
      end_date: null,
      is_current: true,
      description: "قاد تطوير المنصة الأساسية.",
    },
  ],
  education: [{ institution: "جامعة تجريبية", degree: "بكالوريوس علوم الحاسب" }],
  skills: ["TypeScript", "React"],
  certificates: [],
  languages: [],
  projects: [],
  achievements: [],
};

const RAW_TEXT_FIXTURE =
  "E2E Candidate\nemail: e2e.candidate@example.test\nphone: +1-555-0100\n\nExperience\nSenior Software Engineer, Fixture Co\n\nEducation\nB.S. Computer Science, Fixture University\n\nSkills\nTypeScript, React, PostgreSQL, Testing";

async function seedResumeAndScore(
  admin: ReturnType<typeof adminClient>,
  candidateId: string,
  opts: { parsedData: object; parseStatus: string; rawText?: string; parseErrorCode?: string }
) {
  // Clean slate so getLatestAtsScore's "most recent row" pick is
  // deterministic across repeated runs.
  await admin.from("resumes").delete().eq("candidate_id", candidateId);
  await admin.from("ats_scores").delete().eq("candidate_id", candidateId);

  const { data: resume, error } = await admin
    .from("resumes")
    .insert({
      candidate_id: candidateId,
      file_name: "e2e-health-checklist-fixture.pdf",
      file_url: "https://example.test/x.pdf",
      file_path: `${candidateId}/e2e-health-checklist-fixture.pdf`,
      raw_text: opts.rawText ?? RAW_TEXT_FIXTURE,
      parsed_data: opts.parsedData,
      parse_status: opts.parseStatus,
      parse_error_code: opts.parseErrorCode ?? null,
      is_primary: true,
    })
    .select("id")
    .single();
  if (error || !resume) throw new Error(`Failed to seed fixture resume: ${error?.message}`);

  const { error: scoreError } = await admin.from("ats_scores").insert({
    resume_id: resume.id,
    candidate_id: candidateId,
    overall_score: 78,
    experience_score: 80,
    skills_score: 75,
    formatting_score: 82,
    education_score: 70,
    achievements_score: 65,
    recruiter_readability_score: 77,
    keyword_density: {},
    weaknesses: ["Fixture weakness"],
    suggestions: ["Fixture suggestion"],
    ai_model: "e2e-fixture",
  });
  if (scoreError) throw new Error(`Failed to seed fixture ats_score: ${scoreError.message}`);

  return resume.id as string;
}

test.describe("Resume Health Checklist consistency", () => {
  test("reports Email, Phone, Experience, Education, and Skills as detected when parsed_data actually contains them", async ({ page }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await seedResumeAndScore(admin, candidateProfile!.id, { parsedData: FULLY_PARSED, parseStatus: "completed" });

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/workspace/ats-checker");

    await expect(page.getByText("Resume health checklist")).toBeVisible();
    await expect(page.getByText("Email address detected.")).toBeVisible();
    await expect(page.getByText("Phone number detected.")).toBeVisible();
    await expect(page.getByText("Professional summary present.")).toBeVisible();
    await expect(page.getByText("Work experience section present.")).toBeVisible();
    await expect(page.getByText("Education section present.")).toBeVisible();
    await expect(page.getByText("Skills section present.")).toBeVisible();

    // The ATS score (same resume row) must also be visible, and the two
    // must never present contradictory stories about the same resume.
    await expect(page.getByText("78", { exact: true })).toBeVisible();
    await expect(page.getByText(/couldn't fully extract/i)).not.toBeVisible();
  });

  test("when structured extraction degraded to its fallback, the checklist explains why instead of silently contradicting the ATS score", async ({
    page,
  }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    const resumeId = await seedResumeAndScore(admin, candidateProfile!.id, {
      parsedData: DEGRADED_FALLBACK,
      parseStatus: "completed_partial",
    });

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/workspace/ats-checker");

    // The notice must be visible and explain the gap -- not just five
    // unexplained "fail" rows sitting next to a normal-looking ATS score.
    await expect(page.getByText(/couldn't fully extract/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry extraction" })).toBeVisible();
    await expect(page.getByText("No email address detected", { exact: false })).toBeVisible();
    await expect(page.getByText("78", { exact: true })).toBeVisible();

    // "Your Resumes" list must also surface the distinct status, not the
    // misleading plain "Completed". Navigate to the resumes list page where
    // parse_status badges are rendered. Scoped with .first() since other specs
    // sharing this same fixture candidate may leave their own resume rows
    // around (each independently gets "completed_partial" too, since no
    // OpenAI key is configured anywhere in this test environment) --
    // this assertion only needs to confirm the label itself renders
    // correctly, not how many resumes currently exist.
    await page.goto("/candidate/workspace/resumes");
    await expect(page.getByText("Completed partial").first()).toBeVisible();

    await admin.from("resumes").delete().eq("id", resumeId);
  });

  test("Retry extraction re-runs the pipeline without erroring", async ({ page }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await seedResumeAndScore(admin, candidateProfile!.id, {
      parsedData: DEGRADED_FALLBACK,
      parseStatus: "completed_partial",
    });

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/workspace/ats-checker");

    await page.getByRole("button", { name: "Retry extraction" }).click();
    // No OpenAI key in this environment, so this re-runs the same
    // deterministic fallback path -- the assertion here is that retrying
    // completes cleanly (no crash, a toast fires) using the exact same
    // parseAndScoreResume code path the initial upload uses.
    await expect(page.getByText(/Resume re-analyzed\.|Could not reparse/)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("a rate-limit failure shows rate-limit-specific wording with a Retry button (transient, worth retrying)", async ({ page }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await seedResumeAndScore(admin, candidateProfile!.id, {
      parsedData: DEGRADED_FALLBACK,
      parseStatus: "completed_partial",
      parseErrorCode: "rate_limit",
    });

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/workspace/ats-checker");

    await expect(page.getByText(/rate limit/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry extraction" })).toBeVisible();
  });

  test("a missing-API-key failure shows a distinct message and hides the Retry button (won't self-heal)", async ({ page }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await seedResumeAndScore(admin, candidateProfile!.id, {
      parsedData: DEGRADED_FALLBACK,
      parseStatus: "completed_partial",
      parseErrorCode: "missing_api_key",
    });

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/candidate/workspace/ats-checker");

    await expect(page.getByText(/isn't enabled for this environment/i)).toBeVisible();
    // Retrying a missing API key reproduces the exact same fallback every
    // time, so offering a button here would just waste the candidate's click.
    await expect(page.getByRole("button", { name: "Retry extraction" })).not.toBeVisible();
  });

  test("works the same way for an Arabic resume", async ({ page }) => {
    const admin = adminClient();
    const { data: candidateProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await seedResumeAndScore(admin, candidateProfile!.id, {
      parsedData: ARABIC_PARSED,
      parseStatus: "completed",
      rawText: "مرشح تجريبي\nمهندس برمجيات أول في شركة تجريبية\nبكالوريوس علوم الحاسب من جامعة تجريبية\nTypeScript, React",
    });

    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
    await page.goto("/ar/candidate/workspace/ats-checker");

    await expect(page.getByText("قائمة فحص صحة السيرة الذاتية")).toBeVisible();
    // Same field-name checks as the English case -- the checklist logic is
    // language-agnostic (it checks parsed_data's presence, not text
    // language), so an Arabic resume with real structured data must show
    // the same "detected" results as an English one.
    await expect(page.getByText("تم رصد عنوان بريد إلكتروني.")).toBeVisible();
  });
});
