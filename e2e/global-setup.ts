import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

/**
 * Idempotently provisions the fixed test accounts + a published test job
 * this whole suite runs against, using the admin API (bypasses the broken
 * default-mailer email-confirmation flow the same way the app's own
 * registration actions do). Safe to run repeatedly — every step no-ops if
 * the row already exists.
 */

export const TEST_USERS = {
  candidate: { email: "e2e.candidate@example.test", password: "TestPass123!", fullName: "E2E Candidate" },
  candidateOther: { email: "e2e.candidate.other@example.test", password: "TestPass123!", fullName: "E2E Other Candidate" },
  recruiter: { email: "e2e.recruiter@example.test", password: "TestPass123!", fullName: "E2E Recruiter", companyName: "E2E Test Company" },
  recruiterOther: { email: "e2e.recruiter.other@example.test", password: "TestPass123!", fullName: "E2E Other Recruiter", companyName: "E2E Other Company" },
  admin: { email: "e2e.admin@example.test", password: "TestPass123!", fullName: "E2E Admin" },
};

export const TEST_JOB_SLUG = "e2e-test-published-job";
export const TEST_OTHER_COMPANY_JOB_SLUG = "e2e-other-company-published-job";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (loaded from .env.local) to run the e2e suite."
    );
  }
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function ensureUser(admin: ReturnType<typeof getAdminClient>, user: { email: string; password: string; fullName: string }, role: string) {
  const { data: existing } = await admin.from("profiles").select("id").eq("email", user.email).maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.fullName, role },
  });
  if (error || !data.user) throw new Error(`Failed to create ${user.email}: ${error?.message}`);
  return data.user.id;
}

async function globalSetup() {
  // Playwright's webServer hasn't necessarily loaded .env.local into this
  // process; load it the same way the rest of this session's verification
  // scripts have.
  const fs = await import("fs");
  const path = await import("path");
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1).trim();
    }
  }

  const admin = getAdminClient();

  // auth.spec.ts's registration test creates a fresh, uniquely-named
  // throwaway account every run (e2e.register.<timestamp>@example.test) and
  // never cleans it up. Across many runs these accumulate in the profiles
  // table and eventually push fixed fixture accounts (e.g. this file's own
  // TEST_USERS.candidate) off the default/first page of admin listings that
  // sort newest-first -- same accumulation problem this file already
  // guards against for resumes below, just for a different table.
  const { data: staleRegistrations } = await admin
    .from("profiles")
    .select("id")
    .like("email", "e2e.register.%@example.test");
  if (staleRegistrations?.length) {
    for (const { id } of staleRegistrations) {
      await admin.auth.admin.deleteUser(id);
    }
  }

  const candidateId = await ensureUser(admin, TEST_USERS.candidate, "candidate");
  await admin.from("candidates").upsert({ id: candidateId }, { onConflict: "id" });

  // resume-upload / ai-workflow / job-application specs each upload fresh
  // resumes for this fixed candidate on every run; without this, they
  // accumulate indefinitely across runs (11+ piled up during this suite's
  // own development, which is what surfaced the dialog-overflow bug below).
  await admin.from("applications").delete().eq("candidate_id", candidateId);
  await admin.from("ats_scores").delete().eq("candidate_id", candidateId);
  await admin.from("resumes").delete().eq("candidate_id", candidateId);
  await admin.from("candidates").update({ primary_resume_id: null }).eq("id", candidateId);

  // Career coach tables accumulate across runs. Goals in active/paused state
  // from a mid-run failure would cause the creation test to find an existing
  // goal on the next run; cascading FK deletes clean up the child tables.
  await admin.from("career_goals").delete().eq("user_id", candidateId);

  // guest_tool_usage accumulates across runs. When the manually-started test
  // server lacks E2E_TEST_MODE=true, the IP-based daily cap (3 scans) is
  // enforced, causing the guest-ats-checker tests to see ip_capped after a
  // few successful runs. Clearing all rows at suite start ensures a clean slate.
  await admin.from("guest_tool_usage").delete().not("id", "is", null);

  const candidateOtherId = await ensureUser(admin, TEST_USERS.candidateOther, "candidate");
  await admin.from("candidates").upsert({ id: candidateOtherId }, { onConflict: "id" });

  const recruiterId = await ensureUser(admin, TEST_USERS.recruiter, "recruiter");
  let { data: company } = await admin.from("companies").select("id").eq("slug", "e2e-test-company").maybeSingle();
  if (!company) {
    const { data: newCompany, error } = await admin
      .from("companies")
      .insert({ name: TEST_USERS.recruiter.companyName, slug: "e2e-test-company", created_by: recruiterId })
      .select("id")
      .single();
    if (error || !newCompany) throw new Error(`Failed to create test company: ${error?.message}`);
    company = newCompany;
  }
  await admin.from("recruiters").upsert(
    { id: recruiterId, company_id: company.id, job_title: "Recruiter", is_company_admin: true },
    { onConflict: "id" }
  );

  const recruiterOtherId = await ensureUser(admin, TEST_USERS.recruiterOther, "recruiter");
  let { data: companyOther } = await admin.from("companies").select("id").eq("slug", "e2e-other-company").maybeSingle();
  if (!companyOther) {
    const { data: newCompany, error } = await admin
      .from("companies")
      .insert({ name: TEST_USERS.recruiterOther.companyName, slug: "e2e-other-company", created_by: recruiterOtherId })
      .select("id")
      .single();
    if (error || !newCompany) throw new Error(`Failed to create other test company: ${error?.message}`);
    companyOther = newCompany;
  }
  await admin.from("recruiters").upsert(
    { id: recruiterOtherId, company_id: companyOther.id, job_title: "Recruiter", is_company_admin: true },
    { onConflict: "id" }
  );

  const adminId = await ensureUser(admin, TEST_USERS.admin, "super_admin");
  await admin.from("profiles").update({ role: "super_admin" }).eq("id", adminId);

  // A published job at the primary test company, used by resume-upload,
  // job-application, and public-access specs.
  const { data: existingJob } = await admin.from("jobs").select("id").eq("slug", TEST_JOB_SLUG).maybeSingle();
  if (!existingJob) {
    const { error } = await admin.from("jobs").insert({
      company_id: company.id,
      recruiter_id: recruiterId,
      title: "E2E Test — Software Engineer",
      slug: TEST_JOB_SLUG,
      description: "Fixture job used by the Playwright end-to-end suite. Safe to ignore.",
      required_skills: ["JavaScript", "Testing"],
      status: "published",
      published_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to create test job: ${error.message}`);
  }

  // A published job at the other test company -- needed by rls.spec.ts and
  // ai-candidate-discovery.spec.ts, which test AI-matching discoverability
  // scoped to "the recruiter's own company" and specifically need a second,
  // isolated company/job pair distinct from the primary one above.
  const { data: existingOtherJob } = await admin
    .from("jobs")
    .select("id")
    .eq("slug", TEST_OTHER_COMPANY_JOB_SLUG)
    .maybeSingle();
  if (!existingOtherJob) {
    const { error } = await admin.from("jobs").insert({
      company_id: companyOther.id,
      recruiter_id: recruiterOtherId,
      title: "E2E Other Company Test — Product Manager",
      slug: TEST_OTHER_COMPANY_JOB_SLUG,
      description: "Fixture job used by the Playwright end-to-end suite. Safe to ignore.",
      required_skills: ["Product Strategy", "Testing"],
      status: "published",
      published_at: new Date().toISOString(),
    });
    if (error) throw new Error(`Failed to create other-company test job: ${error.message}`);
  }

  // Authenticate each test role once via the browser UI and persist the session
  // cookies + localStorage to files. Tests that don't exercise auth flows
  // directly (i.e. everything except auth.spec.ts and auth-session-consistency.spec.ts)
  // load these files via test.use({ storageState }), eliminating ~160 redundant
  // Supabase auth API calls per suite run and making the suite immune to the
  // Supabase auth rate limit (~170 logins/hour).
  const authDir = path.join(__dirname, ".auth");
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();

  async function saveStorageState(
    email: string,
    password: string,
    waitForUrl: RegExp,
    storageFile: string
  ) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("http://localhost:3100/login");
    await page.getByPlaceholder("you@company.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(waitForUrl, { timeout: 15_000 });
    await context.storageState({ path: storageFile });
    await context.close();
  }

  await saveStorageState(
    TEST_USERS.candidate.email,
    TEST_USERS.candidate.password,
    /\/candidate\/dashboard$/,
    path.join(authDir, "candidate.json")
  );
  await saveStorageState(
    TEST_USERS.candidateOther.email,
    TEST_USERS.candidateOther.password,
    /\/candidate\/dashboard$/,
    path.join(authDir, "candidate-other.json")
  );
  await saveStorageState(
    TEST_USERS.recruiter.email,
    TEST_USERS.recruiter.password,
    /\/recruiter\/dashboard$/,
    path.join(authDir, "recruiter.json")
  );
  await saveStorageState(
    TEST_USERS.recruiterOther.email,
    TEST_USERS.recruiterOther.password,
    /\/recruiter\/dashboard$/,
    path.join(authDir, "recruiter-other.json")
  );
  await saveStorageState(
    TEST_USERS.admin.email,
    TEST_USERS.admin.password,
    /\/admin/,
    path.join(authDir, "admin.json")
  );

  await browser.close();
}

export default globalSetup;
