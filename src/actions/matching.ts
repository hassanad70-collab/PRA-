"use server";

import { analyzeJobMatch } from "@/lib/ai/job-matcher";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Job, ParsedResumeData } from "@/types/database";

const MAX_MATCHES_PER_RUN = 15;

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
  const { data: jobs } = await admin.from("jobs").select("*").in("id", jobIds);
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

  const { data: job } = await admin.from("jobs").select("*").eq("id", jobId).single();
  if (!job?.embedding) return;

  const { data: shortlist, error } = await admin.rpc("match_candidates_for_job", {
    p_job_embedding: job.embedding,
    p_match_count: MAX_MATCHES_PER_RUN,
    p_min_similarity: 0.3,
  });

  if (error || !shortlist?.length) return;

  await Promise.allSettled(
    shortlist.map(async (s: { candidate_id: string; resume_id: string; similarity: number }) => {
      const { data: resume } = await admin
        .from("resumes")
        .select("parsed_data")
        .eq("id", s.resume_id)
        .single();
      const { data: candidateRow } = await admin
        .from("candidates")
        .select("years_of_experience")
        .eq("id", s.candidate_id)
        .single();

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
