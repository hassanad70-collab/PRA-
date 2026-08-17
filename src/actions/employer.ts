"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateRecruiterPath } from "@/lib/revalidate-recruiter-path";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { generateJobDescriptionDraft } from "@/lib/ai/job-description-writer";
import { analyzeJobMatch } from "@/lib/ai/job-matcher";
import { getJobById } from "@/lib/queries/jobs";
import { getCandidateResumesForRecruiter } from "@/lib/recruiter/employer-queries";
import type { CompanyProfile } from "@/types/database";

// ----------------------------------------------------------------
// Auth helper
// ----------------------------------------------------------------

async function requireRecruiter() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthenticated");
  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) throw new Error("Not a recruiter");
  return { user, recruiter };
}

// ----------------------------------------------------------------
// Saved Candidates
// ----------------------------------------------------------------

export async function saveCandidateAction(candidateId: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("saved_candidates")
    .upsert({ recruiter_id: recruiter.id, candidate_id: candidateId }, { onConflict: "recruiter_id,candidate_id" });
  revalidateRecruiterPath("/saved-candidates");
  revalidateRecruiterPath("/candidate-search");
}

export async function unsaveCandidateAction(candidateId: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("saved_candidates")
    .delete()
    .eq("recruiter_id", recruiter.id)
    .eq("candidate_id", candidateId);
  revalidateRecruiterPath("/saved-candidates");
  revalidateRecruiterPath("/candidate-search");
}

export async function updateSavedCandidateNotesAction(candidateId: string, notes: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("saved_candidates")
    .update({ notes })
    .eq("recruiter_id", recruiter.id)
    .eq("candidate_id", candidateId);
  revalidateRecruiterPath("/saved-candidates");
}

// ----------------------------------------------------------------
// Company Profile
// ----------------------------------------------------------------

export async function upsertCompanyProfileAction(data: Partial<CompanyProfile>) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase.from("company_profiles").upsert(
    {
      company_id: recruiter.company_id,
      about: data.about,
      culture: data.culture,
      banner_url: data.banner_url,
      website: data.website,
      headquarters: data.headquarters,
      company_size: data.company_size,
      founded_year: data.founded_year,
      benefits: data.benefits ?? [],
      social_links: data.social_links ?? {},
      tech_stack: data.tech_stack ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );
  revalidateRecruiterPath("/company-profile");
}

export async function publishCompanyProfileAction(isPublished: boolean) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("company_profiles")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("company_id", recruiter.company_id);
  revalidateRecruiterPath("/company-profile");
}

// ----------------------------------------------------------------
// AI Job Description Generator
// ----------------------------------------------------------------

export async function generateJobDescriptionAction(input: {
  title: string;
  department?: string;
  employmentType: string;
  experienceLevel: string;
  keyPoints: string;
}) {
  await requireRecruiter();
  return generateJobDescriptionDraft(input);
}

// ----------------------------------------------------------------
// AI Candidate Matching — run a fresh match for a specific job+candidate
// ----------------------------------------------------------------

export async function runCandidateMatchAction(jobId: string, candidateId: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();

  const job = await getJobById(jobId);
  if (!job || job.company_id !== recruiter.company_id) throw new Error("Job not found");

  // Fetch candidate's primary resume parsed data
  const resumes = await getCandidateResumesForRecruiter(candidateId);
  const primaryResume = resumes[0];
  if (!primaryResume?.parsed_data) {
    return { error: "No parsed resume available for this candidate." };
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("years_of_experience")
    .eq("id", candidateId)
    .single();

  const result = await analyzeJobMatch(job, primaryResume.parsed_data as Parameters<typeof analyzeJobMatch>[1], candidate?.years_of_experience ?? 0);

  // Upsert into job_matches
  await supabase.from("job_matches").upsert(
    {
      job_id: jobId,
      candidate_id: candidateId,
      match_score: result.match_score,
      ai_summary: result.ai_summary,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      missing_skills: result.missing_skills,
      interview_probability: result.interview_probability,
    },
    { onConflict: "job_id,candidate_id" }
  );

  revalidateRecruiterPath(`/jobs/${jobId}/matches`);
  return { result };
}

// ----------------------------------------------------------------
// Talent Pool — add / remove / update stage
// ----------------------------------------------------------------

export async function addToTalentPoolAction(candidateId: string, notes?: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase.from("talent_pool").upsert(
    {
      company_id: recruiter.company_id,
      recruiter_id: recruiter.id,
      candidate_id: candidateId,
      notes: notes ?? null,
      is_favorite: false,
      tags: [],
    },
    { onConflict: "company_id,candidate_id" }
  );
  revalidateRecruiterPath("/talent-pool");
}

export async function removeFromTalentPoolAction(entryId: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("talent_pool")
    .delete()
    .eq("id", entryId)
    .eq("company_id", recruiter.company_id);
  revalidateRecruiterPath("/talent-pool");
}

export async function toggleTalentPoolFavoriteAction(entryId: string, isFavorite: boolean) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("talent_pool")
    .update({ is_favorite: isFavorite })
    .eq("id", entryId)
    .eq("company_id", recruiter.company_id);
  revalidateRecruiterPath("/talent-pool");
}

// ----------------------------------------------------------------
// Recruiter Candidate Labels
// ----------------------------------------------------------------

export async function labelCandidateAction(candidateId: string, label: string, color: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase.from("recruiter_candidate_labels").upsert(
    { recruiter_id: recruiter.id, candidate_id: candidateId, label, color },
    { onConflict: "recruiter_id,candidate_id,label" }
  );
}

export async function removeCandidateLabelAction(labelId: string) {
  const { recruiter } = await requireRecruiter();
  const supabase = await createClient();
  await supabase
    .from("recruiter_candidate_labels")
    .delete()
    .eq("id", labelId)
    .eq("recruiter_id", recruiter.id);
}
