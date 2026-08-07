import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CandidateSearchResult,
  CompanyProfile,
  JobMatchWithCandidate,
  SavedCandidateWithProfile,
} from "@/types/database";

// ----------------------------------------------------------------
// Saved Candidates
// ----------------------------------------------------------------

export async function getSavedCandidates(recruiterId: string): Promise<SavedCandidateWithProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_candidates")
    .select("*, candidate:candidates(*, profile:profiles(id, full_name, email))")
    .eq("recruiter_id", recruiterId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<SavedCandidateWithProfile[]>();
  return data ?? [];
}

export async function isCandidateSaved(recruiterId: string, candidateId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_candidates")
    .select("id")
    .eq("recruiter_id", recruiterId)
    .eq("candidate_id", candidateId)
    .single();
  return !!data;
}

// ----------------------------------------------------------------
// Company Profile
// ----------------------------------------------------------------

export async function getCompanyProfile(companyId: string): Promise<CompanyProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_profiles")
    .select("*")
    .eq("company_id", companyId)
    .single();
  return (data as CompanyProfile | null) ?? null;
}

// ----------------------------------------------------------------
// Candidate Search
// ----------------------------------------------------------------

export async function searchCandidates(
  companyId: string,
  recruiterId: string,
  opts: {
    query?: string;
    location?: string;
    openToWork?: boolean;
    minYears?: number;
    maxYears?: number;
    limit?: number;
  }
): Promise<CandidateSearchResult[]> {
  const supabase = await createClient();

  // Candidates visible to this recruiter: applied to their jobs OR open_to_work
  let q = supabase
    .from("candidates")
    .select(
      `id, current_position, current_company, years_of_experience, location, is_open_to_work,
       profile:profiles!inner(id, full_name, email),
       skills:candidate_skills(skill_name)`
    )
    .eq("profile.role", "candidate");

  if (opts.openToWork) q = q.eq("is_open_to_work", true);
  if (opts.location) q = q.ilike("location", `%${opts.location}%`);
  if (opts.minYears != null) q = q.gte("years_of_experience", opts.minYears);
  if (opts.maxYears != null) q = q.lte("years_of_experience", opts.maxYears);
  if (opts.query) {
    q = q.or(
      `current_position.ilike.%${opts.query}%,current_company.ilike.%${opts.query}%`
    );
  }

  const { data: rows } = await q.limit(opts.limit ?? 100);

  if (!rows?.length) return [];

  // Fetch saved state for these candidates
  const candidateIds = rows.map((r) => r.id);
  const { data: saved } = await supabase
    .from("saved_candidates")
    .select("candidate_id")
    .eq("recruiter_id", recruiterId)
    .in("candidate_id", candidateIds);

  const savedSet = new Set((saved ?? []).map((s) => s.candidate_id));

  // Fetch labels
  const { data: labels } = await supabase
    .from("recruiter_candidate_labels")
    .select("*")
    .eq("recruiter_id", recruiterId)
    .in("candidate_id", candidateIds);

  const labelMap = new Map<string, typeof labels>();
  (labels ?? []).forEach((l) => {
    if (!labelMap.has(l.candidate_id)) labelMap.set(l.candidate_id, []);
    labelMap.get(l.candidate_id)!.push(l);
  });

  return rows.map((row) => ({
    id: row.id,
    profile: (Array.isArray(row.profile) ? row.profile[0] : row.profile) as CandidateSearchResult["profile"],
    current_position: row.current_position,
    current_company: row.current_company,
    years_of_experience: row.years_of_experience,
    location: row.location,
    is_open_to_work: row.is_open_to_work,
    skills: ((row.skills ?? []) as Array<{ skill_name: string }>).map((s) => s.skill_name),
    saved: savedSet.has(row.id),
    labels: (labelMap.get(row.id) ?? []) as CandidateSearchResult["labels"],
  }));
}

// ----------------------------------------------------------------
// AI Candidate Matching per job
// ----------------------------------------------------------------

export async function getJobMatches(jobId: string, limit = 50): Promise<JobMatchWithCandidate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_matches")
    .select(
      `id, job_id, candidate_id, match_score, ai_summary, strengths, weaknesses, missing_skills, interview_probability, created_at,
       candidate:candidates(*, profile:profiles(id, full_name, email))`
    )
    .eq("job_id", jobId)
    .order("match_score", { ascending: false })
    .limit(limit)
    .returns<JobMatchWithCandidate[]>();
  return data ?? [];
}

// ----------------------------------------------------------------
// Talent Pool (enhanced)
// ----------------------------------------------------------------

export async function getTalentPoolWithFilters(
  companyId: string,
  opts: { query?: string; isFavorite?: boolean; limit?: number }
) {
  const supabase = await createClient();
  let q = supabase
    .from("talent_pool")
    .select("*, candidate:candidates(*, profile:profiles(id, full_name, email))")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (opts.isFavorite) q = q.eq("is_favorite", true);

  const { data } = await q.limit(opts.limit ?? 200);

  let rows = data ?? [];

  if (opts.query) {
    const q2 = opts.query.toLowerCase();
    rows = rows.filter((r) => {
      const name: string = (r.candidate?.profile?.full_name ?? "").toLowerCase();
      const pos: string = (r.candidate?.current_position ?? "").toLowerCase();
      return name.includes(q2) || pos.includes(q2);
    });
  }

  return rows;
}

// ----------------------------------------------------------------
// Hiring Team — recruiters with their assigned job count
// ----------------------------------------------------------------

export async function getHiringTeamOverview(companyId: string) {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("recruiters")
    .select("id, role, job_title, department, created_at, profile:profiles(id, full_name, email)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (!members?.length) return [];

  // Count active jobs per recruiter
  const recruiterIds = members.map((m) => m.id);
  const { data: jobCounts } = await supabase
    .from("jobs")
    .select("recruiter_id")
    .eq("company_id", companyId)
    .eq("status", "published")
    .in("recruiter_id", recruiterIds);

  const countMap = new Map<string, number>();
  (jobCounts ?? []).forEach((j) => {
    if (j.recruiter_id) countMap.set(j.recruiter_id, (countMap.get(j.recruiter_id) ?? 0) + 1);
  });

  return members.map((m) => ({
    ...m,
    active_jobs: countMap.get(m.id) ?? 0,
  }));
}

// ----------------------------------------------------------------
// Resume Intelligence — resumes for a candidate with ATS scores
// ----------------------------------------------------------------

export async function getCandidateResumesForRecruiter(candidateId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("id, file_name, created_at, parse_status, parsed_data, candidate_id, ats_scores(score, feedback, keyword_matches, keyword_gaps)")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}
