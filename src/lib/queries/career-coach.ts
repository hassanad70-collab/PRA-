import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CareerGoal,
  CareerAssessment,
  CareerRoadmap,
  CareerAction,
  CareerCheckin,
  CareerProgressSnapshot,
  GoalStatus,
  ActionStatus,
  ActionType,
  ActionSource,
  CheckinMood,
  CheckinAiResponse,
  RoadmapPhase,
  SkillGap,
  ExperienceGap,
  LeadershipGap,
  ProgressBreakdown,
} from "@/types/career-coach";

// ─── Goals ───────────────────────────────────────────────────────────────────

export async function getActiveGoal(userId: string): Promise<CareerGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_goals")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<CareerGoal[]>()
    .maybeSingle();
  return data ?? null;
}

export async function getGoalById(userId: string, goalId: string): Promise<CareerGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .returns<CareerGoal[]>()
    .maybeSingle();
  return data ?? null;
}

export async function getGoals(userId: string): Promise<CareerGoal[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<CareerGoal[]>();
  return data ?? [];
}

export async function insertGoal(
  userId: string,
  input: { title: string; target_role: string; current_role?: string | null; target_date?: string | null; notes?: string | null }
): Promise<CareerGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_goals")
    .insert({ user_id: userId, ...input })
    .select()
    .returns<CareerGoal[]>()
    .single();
  return data ?? null;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: Partial<{ title: string; target_role: string; current_role: string | null; target_date: string | null; notes: string | null; status: GoalStatus }>
): Promise<CareerGoal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_goals")
    .update(input)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select()
    .returns<CareerGoal[]>()
    .single();
  return data ?? null;
}

export async function setGoalStatus(userId: string, goalId: string, status: GoalStatus): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_goals")
    .update({ status })
    .eq("id", goalId)
    .eq("user_id", userId);
  return !error;
}

// ─── Assessments ─────────────────────────────────────────────────────────────

export async function getLatestAssessment(userId: string, goalId?: string): Promise<CareerAssessment | null> {
  const supabase = await createClient();
  let query = supabase
    .from("career_assessments")
    .select("*")
    .eq("user_id", userId);
  if (goalId) query = query.eq("goal_id", goalId);
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<CareerAssessment[]>()
    .maybeSingle();
  return data ?? null;
}

export async function insertAssessment(
  userId: string,
  input: {
    goal_id: string | null;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    skill_gaps: SkillGap[];
    experience_gaps: ExperienceGap[];
    leadership_gaps: LeadershipGap[];
    suggested_roles: string[];
    raw_data?: Record<string, unknown> | null;
  }
): Promise<CareerAssessment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_assessments")
    .insert({ user_id: userId, ...input })
    .select()
    .returns<CareerAssessment[]>()
    .single();
  return data ?? null;
}

// ─── Roadmaps ─────────────────────────────────────────────────────────────────

export async function getRoadmapByGoal(userId: string, goalId: string): Promise<CareerRoadmap | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_roadmaps")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .returns<CareerRoadmap[]>()
    .maybeSingle();
  return data ?? null;
}

export async function upsertRoadmap(
  userId: string,
  goalId: string,
  phases: RoadmapPhase[]
): Promise<CareerRoadmap | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_roadmaps")
    .upsert(
      { user_id: userId, goal_id: goalId, phases, generated_at: new Date().toISOString() },
      { onConflict: "goal_id" }
    )
    .select()
    .returns<CareerRoadmap[]>()
    .single();
  return data ?? null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function getActions(
  userId: string,
  goalId: string,
  status?: ActionStatus
): Promise<CareerAction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("career_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId);
  if (status) query = query.eq("status", status);
  const { data } = await query
    .order("created_at", { ascending: false })
    .returns<CareerAction[]>();
  return data ?? [];
}

export async function getPendingActions(userId: string, goalId: string): Promise<CareerAction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_actions")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .in("status", ["pending", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(20)
    .returns<CareerAction[]>();
  return data ?? [];
}

export async function getActionStats(
  userId: string,
  goalId: string
): Promise<{ completed: number; total: number; distinctTypes: string[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_actions")
    .select("status, action_type")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .returns<Array<{ status: string; action_type: string }>>();

  if (!data) return { completed: 0, total: 0, distinctTypes: [] };

  const completed = data.filter((a) => a.status === "completed");
  const distinctTypes = [...new Set(completed.map((a) => a.action_type))];
  return { completed: completed.length, total: data.length, distinctTypes };
}

export async function insertAction(
  userId: string,
  input: {
    goal_id: string | null;
    roadmap_id: string | null;
    title: string;
    description?: string | null;
    action_type: ActionType;
    due_date?: string | null;
    week_number?: number | null;
    source: ActionSource;
  }
): Promise<CareerAction | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_actions")
    .insert({ user_id: userId, ...input })
    .select()
    .returns<CareerAction[]>()
    .single();
  return data ?? null;
}

export async function insertActions(
  userId: string,
  inputs: Array<{
    goal_id: string | null;
    roadmap_id: string | null;
    title: string;
    description?: string | null;
    action_type: ActionType;
    due_date?: string | null;
    week_number?: number | null;
    source: ActionSource;
  }>
): Promise<CareerAction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_actions")
    .insert(inputs.map((i) => ({ user_id: userId, ...i })))
    .select()
    .returns<CareerAction[]>();
  return data ?? [];
}

export async function updateActionStatus(
  userId: string,
  actionId: string,
  status: ActionStatus
): Promise<CareerAction | null> {
  const supabase = await createClient();
  const completedAt = status === "completed" ? new Date().toISOString() : null;
  const { data } = await supabase
    .from("career_actions")
    .update({ status, completed_at: completedAt })
    .eq("id", actionId)
    .eq("user_id", userId)
    .select()
    .returns<CareerAction[]>()
    .single();
  return data ?? null;
}

// ─── Check-ins ────────────────────────────────────────────────────────────────

export async function getCheckins(userId: string, goalId: string, limit = 10): Promise<CareerCheckin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_checkins")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CareerCheckin[]>();
  return data ?? [];
}

export async function insertCheckin(
  userId: string,
  input: {
    goal_id: string;
    accomplished: string | null;
    blockers: string | null;
    changes: string | null;
    support_needed: string | null;
    mood: CheckinMood;
  }
): Promise<CareerCheckin | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_checkins")
    .insert({ user_id: userId, ...input })
    .select()
    .returns<CareerCheckin[]>()
    .single();
  return data ?? null;
}

export async function updateCheckinAiResponse(
  userId: string,
  checkinId: string,
  aiResponse: CheckinAiResponse
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_checkins")
    .update({ ai_response: aiResponse })
    .eq("id", checkinId)
    .eq("user_id", userId);
  return !error;
}

// ─── Progress Snapshots ───────────────────────────────────────────────────────

export async function insertProgressSnapshot(
  userId: string,
  input: {
    goal_id: string;
    score: number;
    actions_completed: number;
    actions_total: number;
    checkin_count: number;
    has_assessment: boolean;
    has_roadmap: boolean;
    breakdown: ProgressBreakdown;
    snapshot_date: string;
  }
): Promise<CareerProgressSnapshot | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_progress_snapshots")
    .insert({ user_id: userId, ...input })
    .select()
    .returns<CareerProgressSnapshot[]>()
    .single();
  return data ?? null;
}

export async function getProgressHistory(
  userId: string,
  goalId: string,
  limit = 30
): Promise<CareerProgressSnapshot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_progress_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("snapshot_date", { ascending: false })
    .limit(limit)
    .returns<CareerProgressSnapshot[]>();
  return data ?? [];
}

export async function getLatestProgressSnapshot(
  userId: string,
  goalId: string
): Promise<CareerProgressSnapshot | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("career_progress_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("goal_id", goalId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .returns<CareerProgressSnapshot[]>()
    .maybeSingle();
  return data ?? null;
}
