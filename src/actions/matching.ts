"use server";

import { analyzeJobMatch } from "@/lib/ai/job-matcher";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Job, ParsedResumeData } from "@/types/database";

const MAX_MATCHES_PER_RUN = 15;

// Both `jobs` selects below list every column except `embedding` (a
// vector(1536) never read by analyzeJobMatch) as an inline literal, not a
// shared constant -- supabase-js infers a query's result type by parsing
// its select string as a TypeScript literal type, and referencing a
// separately-declared const (even in the same file) collapses that to
// `any`/wrong join cardinality instead. If this column list needs to
// change, update it in both places here and in src/lib/queries/jobs.ts's
// getJobById.

/**
 * Matches a single resume against every published job using vector
 * similarity (pgvector) to shortlist candidates, then runs a deep AI
 * analysis on the top matches to produce explainable scores.
 */
export async function generateMatchesForResume(resumeId: string, candidateId: string) {
  const admin = createAdminClient();

  const { data: resume } = await admin
    .from("resumes")
    .select("embedding, parsed_data")
    .eq("id", resumeId)
    .single();

  if (!resume?.embedding || !resume.parsed_data) return;

  const { data: candidateRow } = await admin
    .from("candidates")
    .select("years_of_experience")
    .eq("id", candidateId)
    .single();

  const { data: shortlist, error } = await admin.rpc("match_jobs_for_resume", {
    p_resume_embedding: resume.embedding,
    p_match_count: MAX_MATCHES_PER_RUN,
    p_min_similarity: 0.35,
  });

  if (error || !shortlist?.length) return;

  const jobIds = shortlist.map((s: { job_id: string }) => s.job_id);
  const { data: jobs } = await admin
    .from("jobs")
    .select(
      "id, company_id, recruiter_id, title, slug, department, description, responsibilities, requirements, benefits, employment_type, experience_level, min_experience_years, education_requirement, required_skills, nice_to_have_skills, location, is_remote, salary_min, salary_max, salary_currency, headcount, status, is_archived, duplicated_from, views_count, applications_count, published_at, closes_at, created_at, updated_at"
    )
    .in("id", jobIds);
  if (!jobs?.length) return;

  const parsed = resume.parsed_data as ParsedResumeData;
  const yearsOfExperience = candidateRow?.years_of_experience ?? parsed.years_of_experience ?? 0;

  await Promise.allSettled(
    jobs.map(async (job: Job) => {
      const similarity = shortlist.find((s: { job_id: string }) => s.job_id === job.id)?.similarity ?? 0;
      try {
        const analysis = await analyzeJobMatch(job, parsed, yearsOfExperience);
        await admin.from("job_matches").upsert(
          {
            job_id: job.id,
            candidate_id: candidateId,
            resume_id: resumeId,
            match_score: analysis.match_score,
            semantic_similarity: similarity,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            missing_skills: analysis.missing_skills,
            recommended_skills: analysis.recommended_skills,
            match_reasons: analysis.match_reasons,
            interview_probability: analysis.interview_probability,
            ai_summary: analysis.ai_summary,
            ai_model: "gpt-4o-mini",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "job_id,candidate_id" }
        );
      } catch {
        // Skip this job's match on AI failure; other matches still complete.
      }
    })
  );
}

/**
 * Matches a single job against the best-fit candidates in the talent pool
 * using vector similarity, then runs deep AI analysis on the shortlist.
 * Called when a job is published.
 */
export async function generateMatchesForJob(jobId: string) {
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("jobs")
    .select(
      "id, company_id, recruiter_id, title, slug, department, description, responsibilities, requirements, benefits, employment_type, experience_level, min_experience_years, education_requirement, required_skills, nice_to_have_skills, location, is_remote, salary_min, salary_max, salary_currency, headcount, status, is_archived, duplicated_from, views_count, applications_count, published_at, closes_at, created_at, updated_at, embedding"
    )
    .eq("id", jobId)
    .single();
  if (!job?.embedding) return;

  const { data: shortlist, error } = await admin.rpc("match_candidates_for_job", {
    p_job_embedding: job.embedding,
    p_match_count: MAX_MATCHES_PER_RUN,
    p_min_similarity: 0.3,
  });

  if (error || !shortlist?.length) return;

  // Batched instead of one pair of queries per shortlist candidate (up to
  // MAX_MATCHES_PER_RUN=15 candidates -- was up to 30 round trips per run).
  const resumeIds = shortlist.map((s: { resume_id: string }) => s.resume_id);
  const candidateIds = shortlist.map((s: { candidate_id: string }) => s.candidate_id);
  const [{ data: resumes }, { data: candidateRows }] = await Promise.all([
    admin.from("resumes").select("id, parsed_data").in("id", resumeIds),
    admin.from("candidates").select("id, years_of_experience").in("id", candidateIds),
  ]);
  const resumeById = new Map((resumes ?? []).map((r) => [r.id, r]));
  const candidateById = new Map((candidateRows ?? []).map((c) => [c.id, c]));

  await Promise.allSettled(
    shortlist.map(async (s: { candidate_id: string; resume_id: string; similarity: number }) => {
      const resume = resumeById.get(s.resume_id);
      const candidateRow = candidateById.get(s.candidate_id);

      if (!resume?.parsed_data) return;
      const parsed = resume.parsed_data as ParsedResumeData;

      try {
        const analysis = await analyzeJobMatch(job as Job, parsed, candidateRow?.years_of_experience ?? 0);
        await admin.from("job_matches").upsert(
          {
            job_id: job.id,
            candidate_id: s.candidate_id,
            resume_id: s.resume_id,
            match_score: analysis.match_score,
            semantic_similarity: s.similarity,
            strengths: analysis.strengths,
            weaknesses: analysis.weaknesses,
            missing_skills: analysis.missing_skills,
            recommended_skills: analysis.recommended_skills,
            match_reasons: analysis.match_reasons,
            interview_probability: analysis.interview_probability,
            ai_summary: analysis.ai_summary,
            ai_model: "gpt-4o-mini",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "job_id,candidate_id" }
        );
      } catch {
        // Skip on AI failure.
      }
    })
  );
}
