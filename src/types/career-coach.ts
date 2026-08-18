// Career Coach — domain types (mirrors supabase/migrations/0052_career_coach.sql)

export type GoalStatus = "active" | "paused" | "completed" | "abandoned";

export type ActionType =
  | "course"
  | "cv_update"
  | "linkedin"
  | "apply"
  | "interview_practice"
  | "skill"
  | "networking"
  | "experience"
  | "certification"
  | "other";

export type ActionStatus = "pending" | "in_progress" | "completed" | "skipped";

export type ActionSource = "ai" | "user";

export type CheckinMood = "great" | "good" | "neutral" | "struggling" | "off_track";

export type GapPriority = "high" | "medium" | "low";

// ─── DB row types ─────────────────────────────────────────────────────────────

export interface CareerGoal {
  id: string;
  user_id: string;
  title: string;
  target_role: string;
  current_role: string | null;
  target_date: string | null;
  status: GoalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillGap {
  skill: string;
  gap_level: GapPriority;
  priority: GapPriority;
  how_to_learn: string;
}

export interface ExperienceGap {
  area: string;
  description: string;
  severity: GapPriority;
}

export interface LeadershipGap {
  area: string;
  description: string;
}

export interface CareerAssessment {
  id: string;
  user_id: string;
  goal_id: string | null;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  skill_gaps: SkillGap[];
  experience_gaps: ExperienceGap[];
  leadership_gaps: LeadershipGap[];
  suggested_roles: string[];
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface RoadmapMilestone {
  title: string;
  description: string;
}

export interface RoadmapPhase {
  label: string;
  duration_months: number;
  focus: string;
  milestones: RoadmapMilestone[];
  action_themes: string[];
}

export interface CareerRoadmap {
  id: string;
  user_id: string;
  goal_id: string;
  phases: RoadmapPhase[];
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CareerAction {
  id: string;
  user_id: string;
  goal_id: string | null;
  roadmap_id: string | null;
  title: string;
  description: string | null;
  action_type: ActionType;
  status: ActionStatus;
  due_date: string | null;
  week_number: number | null;
  completed_at: string | null;
  source: ActionSource;
  created_at: string;
  updated_at: string;
}

export interface CheckinAiResponse {
  summary: string;
  updated_priorities: string[];
  encouragement: string;
  flag_for_reassessment: boolean;
  suggested_actions: Array<{ title: string; description: string }>;
}

export interface CareerCheckin {
  id: string;
  user_id: string;
  goal_id: string;
  accomplished: string | null;
  blockers: string | null;
  changes: string | null;
  support_needed: string | null;
  mood: CheckinMood;
  ai_response: CheckinAiResponse | null;
  created_at: string;
}

export interface ProgressBreakdown {
  actions_pts: number;
  consistency_pts: number;
  milestone_pts: number;
  breadth_pts: number;
  actions_completed: number;
  actions_total: number;
  checkin_count: number;
  milestones_crossed: number;
  total_milestones: number;
  distinct_types_completed: number;
}

export interface CareerProgressSnapshot {
  id: string;
  user_id: string;
  goal_id: string;
  score: number;
  actions_completed: number;
  actions_total: number;
  checkin_count: number;
  has_assessment: boolean;
  has_roadmap: boolean;
  breakdown: ProgressBreakdown;
  snapshot_date: string;
  created_at: string;
}

export interface CoachReadiness {
  has_goal: boolean;
  has_assessment: boolean;
  has_roadmap: boolean;
}

export interface CareerProgressResult {
  score: number;
  breakdown: ProgressBreakdown;
  readiness: CoachReadiness;
}

// ─── AI input types ───────────────────────────────────────────────────────────

export interface CoachAssessmentInput {
  profile: {
    full_name: string;
    current_position: string | null;
    years_of_experience: number;
    headline: string | null;
    location: string | null;
  };
  resume_text: string | null;
  skills: Array<{ skill_name: string; proficiency: string }>;
  experience: Array<{
    job_title: string;
    company_name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string | null;
    field_of_study: string | null;
  }>;
  ats_score: number | null;
  missing_skills: string[];
  previous_report_summary: string | null;
  target_role: string | null;
}

export interface CoachRoadmapInput {
  goal: {
    title: string;
    target_role: string;
    current_role: string | null;
    target_date: string | null;
  };
  assessment_summary: {
    top_skill_gaps: string[];
    top_experience_gaps: string[];
    strengths: string[];
  };
  years_of_experience: number;
}

export interface CoachActionsInput {
  goal: {
    target_role: string;
    current_role: string | null;
    target_date: string | null;
  };
  current_phase: RoadmapPhase | null;
  top_gaps: SkillGap[];
  recent_actions: Array<{ title: string; action_type: string; status: string }>;
  week_number: number;
}

export interface CoachCheckinInput {
  goal: {
    title: string;
    target_role: string;
    target_date: string | null;
  };
  checkin: {
    accomplished: string | null;
    blockers: string | null;
    changes: string | null;
    support_needed: string | null;
    mood: CheckinMood;
  };
  assessment_summary: {
    top_skill_gaps: string[];
    strengths: string[];
  } | null;
  recent_checkins: Array<{ mood: string; summary_note: string }>;
  actions_progress: {
    completed: number;
    total: number;
  };
}

// ─── Aggregated overview type (used by Overview page server component) ─────────

export interface CoachOverview {
  active_goal: CareerGoal | null;
  latest_assessment: CareerAssessment | null;
  roadmap: CareerRoadmap | null;
  pending_actions: CareerAction[];
  next_checkin_due: string | null;
  progress: CareerProgressResult | null;
}
