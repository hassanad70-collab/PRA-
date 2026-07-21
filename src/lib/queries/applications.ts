import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * job_matches and ats_scores both relate to applications indirectly (via
 * job_id/candidate_id and resume_id respectively), not through a direct
 * foreign key to applications.id. PostgREST can't embed either as a nested
 * resource, so embedding them in the applications select below throws a
 * "Could not find a relationship" error — previously unchecked, which made
 * both of these queries fail silently and rendered every recruiter's
 * candidate list and application detail page empty. Fetched separately and
 * merged in JS instead, preserving the same job_match[]/ats_score[] array
 * shape the UI already expects.
 */

/** All applications for a job, ranked by AI screening score (best first). */
export async function getApplicationsForJob(jobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      `*,
      candidate:candidates(*, profile:profiles(*)),
      resume:resumes(*),
      screening_result:screening_results(*)`
    )
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("getApplicationsForJob failed", error);
    return [];
  }
  if (!data?.length) return [];

  const candidateIds = data.map((a) => a.candidate_id);
  const resumeIds = data.map((a) => a.resume_id);

  const [{ data: matches }, { data: scores }] = await Promise.all([
    supabase
      .from("job_matches")
      .select("candidate_id, match_score, strengths, weaknesses, missing_skills, interview_probability, ai_summary")
      .eq("job_id", jobId)
      .in("candidate_id", candidateIds),
    supabase
      .from("ats_scores")
      .select("resume_id, overall_score")
      .in("resume_id", resumeIds)
      .order("created_at", { ascending: false }),
  ]);

  const matchByCandidateId = new Map((matches ?? []).map((m) => [m.candidate_id, m]));
  const scoreRows = scores ?? [];
  const scoreByResumeId = new Map<string, (typeof scoreRows)[number]>();
  scoreRows.forEach((s) => {
    if (!scoreByResumeId.has(s.resume_id)) scoreByResumeId.set(s.resume_id, s);
  });

  const rows = data.map((app) => ({
    ...app,
    job_match: matchByCandidateId.has(app.candidate_id) ? [matchByCandidateId.get(app.candidate_id)!] : [],
    ats_score: scoreByResumeId.has(app.resume_id) ? [scoreByResumeId.get(app.resume_id)!] : [],
  }));

  return rows.sort((a, b) => {
    const scoreA = a.screening_result?.[0]?.overall_score ?? -1;
    const scoreB = b.screening_result?.[0]?.overall_score ?? -1;
    return scoreB - scoreA;
  });
}

export async function getApplicationDetail(applicationId: string) {
  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from("applications")
    .select(
      `*,
      job:jobs(*, company:companies(*)),
      candidate:candidates(*, profile:profiles(*)),
      resume:resumes(*),
      screening_result:screening_results(*)`
    )
    .eq("id", applicationId)
    .single();

  if (error || !app) {
    if (error) console.error("getApplicationDetail failed", error);
    return null;
  }

  const [{ data: matches }, { data: scores }] = await Promise.all([
    supabase.from("job_matches").select("*").eq("job_id", app.job_id).eq("candidate_id", app.candidate_id),
    supabase.from("ats_scores").select("*").eq("resume_id", app.resume_id).order("created_at", { ascending: false }),
  ]);

  return { ...app, job_match: matches ?? [], ats_score: scores ?? [] };
}

export async function getCompanyApplicationsCount(companyId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("applications")
    .select("id, job:jobs!inner(company_id)", { count: "exact", head: true })
    .eq("job.company_id", companyId);
  return count ?? 0;
}
