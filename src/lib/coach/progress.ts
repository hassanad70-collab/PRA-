import type {
  RoadmapPhase,
  CareerAction,
  ProgressBreakdown,
  CareerProgressResult,
  CoachReadiness,
} from "@/types/career-coach";

// Breadth action types that count toward the diversity score (excludes "other")
const BREADTH_TYPES = new Set([
  "course",
  "cv_update",
  "linkedin",
  "apply",
  "interview_practice",
  "skill",
  "networking",
  "experience",
  "certification",
]);
const BREADTH_TOTAL = 9;
const CHECKIN_CAP = 12;

// ─── Milestone helper ─────────────────────────────────────────────────────────

interface PhaseWeekRange {
  start: number;
  end: number;
  milestoneCount: number;
}

function buildPhaseWeekRanges(phases: RoadmapPhase[]): PhaseWeekRange[] {
  let cursor = 1;
  return phases.map((phase) => {
    const weeks = Math.max(1, Math.round(phase.duration_months * 4));
    const range: PhaseWeekRange = {
      start: cursor,
      end: cursor + weeks - 1,
      milestoneCount: phase.milestones.length,
    };
    cursor += weeks;
    return range;
  });
}

/**
 * Counts total milestones and milestones crossed (phase where ≥80% of its
 * week-assigned actions are completed).
 * Actions without a week_number are attributed to phase 1.
 */
export function computeMilestonesCrossed(
  phases: RoadmapPhase[],
  actions: CareerAction[]
): { milestonesCrossed: number; totalMilestones: number } {
  const totalMilestones = phases.reduce((sum, p) => sum + p.milestones.length, 0);
  if (phases.length === 0) return { milestonesCrossed: 0, totalMilestones: 0 };

  const ranges = buildPhaseWeekRanges(phases);

  let milestonesCrossed = 0;
  for (const range of ranges) {
    const phaseActions = actions.filter((a) => {
      const wk = a.week_number ?? 1;
      return wk >= range.start && wk <= range.end;
    });
    if (phaseActions.length === 0) continue;
    const completedInPhase = phaseActions.filter((a) => a.status === "completed").length;
    const pct = completedInPhase / phaseActions.length;
    if (pct >= 0.8) {
      milestonesCrossed += range.milestoneCount;
    }
  }

  return { milestonesCrossed, totalMilestones };
}

// ─── Main calculator ─────────────────────────────────────────────────────────

export interface ProgressInput {
  actions: CareerAction[];
  checkinCount: number;
  phases: RoadmapPhase[];
  hasAssessment: boolean;
  hasRoadmap: boolean;
}

/**
 * Computes the Career Progress Score using the locked formula:
 *   Action Completion  : 50 pts  (completed / max(total, 1) × 50)
 *   Consistency        : 20 pts  (min(checkins, 12) / 12 × 20)
 *   Roadmap Milestones : 20 pts  (milestones_crossed / max(total_milestones, 1) × 20)
 *   Activity Breadth   : 10 pts  (distinct_breadth_types_completed / 9 × 10)
 *
 * Platform readiness (has_assessment, has_roadmap) is tracked for display
 * purposes only — it is NOT included in the score.
 */
export function computeProgress(input: ProgressInput): CareerProgressResult {
  const { actions, checkinCount, phases, hasAssessment, hasRoadmap } = input;

  const completedActions = actions.filter((a) => a.status === "completed");
  const totalActions = actions.length;

  // Action completion (50 pts)
  const actions_pts = Math.round((completedActions.length / Math.max(totalActions, 1)) * 50);

  // Consistency / check-ins (20 pts)
  const consistency_pts = Math.round((Math.min(checkinCount, CHECKIN_CAP) / CHECKIN_CAP) * 20);

  // Roadmap milestones (20 pts)
  const { milestonesCrossed, totalMilestones } = computeMilestonesCrossed(phases, actions);
  const milestone_pts = Math.round((milestonesCrossed / Math.max(totalMilestones, 1)) * 20);

  // Activity breadth (10 pts) — only count breadth types, not "other"
  const completedBreadthTypes = new Set(
    completedActions
      .map((a) => a.action_type)
      .filter((t) => BREADTH_TYPES.has(t))
  );
  const distinct_types_completed = completedBreadthTypes.size;
  const breadth_pts = Math.round((distinct_types_completed / BREADTH_TOTAL) * 10);

  const score = Math.min(100, actions_pts + consistency_pts + milestone_pts + breadth_pts);

  const breakdown: ProgressBreakdown = {
    actions_pts,
    consistency_pts,
    milestone_pts,
    breadth_pts,
    actions_completed: completedActions.length,
    actions_total: totalActions,
    checkin_count: checkinCount,
    milestones_crossed: milestonesCrossed,
    total_milestones: totalMilestones,
    distinct_types_completed,
  };

  const readiness: CoachReadiness = {
    has_goal: true,
    has_assessment: hasAssessment,
    has_roadmap: hasRoadmap,
  };

  return { score, breakdown, readiness };
}
