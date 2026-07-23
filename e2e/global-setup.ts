import { createClient } from "@supabase/supabase-js";

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
}

export default globalSetup;
