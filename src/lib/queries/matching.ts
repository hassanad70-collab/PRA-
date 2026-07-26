import "server-only";

import { createClient } from "@/lib/supabase/server";

// This project's Supabase client has no generated `Database` generic (see
// src/types/database.ts's header), so narrowing an embedded relation's
// column list away from "*" makes postgrest-js's fallback type parser
// misinfer its cardinality. `.returns<T>()` declares the real shape
// explicitly instead -- see the longer explanation in
// src/lib/queries/jobs.ts's getPublishedJobs.
interface RecommendedCandidateItem {
  candidate_id: string;
  resume_id: string;
  match_score: number;
  ai_summary: string | null;
  strengths: string[] | null;
  missing_skills: string[] | null;
  candidate: {
    current_position: string | null;
    years_of_experience: number;
    profile: { full_name: string } | null;
  } | null;
}

/**
 * AI-sourced candidates for a job who have NOT applied -- generateMatchesForJob
 * (src/actions/matching.ts) scores the whole candidate pool via pgvector, but
 * only candidates who opted into is_open_to_work are visible here (enforced
 * both by this query's `candidates!inner` filter and, independently, by RLS's
 * is_candidate_visible_to_staff()). Distinct from getApplicationsForJob, which
 * lists people who actually applied.
 */
export async function getRecommendedCandidatesForJob(jobId: string) {
  const supabase = await createClient();

  const [{ data, error }, { data: applied }] = await Promise.all([
    supabase
      .from("job_matches")
      .select(
        `candidate_id, resume_id, match_score, ai_summary, strengths, missing_skills,
        candidate:candidates!inner(current_position, years_of_experience, is_open_to_work, profile:profiles(full_name))`
      )
      .eq("job_id", jobId)
      .eq("candidate.is_open_to_work", true)
      .order("match_score", { ascending: false })
      .limit(20)
      .returns<RecommendedCandidateItem[]>(),
    supabase.from("applications").select("candidate_id").eq("job_id", jobId),
  ]);

  if (error) {
    console.error("getRecommendedCandidatesForJob failed", error);
    return [];
  }

  const appliedIds = new Set((applied ?? []).map((a) => a.candidate_id));
  return (data ?? []).filter((m) => !appliedIds.has(m.candidate_id));
}
