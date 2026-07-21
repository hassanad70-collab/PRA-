import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { TEST_USERS } from "./global-setup";

/**
 * These tests bypass the UI entirely and drive Supabase directly with real
 * authenticated sessions, because RLS is a database-layer guarantee — the
 * thing that actually matters is what a direct API/DB call can see, not what
 * the UI happens to render. This is exactly how the tenant-isolation leak
 * fixed in migration 0014 was found and confirmed.
 */

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

async function signIn(email: string, password: string) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Sign-in failed for ${email}: ${error?.message}`);
  return { supabase, userId: data.user.id };
}

test.describe("RLS / tenant isolation", () => {
  test("a recruiter cannot read a candidate's profile/resume/candidate row unless that candidate applied to their company or is in their talent pool", async () => {
    const { supabase: recruiterSession } = await signIn(TEST_USERS.recruiterOther.email, TEST_USERS.recruiterOther.password);
    const { userId: candidateId } = await signIn(TEST_USERS.candidate.email, TEST_USERS.candidate.password);

    // recruiterOther's company has never received an application from this
    // candidate and hasn't saved them to their talent pool.
    const candidateRow = await recruiterSession.from("candidates").select("id").eq("id", candidateId).maybeSingle();
    expect(candidateRow.error).toBeNull();
    expect(candidateRow.data).toBeNull();

    const profileRow = await recruiterSession.from("profiles").select("id").eq("id", candidateId).maybeSingle();
    expect(profileRow.error).toBeNull();
    expect(profileRow.data).toBeNull();

    const resumeRows = await recruiterSession.from("resumes").select("id").eq("candidate_id", candidateId);
    expect(resumeRows.error).toBeNull();
    expect(resumeRows.data).toEqual([]);
  });

  test("a candidate can always read their own data", async () => {
    const { supabase, userId } = await signIn(TEST_USERS.candidate.email, TEST_USERS.candidate.password);

    const own = await supabase.from("candidates").select("id").eq("id", userId).maybeSingle();
    expect(own.error).toBeNull();
    expect(own.data?.id).toBe(userId);
  });

  test("a candidate cannot read another candidate's profile", async () => {
    const { supabase } = await signIn(TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    const { userId: otherCandidateId } = await signIn(TEST_USERS.candidateOther.email, TEST_USERS.candidateOther.password);

    const result = await supabase.from("candidates").select("id").eq("id", otherCandidateId).maybeSingle();
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  test("a recruiter CAN read a candidate who actually applied to a job at their company (legitimate access still works)", async () => {
    const { supabase: recruiterSession, userId: recruiterId } = await signIn(TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    const { supabase: candidateSession, userId: candidateId } = await signIn(TEST_USERS.candidate.email, TEST_USERS.candidate.password);

    const { data: recruiterRow } = await recruiterSession.from("recruiters").select("company_id").eq("id", recruiterId).single();
    const { data: job } = await recruiterSession.from("jobs").select("id").eq("company_id", recruiterRow!.company_id).eq("status", "published").limit(1).single();

    // Ensure the candidate has a resume to apply with, and an application exists.
    let { data: resume } = await candidateSession.from("resumes").select("id").eq("candidate_id", candidateId).limit(1).maybeSingle();
    if (!resume) {
      const inserted = await candidateSession
        .from("resumes")
        .insert({ candidate_id: candidateId, file_name: "rls-test.pdf", file_url: "https://example.test/x.pdf", file_path: `${candidateId}/rls-test.pdf`, parse_status: "completed" })
        .select("id")
        .single();
      resume = inserted.data;
    }

    await candidateSession
      .from("applications")
      .upsert({ job_id: job!.id, candidate_id: candidateId, resume_id: resume!.id, status: "submitted" }, { onConflict: "job_id,candidate_id" });

    const visible = await recruiterSession.from("candidates").select("id").eq("id", candidateId).maybeSingle();
    expect(visible.error).toBeNull();
    expect(visible.data?.id).toBe(candidateId);
  });

  test("super_admin can read any candidate's data regardless of company", async () => {
    const { supabase: adminSession } = await signIn(TEST_USERS.admin.email, TEST_USERS.admin.password);
    const { userId: candidateId } = await signIn(TEST_USERS.candidateOther.email, TEST_USERS.candidateOther.password);

    const result = await adminSession.from("candidates").select("id").eq("id", candidateId).maybeSingle();
    expect(result.error).toBeNull();
    expect(result.data?.id).toBe(candidateId);
  });

  test("an anonymous (unauthenticated) client cannot read any candidate rows", async () => {
    const anon = client();
    const result = await anon.from("candidates").select("id").limit(5);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
