import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Application, Company, Job, InterviewStatus, InterviewType } from "@/types/database";

interface ApplicationInterviewSummary {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: InterviewType;
  location_or_link: string | null;
  status: InterviewStatus;
}

// This project's Supabase client has no generated `Database` generic (see
// this file's header context in src/lib/queries/jobs.ts), so a bare `return
// []` early-return infers as `any[]` with no contextual type to check it
// against, which silently collapses this whole function's return type to
// `any[]` -- callers then get no type-checking at all (a `.find()` callback
// added downstream in src/app/candidate/applications/page.tsx is what
// surfaced it). `.returns<T[]>()` on the main select plus this explicit
// function return annotation keeps both the query and its early returns
// honest.
interface CandidateApplicationListItem extends Application {
  job: (Job & { company: Company | null }) | null;
  job_match: { job_id: string; match_score: number; ai_summary: string | null }[];
  interviews: ApplicationInterviewSummary[];
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return profile ? { ...profile, authUser: user } : null;
}

export async function getCandidateFullProfile(candidateId: string) {
  const supabase = await createClient();

  const [
    { data: candidate },
    { data: profile },
    { data: experience },
    { data: education },
    { data: skills },
    { data: certificates },
    { data: languages },
    { data: projects },
    { data: achievements },
    { data: resumes },
  ] = await Promise.all([
    supabase.from("candidates").select("*").eq("id", candidateId).single(),
    supabase.from("profiles").select("*").eq("id", candidateId).single(),
    supabase.from("candidate_experience").select("*").eq("candidate_id", candidateId).order("start_date", { ascending: false }),
    supabase.from("candidate_education").select("*").eq("candidate_id", candidateId).order("start_date", { ascending: false }),
    supabase.from("candidate_skills").select("*").eq("candidate_id", candidateId).order("skill_name"),
    supabase.from("candidate_certificates").select("*").eq("candidate_id", candidateId),
    supabase.from("candidate_languages").select("*").eq("candidate_id", candidateId),
    supabase.from("candidate_projects").select("*").eq("candidate_id", candidateId),
    supabase.from("candidate_achievements").select("*").eq("candidate_id", candidateId),
    supabase.from("resumes").select("*").eq("candidate_id", candidateId).order("uploaded_at", { ascending: false }),
  ]);

  return {
    candidate,
    profile,
    experience: experience ?? [],
    education: education ?? [],
    skills: skills ?? [],
    certificates: certificates ?? [],
    languages: languages ?? [],
    projects: projects ?? [],
    achievements: achievements ?? [],
    resumes: resumes ?? [],
  };
}

export async function getCandidateApplications(candidateId: string): Promise<CandidateApplicationListItem[]> {
  const supabase = await createClient();

  // job_matches has no direct foreign key to applications (it relates via
  // job_id + candidate_id instead), so it can't be embedded in this query
  // via PostgREST's relationship syntax — that previously made this whole
  // query throw silently (unchecked error), which made every candidate's
  // "My Applications" page always render empty regardless of real data.
  const { data, error } = await supabase
    .from("applications")
    .select("*, job:jobs(*, company:companies(*))")
    .eq("candidate_id", candidateId)
    .order("applied_at", { ascending: false })
    .returns<(Application & { job: (Job & { company: Company | null }) | null })[]>();

  if (error) {
    console.error("getCandidateApplications failed", error);
    return [];
  }
  if (!data?.length) return [];

  const jobIds = data.map((app) => app.job_id);
  const applicationIds = data.map((app) => app.id);
  const [{ data: matches }, { data: interviews }] = await Promise.all([
    supabase.from("job_matches").select("job_id, match_score, ai_summary").eq("candidate_id", candidateId).in("job_id", jobIds),
    supabase
      .from("interviews")
      .select("id, application_id, scheduled_at, duration_minutes, interview_type, location_or_link, status")
      .in("application_id", applicationIds)
      .order("scheduled_at", { ascending: false })
      .returns<ApplicationInterviewSummary[]>(),
  ]);

  const matchByJobId = new Map((matches ?? []).map((m) => [m.job_id, m]));
  const interviewsByApplicationId = new Map<string, ApplicationInterviewSummary[]>();
  (interviews ?? []).forEach((iv) => {
    const list = interviewsByApplicationId.get(iv.application_id) ?? [];
    list.push(iv);
    interviewsByApplicationId.set(iv.application_id, list);
  });

  return data.map((app) => ({
    ...app,
    job_match: matchByJobId.has(app.job_id) ? [matchByJobId.get(app.job_id)!] : [],
    interviews: interviewsByApplicationId.get(app.id) ?? [],
  }));
}

export async function getRecommendedJobsForCandidate(candidateId: string, limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_matches")
    .select("*, job:jobs(*, company:companies(*))")
    .eq("candidate_id", candidateId)
    .order("match_score", { ascending: false })
    .limit(limit);

  return (data ?? []).filter((m) => m.job?.status === "published");
}

export async function getSavedJobIds(candidateId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_jobs").select("job_id").eq("candidate_id", candidateId);
  return new Set((data ?? []).map((r) => r.job_id));
}

export async function getLatestAtsScore(candidateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ats_scores")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}
