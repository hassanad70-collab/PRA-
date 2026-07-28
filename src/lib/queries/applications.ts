import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCandidateFullProfile } from "@/lib/queries/candidate";
import type { ApplicationStatus, Company, InterviewStatus, Job, JobMatch, ParsedResumeData, ScreeningResult } from "@/types/database";

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

export interface ComparisonCandidate {
  applicationId: string;
  status: ApplicationStatus;
  jobTitle: string;
  fullName: string;
  profile: Awaited<ReturnType<typeof getCandidateFullProfile>>;
  atsScore: number | null;
  aiScore: number | null;
  interviewRecommendation: ScreeningResult["interview_recommendation"];
  jobMatch: JobMatch | null;
  interviewStatus: InterviewStatus | null;
  expectedSalary: { min: number | null; max: number | null; currency: string } | null;
}

/**
 * Candidate Comparison (Recruiter Intelligence v2.0, Phase 3) -- reuses
 * getCandidateFullProfile (experience/education/skills/languages/
 * certificates, already built for the candidate profile page) rather than
 * re-querying those tables, plus the same application-scoped AI data
 * (screening_result, ats_score, job_match) as getApplicationDetail.
 */
export async function getApplicationsForComparison(applicationIds: string[]): Promise<ComparisonCandidate[]> {
  const supabase = await createClient();

  const results = await Promise.all(
    applicationIds.map(async (applicationId) => {
      const { data: app } = await supabase
        .from("applications")
        .select(
          `id, job_id, candidate_id, resume_id, status,
          job:jobs(title),
          candidate:candidates(profile:profiles(full_name), expected_salary_min, expected_salary_max, salary_currency)`
        )
        .eq("id", applicationId)
        .single()
        .returns<{
          id: string;
          job_id: string;
          candidate_id: string;
          resume_id: string;
          status: ApplicationStatus;
          job: { title: string } | null;
          candidate: {
            profile: { full_name: string } | null;
            expected_salary_min: number | null;
            expected_salary_max: number | null;
            salary_currency: string;
          } | null;
        }>();

      if (!app) return null;

      const [profile, { data: atsScore }, { data: screeningResult }, { data: jobMatch }, { data: interviews }] = await Promise.all([
        getCandidateFullProfile(app.candidate_id),
        supabase
          .from("ats_scores")
          .select("overall_score")
          .eq("resume_id", app.resume_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("screening_results").select("overall_score, interview_recommendation").eq("application_id", applicationId).maybeSingle(),
        supabase
          .from("job_matches")
          .select("*")
          .eq("job_id", app.job_id)
          .eq("candidate_id", app.candidate_id)
          .maybeSingle(),
        supabase
          .from("interviews")
          .select("status")
          .eq("application_id", applicationId)
          .order("scheduled_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const comparison: ComparisonCandidate = {
        applicationId: app.id,
        status: app.status,
        jobTitle: app.job?.title ?? "",
        fullName: app.candidate?.profile?.full_name ?? "",
        profile,
        atsScore: atsScore?.overall_score ?? null,
        aiScore: screeningResult?.overall_score ?? null,
        interviewRecommendation: screeningResult?.interview_recommendation ?? null,
        jobMatch: (jobMatch as JobMatch | null) ?? null,
        interviewStatus: interviews?.status ?? null,
        expectedSalary: app.candidate
          ? {
              min: app.candidate.expected_salary_min,
              max: app.candidate.expected_salary_max,
              currency: app.candidate.salary_currency,
            }
          : null,
      };
      return comparison;
    })
  );

  return results.filter((r): r is ComparisonCandidate => r !== null);
}

export async function getCompanyApplicationsCount(companyId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("applications")
    .select("id, job:jobs!inner(company_id)", { count: "exact", head: true })
    .eq("job.company_id", companyId);
  return count ?? 0;
}
