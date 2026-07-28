import type { ApplicationStatus, HiringRecommendation } from "@/types/database";

export type SuggestedAction =
  | "schedule_interview"
  | "await_interview_feedback"
  | "awaiting_response"
  | "review_or_reject"
  | "review_profile"
  | "no_action_needed";

const TERMINAL_STATUSES: ApplicationStatus[] = ["hired", "rejected", "withdrawn"];

/**
 * AI Shortlisting (Recruiter Intelligence v2.0, Phase 4) deliberately makes
 * zero new AI calls -- ranking, reasoning, pros/cons, and missing skills all
 * already exist on screening_results (rank_position, overall_score,
 * interview_recommendation) and job_matches (strengths, weaknesses,
 * missing_skills, ai_summary), rendered directly. "Suggested Next Action" is
 * the one genuinely new field this phase adds, and it's derived
 * deterministically from data that already exists rather than asked of an
 * LLM, since it's a straightforward mapping from pipeline stage + existing
 * AI recommendation.
 */
export function suggestNextAction(
  status: ApplicationStatus,
  interviewRecommendation: HiringRecommendation | null | undefined
): SuggestedAction {
  if (TERMINAL_STATUSES.includes(status)) return "no_action_needed";
  if (status === "offer") return "awaiting_response";
  if (status === "interview") return "await_interview_feedback";

  if (interviewRecommendation === "strong_yes" || interviewRecommendation === "yes") return "schedule_interview";
  if (interviewRecommendation === "no" || interviewRecommendation === "strong_no") return "review_or_reject";
  return "review_profile";
}
