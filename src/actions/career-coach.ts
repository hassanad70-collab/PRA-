"use server";

import { revalidateCandidatePath } from "@/lib/revalidate-candidate-path";
import { rateLimitByIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import {
  generateCareerAssessment,
  generateCareerRoadmap,
  generateWeeklyActions,
  generateCheckinResponse,
} from "@/lib/ai/career-coach";
import {
  getActiveGoal,
  getGoalById,
  getGoals,
  insertGoal,
  updateGoal,
  setGoalStatus,
  getLatestAssessment,
  insertAssessment,
  getRoadmapByGoal,
  upsertRoadmap,
  getActions,
  getPendingActions,
  getActionStats,
  insertActions,
  updateActionStatus,
  getCheckins,
  insertCheckin,
  updateCheckinAiResponse,
  insertProgressSnapshot,
  getProgressHistory,
  getLatestProgressSnapshot,
} from "@/lib/queries/career-coach";
import { computeProgress } from "@/lib/coach/progress";
import type {
  CareerGoal,
  CareerAssessment,
  CareerRoadmap,
  CareerAction,
  CareerCheckin,
  CareerProgressSnapshot,
  GoalStatus,
  ActionStatus,
  CheckinMood,
  CoachOverview,
  CareerProgressResult,
} from "@/types/career-coach";

export interface CoachActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

// ─── Goal actions ─────────────────────────────────────────────────────────────

export async function createCareerGoalAction(input: {
  title: string;
  target_role: string;
  current_role?: string | null;
  target_date?: string | null;
  notes?: string | null;
}): Promise<CoachActionResult<CareerGoal>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("career-goal-create", 10, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const goal = await insertGoal(user.id, input);
  if (!goal) return { success: false, error: "Failed to create career goal." };

  revalidateCandidatePath("/candidate/workspace/coach");
  revalidateCandidatePath("/candidate/dashboard");
  return { success: true, data: goal };
}

export async function updateCareerGoalAction(
  goalId: string,
  input: Partial<{
    title: string;
    target_role: string;
    current_role: string | null;
    target_date: string | null;
    notes: string | null;
  }>
): Promise<CoachActionResult<CareerGoal>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const goal = await updateGoal(user.id, goalId, input);
  if (!goal) return { success: false, error: "Failed to update career goal." };

  revalidateCandidatePath("/candidate/workspace/coach");
  return { success: true, data: goal };
}

export async function setGoalStatusAction(
  goalId: string,
  status: GoalStatus
): Promise<CoachActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const ok = await setGoalStatus(user.id, goalId, status);
  if (!ok) return { success: false, error: "Failed to update goal status." };

  revalidateCandidatePath("/candidate/workspace/coach");
  revalidateCandidatePath("/candidate/dashboard");
  return { success: true };
}

// ─── Assessment action ────────────────────────────────────────────────────────

export async function triggerCareerAssessmentAction(
  goalId: string
): Promise<CoachActionResult<CareerAssessment>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("career-assessment", 3, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const supabase = await createClient();

  // Verify goal belongs to this user
  const goal = await getGoalById(user.id, goalId);
  if (!goal) return { success: false, error: "Career goal not found." };

  // Fetch all profile data in parallel
  const [
    { data: profile },
    { data: candidate },
    { data: skills },
    { data: experience },
    { data: education },
    { data: atsRow },
    { data: matchRows },
    workspaceResume,
    prevAssessment,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase
      .from("candidates")
      .select("current_position, years_of_experience, headline, location, city, country")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("candidate_skills")
      .select("skill_name, proficiency")
      .eq("candidate_id", user.id)
      .limit(30),
    supabase
      .from("candidate_experience")
      .select("job_title, company_name, description, start_date, end_date, is_current")
      .eq("candidate_id", user.id)
      .order("start_date", { ascending: false })
      .limit(6),
    supabase
      .from("candidate_education")
      .select("institution, degree, field_of_study")
      .eq("candidate_id", user.id)
      .limit(4),
    supabase
      .from("ats_scores")
      .select("overall_score")
      .eq("candidate_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_matches")
      .select("missing_skills")
      .eq("candidate_id", user.id)
      .not("missing_skills", "is", null)
      .limit(20),
    getWorkspaceResume(user.id),
    getLatestAssessment(user.id, goalId),
  ]);

  // Aggregate missing skills by frequency
  const skillFreq: Record<string, number> = {};
  for (const row of matchRows ?? []) {
    for (const sk of (row.missing_skills as string[]) ?? []) {
      const key = sk.trim().toLowerCase();
      if (key) skillFreq[key] = (skillFreq[key] ?? 0) + 1;
    }
  }
  const missingSkills = Object.entries(skillFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([s]) => s);

  const prevSummary = prevAssessment
    ? `Strengths: ${prevAssessment.strengths.slice(0, 3).join(", ")}. Key gaps: ${prevAssessment.skill_gaps.slice(0, 3).map((g) => g.skill).join(", ")}.`
    : null;

  const aiResult = await generateCareerAssessment({
    profile: {
      full_name: profile?.full_name ?? "Candidate",
      current_position: candidate?.current_position ?? null,
      years_of_experience: candidate?.years_of_experience ?? 0,
      headline: candidate?.headline ?? null,
      location: candidate?.location ?? candidate?.city ?? null,
    },
    resume_text: workspaceResume?.raw_text ?? null,
    skills: (skills ?? []) as Array<{ skill_name: string; proficiency: string }>,
    experience: (experience ?? []) as Array<{
      job_title: string;
      company_name: string;
      description: string | null;
      start_date: string | null;
      end_date: string | null;
      is_current: boolean;
    }>,
    education: (education ?? []) as Array<{
      institution: string;
      degree: string | null;
      field_of_study: string | null;
    }>,
    ats_score: atsRow?.overall_score ?? null,
    missing_skills: missingSkills,
    previous_report_summary: prevSummary,
    target_role: goal.target_role,
  });

  if (!aiResult) return { success: false, error: "AI assessment generation failed. Please try again." };

  const saved = await insertAssessment(user.id, {
    goal_id: goalId,
    strengths: aiResult.strengths,
    weaknesses: aiResult.weaknesses,
    opportunities: aiResult.opportunities,
    skill_gaps: aiResult.skill_gaps,
    experience_gaps: aiResult.experience_gaps,
    leadership_gaps: aiResult.leadership_gaps,
    suggested_roles: aiResult.suggested_roles,
    raw_data: { summary: aiResult.summary },
  });

  if (!saved) return { success: false, error: "Failed to save career assessment." };

  revalidateCandidatePath("/candidate/workspace/coach");
  return { success: true, data: saved };
}

// ─── Roadmap action ───────────────────────────────────────────────────────────

export async function generateCareerRoadmapAction(
  goalId: string
): Promise<CoachActionResult<CareerRoadmap>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("career-roadmap", 3, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const supabase = await createClient();

  const [goal, assessment, candidate] = await Promise.all([
    getGoalById(user.id, goalId),
    getLatestAssessment(user.id, goalId),
    supabase
      .from("candidates")
      .select("years_of_experience")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!goal) return { success: false, error: "Career goal not found." };
  if (!assessment) return { success: false, error: "Complete a career assessment before generating a roadmap." };

  const aiResult = await generateCareerRoadmap({
    goal: {
      title: goal.title,
      target_role: goal.target_role,
      current_role: goal.current_role,
      target_date: goal.target_date,
    },
    assessment_summary: {
      top_skill_gaps: assessment.skill_gaps.slice(0, 6).map((g) => g.skill),
      top_experience_gaps: assessment.experience_gaps.slice(0, 3).map((g) => g.area),
      strengths: assessment.strengths.slice(0, 4),
    },
    years_of_experience: candidate.data?.years_of_experience ?? 0,
  });

  if (!aiResult) return { success: false, error: "Roadmap generation failed. Please try again." };

  const saved = await upsertRoadmap(user.id, goalId, aiResult.phases);
  if (!saved) return { success: false, error: "Failed to save career roadmap." };

  revalidateCandidatePath("/candidate/workspace/coach");
  return { success: true, data: saved };
}

// ─── Weekly actions ───────────────────────────────────────────────────────────

export async function generateWeeklyActionsAction(
  goalId: string,
  weekNumber: number
): Promise<CoachActionResult<CareerAction[]>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("career-weekly-actions", 5, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const [goal, roadmap, assessment, recentActions] = await Promise.all([
    getGoalById(user.id, goalId),
    getRoadmapByGoal(user.id, goalId),
    getLatestAssessment(user.id, goalId),
    getActions(user.id, goalId),
  ]);

  if (!goal) return { success: false, error: "Career goal not found." };

  // Determine current phase from week number + roadmap
  let currentPhase = null;
  if (roadmap?.phases?.length) {
    let cursor = 0;
    for (const phase of roadmap.phases) {
      const weeks = Math.max(1, Math.round(phase.duration_months * 4));
      if (weekNumber <= cursor + weeks) {
        currentPhase = phase;
        break;
      }
      cursor += weeks;
    }
    if (!currentPhase) currentPhase = roadmap.phases[roadmap.phases.length - 1];
  }

  const aiResult = await generateWeeklyActions({
    goal: {
      target_role: goal.target_role,
      current_role: goal.current_role,
      target_date: goal.target_date,
    },
    current_phase: currentPhase,
    top_gaps: (assessment?.skill_gaps ?? []).slice(0, 6),
    recent_actions: recentActions.slice(0, 10).map((a) => ({
      title: a.title,
      action_type: a.action_type,
      status: a.status,
    })),
    week_number: weekNumber,
  });

  if (!aiResult) return { success: false, error: "Failed to generate weekly actions. Please try again." };

  const today = new Date();
  const inserted = await insertActions(
    user.id,
    aiResult.actions.map((a) => {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + a.suggested_due_date_days);
      return {
        goal_id: goalId,
        roadmap_id: roadmap?.id ?? null,
        title: a.title,
        description: a.description,
        action_type: a.action_type,
        due_date: dueDate.toISOString().split("T")[0],
        week_number: weekNumber,
        source: "ai" as const,
      };
    })
  );

  revalidateCandidatePath("/candidate/workspace/coach");
  return { success: true, data: inserted };
}

// ─── Action status update ─────────────────────────────────────────────────────

export async function updateActionStatusAction(
  actionId: string,
  status: ActionStatus
): Promise<CoachActionResult<CareerAction>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const updated = await updateActionStatus(user.id, actionId, status);
  if (!updated) return { success: false, error: "Failed to update action status." };

  revalidateCandidatePath("/candidate/workspace/coach");
  return { success: true, data: updated };
}

// ─── Check-in action ──────────────────────────────────────────────────────────

export async function submitCheckinAction(
  goalId: string,
  input: {
    accomplished: string | null;
    blockers: string | null;
    changes: string | null;
    support_needed: string | null;
    mood: CheckinMood;
  }
): Promise<CoachActionResult<CareerCheckin>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("career-checkin", 5, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const [goal, checkin] = await Promise.all([
    getGoalById(user.id, goalId),
    insertCheckin(user.id, { goal_id: goalId, ...input }),
  ]);

  if (!goal) return { success: false, error: "Career goal not found." };
  if (!checkin) return { success: false, error: "Failed to save check-in." };

  // Fetch context for AI response (fire after checkin is saved)
  const [assessment, actionStats, recentCheckins] = await Promise.all([
    getLatestAssessment(user.id, goalId),
    getActionStats(user.id, goalId),
    getCheckins(user.id, goalId, 5),
  ]);

  const aiResponse = await generateCheckinResponse({
    goal: {
      title: goal.title,
      target_role: goal.target_role,
      target_date: goal.target_date,
    },
    checkin: input,
    assessment_summary: assessment
      ? {
          top_skill_gaps: assessment.skill_gaps.slice(0, 4).map((g) => g.skill),
          strengths: assessment.strengths.slice(0, 3),
        }
      : null,
    recent_checkins: recentCheckins
      .filter((c) => c.id !== checkin.id)
      .slice(0, 4)
      .map((c) => ({
        mood: c.mood,
        summary_note: c.ai_response?.summary ?? c.accomplished ?? "(no note)",
      })),
    actions_progress: {
      completed: actionStats.completed,
      total: actionStats.total,
    },
  });

  if (aiResponse) {
    await updateCheckinAiResponse(user.id, checkin.id, aiResponse);
    revalidateCandidatePath("/candidate/workspace/coach");
    return { success: true, data: { ...checkin, ai_response: aiResponse } };
  }

  revalidateCandidatePath("/candidate/workspace/coach");
  return { success: true, data: checkin };
}

// ─── Progress snapshot ────────────────────────────────────────────────────────

export async function saveProgressSnapshotAction(
  goalId: string
): Promise<CoachActionResult<CareerProgressSnapshot>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const [assessment, roadmap, actions, checkins] = await Promise.all([
    getLatestAssessment(user.id, goalId),
    getRoadmapByGoal(user.id, goalId),
    getActions(user.id, goalId),
    getCheckins(user.id, goalId, 99),
  ]);

  const progress = computeProgress({
    actions,
    checkinCount: checkins.length,
    phases: roadmap?.phases ?? [],
    hasAssessment: !!assessment,
    hasRoadmap: !!roadmap,
  });

  const snapshot = await insertProgressSnapshot(user.id, {
    goal_id: goalId,
    score: progress.score,
    actions_completed: progress.breakdown.actions_completed,
    actions_total: progress.breakdown.actions_total,
    checkin_count: progress.breakdown.checkin_count,
    has_assessment: progress.readiness.has_assessment,
    has_roadmap: progress.readiness.has_roadmap,
    breakdown: progress.breakdown,
    snapshot_date: new Date().toISOString().split("T")[0],
  });

  if (!snapshot) return { success: false, error: "Failed to save progress snapshot." };
  return { success: true, data: snapshot };
}

// ─── Progress read (no snapshot saved) ───────────────────────────────────────

export async function getProgressAction(
  goalId: string
): Promise<CoachActionResult<CareerProgressResult>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const [assessment, roadmap, actions, checkins] = await Promise.all([
    getLatestAssessment(user.id, goalId),
    getRoadmapByGoal(user.id, goalId),
    getActions(user.id, goalId),
    getCheckins(user.id, goalId, 99),
  ]);

  const progress = computeProgress({
    actions,
    checkinCount: checkins.length,
    phases: roadmap?.phases ?? [],
    hasAssessment: !!assessment,
    hasRoadmap: !!roadmap,
  });

  return { success: true, data: progress };
}

// ─── Coach overview (aggregate read for dashboard) ────────────────────────────

export async function getCoachOverviewAction(): Promise<CoachActionResult<CoachOverview>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const goal = await getActiveGoal(user.id);

  if (!goal) {
    return {
      success: true,
      data: {
        active_goal: null,
        latest_assessment: null,
        roadmap: null,
        pending_actions: [],
        next_checkin_due: null,
        progress: null,
      },
    };
  }

  const [assessment, roadmap, pendingActions, actions, checkins] = await Promise.all([
    getLatestAssessment(user.id, goal.id),
    getRoadmapByGoal(user.id, goal.id),
    getPendingActions(user.id, goal.id),
    getActions(user.id, goal.id),
    getCheckins(user.id, goal.id, 99),
  ]);

  const progress = computeProgress({
    actions,
    checkinCount: checkins.length,
    phases: roadmap?.phases ?? [],
    hasAssessment: !!assessment,
    hasRoadmap: !!roadmap,
  });

  // Suggest next check-in as 7 days after the last one (or today if none)
  const lastCheckin = checkins[0];
  let nextCheckinDue: string | null = null;
  if (lastCheckin) {
    const d = new Date(lastCheckin.created_at);
    d.setDate(d.getDate() + 7);
    nextCheckinDue = d.toISOString().split("T")[0];
  } else {
    nextCheckinDue = new Date().toISOString().split("T")[0];
  }

  return {
    success: true,
    data: {
      active_goal: goal,
      latest_assessment: assessment,
      roadmap,
      pending_actions: pendingActions,
      next_checkin_due: nextCheckinDue,
      progress: { ...progress, readiness: { ...progress.readiness, has_goal: true } },
    },
  };
}

// ─── Re-exports for convenience ───────────────────────────────────────────────

export {
  getActiveGoal,
  getGoals,
  getGoalById,
  getLatestAssessment,
  getRoadmapByGoal,
  getActions,
  getPendingActions,
  getCheckins,
  getProgressHistory,
  getLatestProgressSnapshot,
};
