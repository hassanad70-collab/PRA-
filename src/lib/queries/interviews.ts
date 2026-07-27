import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { InterviewQuestionCategory, InterviewStatus, InterviewType } from "@/types/database";

const CATEGORY_ORDER: InterviewQuestionCategory[] = ["technical", "behavioral", "situational", "case_study"];

// Shared shape for the two "dedicated interviews view" queries below --
// interviews has a real FK to applications, so `!inner` embeds let us filter
// on the joined job/candidate columns directly instead of a second round trip.
export interface RecruiterInterviewListItem {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: InterviewType;
  location_or_link: string | null;
  status: InterviewStatus;
  application_id: string;
  application: {
    job: { id: string; title: string } | null;
    candidate: { profile: { full_name: string } | null } | null;
  } | null;
}

export interface CandidateInterviewListItem {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: InterviewType;
  location_or_link: string | null;
  status: InterviewStatus;
  application_id: string;
  application: {
    job: { id: string; title: string; company: { name: string } | null } | null;
  } | null;
}

export async function getInterviewQuestionsForJob(jobId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });

  const questions = data ?? [];
  return CATEGORY_ORDER.map((category) => ({
    category,
    questions: questions.filter((q) => q.category === category),
  }));
}

export async function getInterviewsForApplication(applicationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interviews")
    .select("*")
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: false });
  return data ?? [];
}

/** Every interview across every job at the recruiter's company -- the "dedicated interviews view" (Unit H). */
export async function getInterviewsForCompany(companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .select(
      `id, scheduled_at, duration_minutes, interview_type, location_or_link, status, application_id,
      application:applications!inner(
        job:jobs!inner(id, title, company_id),
        candidate:candidates(profile:profiles(full_name))
      )`
    )
    .eq("application.job.company_id", companyId)
    .order("scheduled_at", { ascending: false })
    .returns<RecruiterInterviewListItem[]>();

  if (error) {
    console.error("getInterviewsForCompany failed", error);
    return [];
  }
  return data ?? [];
}

/** Every interview across every one of a candidate's own applications -- the candidate-side "dedicated interviews view" (Unit H). */
export async function getCandidateInterviews(candidateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .select(
      `id, scheduled_at, duration_minutes, interview_type, location_or_link, status, application_id,
      application:applications!inner(
        candidate_id,
        job:jobs(id, title, company:companies(name))
      )`
    )
    .eq("application.candidate_id", candidateId)
    .order("scheduled_at", { ascending: false })
    .returns<CandidateInterviewListItem[]>();

  if (error) {
    console.error("getCandidateInterviews failed", error);
    return [];
  }
  return data ?? [];
}
