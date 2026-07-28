import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus, Company, Job, ParsedResumeData, ScreeningResult } from "@/types/database";

// This project's Supabase client has no generated `Database` generic (see
// src/types/database.ts's header), so narrowing an embedded relation's
// column list away from "*" makes postgrest-js's fallback type parser
// misinfer its cardinality. `.returns<T>()` declares the real shape
// explicitly instead -- see the longer explanation in
// src/lib/queries/jobs.ts's getPublishedJobs.
//
// screening_result specifically is a *to-one* embed, not to-many:
// screening_results.application_id has a `unique` constraint (migration
// 0007), so PostgREST always returns it as a single object or null, never
// an array -- confirmed by direct testing against the live API while
// building Recruiter Intelligence v2.0's Candidate Insight panel, after
// finding this page's AI Score / AI Screening Summary cards were silently
// never rendering. Every previous call site here (and in
// application-kanban-board.tsx / applicants-panel.tsx / the application
// detail page) read `screening_result?.[0]`, which is always undefined
// against an object -- this was a real, pre-existing, silent regression
// affecting every recruiter-facing AI score display on this data, not
// something introduced by this fix.
interface ApplicationListItem {
  id: string;
  status: ApplicationStatus;
  candidate_id: string;
  resume_id: string;
  candidate: {
    current_position: string | null;
    years_of_experience: number;
    profile: { full_name: string } | null;
  } | null;
  screening_result: ScreeningResult | null;
}

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

/**
 * All applications for a job, ranked by AI screening score (best first).
 * `resume:resumes(*)` was previously joined here but never read by this
 * list's UI (src/app/recruiter/jobs/[id]/candidates/page.tsx) -- every
 * resume row it pulled included a vector(1536) embedding plus raw_text and
 * parsed_data, none of which this view uses. candidate/profile are narrowed
 * to the fields that view actually renders for the same reason.
 */
export async function getApplicationsForJob(jobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      `id, status, candidate_id, resume_id,
      candidate:candidates(current_position, years_of_experience, profile:profiles(full_name)),
      screening_result:screening_results(*)`
    )
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false })
    .returns<ApplicationListItem[]>();

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
    const scoreA = a.screening_result?.overall_score ?? -1;
    const scoreB = b.screening_result?.overall_score ?? -1;
    return scoreB - scoreA;
  });
}

interface ApplicationDetailRow {
  id: string;
  job_id: string;
  candidate_id: string;
  resume_id: string;
  cover_letter_id: string | null;
  status: ApplicationStatus;
  status_reason: string | null;
  applied_at: string;
  updated_at: string;
  job: (Job & { company: Company | null }) | null;
  candidate: {
    current_position: string | null;
    years_of_experience: number;
    profile: { full_name: string } | null;
  } | null;
  resume: { id: string; parsed_data: ParsedResumeData | null; raw_text: string | null } | null;
  screening_result: ScreeningResult | null;
}

export async function getApplicationDetail(applicationId: string) {
  const supabase = await createClient();
  const { data: app, error } = await supabase
    .from("applications")
    .select(
      // A leading bare "*" here (rather than an explicit column list, as
      // used everywhere else in this codebase for exactly this reason --
      // see this file's header comment) made postgrest-js's type generic
      // resolve to an Error-sentinel type once combined with
      // `.single().returns<T>()`, confirmed while fixing the
      // screening_result cardinality bug above -- explicit columns restore
      // normal inference.
      `id, job_id, candidate_id, resume_id, cover_letter_id, status, status_reason, applied_at, updated_at,
      job:jobs(*, company:companies(*)),
      candidate:candidates(*, profile:profiles(*)),
      resume:resumes(*),
      screening_result:screening_results(*)`
    )
    .eq("id", applicationId)
    .single()
    .returns<ApplicationDetailRow>();

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
