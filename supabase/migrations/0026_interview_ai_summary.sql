-- ============================================================================
-- Migration 0026: interviews.ai_summary (Recruiter Intelligence v2.0,
-- Phase 8 -- Interview Intelligence)
-- ============================================================================
--
-- Interview Intelligence's AI Summary condenses the feedback/star_evaluation/
-- competency_ratings a recruiter already entered (via the existing
-- submitInterviewFeedback flow) into a short recruiter-facing summary.
-- There's nowhere to persist this on the existing schema, so this is a
-- genuinely new column -- nullable, generated on demand (not automatically
-- on every feedback submission), matching the same on-demand pattern as
-- screening_results' Phase 2 insight fields (migration 0022).

alter table public.interviews add column ai_summary text;
