-- ============================================================================
-- Migration 0022: AI Candidate Insight fields (Recruiter Intelligence v2.0,
-- Phase 2)
-- ============================================================================
--
-- The AI Insight panel's Strengths/Missing Skills/Experience Summary/ATS
-- Explanation/Recommendation are all already computed and stored on
-- job_matches and ats_scores -- rendered directly, not regenerated. The
-- fields below are the genuinely new ones (risk assessment, hiring
-- confidence, interview prep) with nowhere to already live, added to
-- screening_results rather than a new table since it's already the
-- one-row-per-application AI-screening artifact this panel is largely
-- displaying (interview_recommendation, competency scores). Nullable and
-- populated on demand (see generateCandidateInsight), not backfilled for
-- existing rows.

alter table public.screening_results
  add column risks text[],
  add column red_flags text[],
  add column hiring_confidence_score int check (hiring_confidence_score between 0 and 100),
  add column suggested_interview_focus text,
  add column suggested_questions text[],
  add column insight_generated_at timestamptz;
