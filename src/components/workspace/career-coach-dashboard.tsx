"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Target,
  CheckCircle2,
  Circle,
  Calendar,
  TrendingUp,
  Zap,
  BookOpen,
  Layers,
  ChevronRight,
  Pause,
  Play,
  CheckCheck,
  Pencil,
  Sparkles,
  Clock,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { GoalDialog } from "./career-coach-goal-dialog";
import {
  setGoalStatusAction,
  triggerCareerAssessmentAction,
  generateCareerRoadmapAction,
  generateWeeklyActionsAction,
  updateActionStatusAction,
  submitCheckinAction,
} from "@/actions/career-coach";
import { cn } from "@/lib/utils";
import type {
  CareerGoal,
  CareerAssessment,
  CareerRoadmap,
  CareerAction,
  CareerCheckin,
  CareerProgressResult,
  CheckinAiResponse,
  CheckinMood,
  GoalStatus,
  ActionStatus,
} from "@/types/career-coach";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachDashboardData {
  active_goal: CareerGoal | null;
  latest_assessment: CareerAssessment | null;
  roadmap: CareerRoadmap | null;
  pending_actions: CareerAction[];
  all_actions: CareerAction[];
  recent_checkins: CareerCheckin[];
  next_checkin_due: string | null;
  progress: CareerProgressResult | null;
}

interface Props {
  data: CoachDashboardData;
  locale: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<GoalStatus, string> = {
  active:    "bg-pra-success/10 text-pra-success",
  paused:    "bg-pra-warning/10 text-pra-warning",
  completed: "bg-pra-primary/10 text-pra-primary",
  abandoned: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<GoalStatus, string> = {
  active:    "Active",
  paused:    "Paused",
  completed: "Completed",
  abandoned: "Abandoned",
};

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ─── Action type label ────────────────────────────────────────────────────────

const ACTION_TYPE_LABEL: Record<string, string> = {
  course:             "Course",
  cv_update:          "CV Update",
  linkedin:           "LinkedIn",
  apply:              "Apply",
  interview_practice: "Interview Practice",
  skill:              "Skill Building",
  networking:         "Networking",
  experience:         "Experience",
  certification:      "Certification",
  other:              "Task",
};

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateGoal }: { onCreateGoal: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4" data-testid="coach-empty-state">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Target className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">Start Your Career Journey</h2>
      <p className="mb-8 max-w-md text-muted-foreground text-sm leading-relaxed">
        Define your career goal and let your AI coach guide you through assessments, roadmaps,
        weekly actions, and progress tracking — all in one place.
      </p>
      <Button size="lg" onClick={onCreateGoal} data-testid="create-goal-cta">
        <Target className="mr-2 h-4 w-4" />
        Define My Career Goal
      </Button>
    </div>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: CareerGoal;
  onEdit: () => void;
  onStatusChange: (status: GoalStatus) => void;
  isPending: boolean;
}

function GoalCard({ goal, onEdit, onStatusChange, isPending }: GoalCardProps) {
  return (
    <Card data-testid="goal-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary flex-shrink-0" />
            <CardTitle className="text-base">Career Goal</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <GoalStatusBadge status={goal.status} />
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={onEdit} disabled={isPending}>
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-lg font-semibold leading-snug" data-testid="goal-title">{goal.title}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Target role</span>
            <p className="font-medium" data-testid="goal-target-role">{goal.target_role}</p>
          </div>
          {goal.current_role && (
            <div>
              <span className="text-muted-foreground">Current role</span>
              <p className="font-medium">{goal.current_role}</p>
            </div>
          )}
          {goal.target_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Target date</span>
              <span className="font-medium">{new Date(goal.target_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {goal.notes && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
            {goal.notes}
          </p>
        )}

        {goal.status !== "completed" && goal.status !== "abandoned" && (
          <div className="flex items-center gap-2 pt-1">
            {goal.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => onStatusChange("paused")}
                disabled={isPending}
                data-testid="pause-goal-button"
              >
                <Pause className="h-3 w-3" />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs"
                onClick={() => onStatusChange("active")}
                disabled={isPending}
                data-testid="resume-goal-button"
              >
                <Play className="h-3 w-3" />
                Resume
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-pra-success border-pra-success/30 hover:bg-pra-success/10"
              onClick={() => onStatusChange("completed")}
              disabled={isPending}
              data-testid="complete-goal-button"
            >
              <CheckCheck className="h-3 w-3" />
              Mark Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Progress Score Card ──────────────────────────────────────────────────────

function ProgressScoreCard({ progress }: { progress: CareerProgressResult }) {
  const { score, breakdown } = progress;

  const bars = [
    {
      label:   "Action Completion",
      icon:    CheckCircle2,
      pts:     breakdown.actions_pts,
      max:     50,
      detail:  `${breakdown.actions_completed} / ${breakdown.actions_total} completed`,
    },
    {
      label:   "Consistency",
      icon:    TrendingUp,
      pts:     breakdown.consistency_pts,
      max:     20,
      detail:  `${breakdown.checkin_count} / 12 check-ins`,
    },
    {
      label:   "Milestone Progress",
      icon:    Layers,
      pts:     breakdown.milestone_pts,
      max:     20,
      detail:  `${breakdown.milestones_crossed} / ${breakdown.total_milestones} milestones`,
    },
    {
      label:   "Activity Breadth",
      icon:    Zap,
      pts:     breakdown.breadth_pts,
      max:     10,
      detail:  `${breakdown.distinct_types_completed} / 9 activity types`,
    },
  ];

  return (
    <Card data-testid="progress-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Career Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold tabular-nums" data-testid="progress-score">{score}</span>
          <span className="text-xl text-muted-foreground mb-1">/ 100</span>
        </div>

        <div className="space-y-3">
          {bars.map(({ label, icon: Icon, pts, max, detail }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
                <span className="font-medium tabular-nums text-foreground">{pts} / {max} pts</span>
              </div>
              <Progress value={(pts / max) * 100} className="h-1.5" />
              <p className="text-xs text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Coach Readiness Card ─────────────────────────────────────────────────────

interface ReadinessProps {
  hasGoal: boolean;
  hasAssessment: boolean;
  hasRoadmap: boolean;
}

function CoachReadinessCard({ hasGoal, hasAssessment, hasRoadmap }: ReadinessProps) {
  const items = [
    { label: "Career Goal",        done: hasGoal },
    { label: "Career Assessment",  done: hasAssessment },
    { label: "Career Roadmap",     done: hasRoadmap },
  ];

  return (
    <Card data-testid="readiness-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Coach Readiness</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Readiness is separate from your progress score</p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {items.map(({ label, done }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-pra-success flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={done ? "font-medium" : "text-muted-foreground"}>{label}</span>
            </div>
            <span className={cn("text-xs font-medium", done ? "text-pra-success" : "text-muted-foreground")}>
              {done ? "Complete" : "Pending"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Assessment Summary Card ──────────────────────────────────────────────────

interface AssessmentCardProps {
  assessment: CareerAssessment | null;
  onTrigger: () => void;
  isLoading: boolean;
}

function AssessmentSummaryCard({ assessment, onTrigger, isLoading }: AssessmentCardProps) {
  if (!assessment) {
    return (
      <Card data-testid="assessment-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Career Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get a personalized AI analysis of your strengths, skill gaps, and career readiness
            based on your profile, resume, and job match data.
          </p>
          <Button
            className="w-full gap-2"
            onClick={onTrigger}
            disabled={isLoading}
            data-testid="run-assessment-button"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            {isLoading ? "Analyzing your profile…" : "Run My Assessment"}
          </Button>
          {isLoading && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              AI is reviewing your profile, resume, and career data…
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="assessment-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Career Assessment</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {assessment.strengths.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Strengths</p>
            <ul className="space-y-1">
              {assessment.strengths.slice(0, 4).map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-pra-success" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.skill_gaps.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key Skill Gaps</p>
              <div className="flex flex-wrap gap-1.5">
                {assessment.skill_gaps.slice(0, 6).map((gap, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className={cn(
                      "text-xs",
                      gap.priority === "high" && "border-pra-danger/40 text-pra-danger",
                      gap.priority === "medium" && "border-pra-warning/40 text-pra-warning",
                      gap.priority === "low" && "border-muted text-muted-foreground"
                    )}
                  >
                    {gap.skill}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Roadmap Card ─────────────────────────────────────────────────────────────

interface RoadmapCardProps {
  roadmap: CareerRoadmap | null;
  hasAssessment: boolean;
  onGenerate: () => void;
  isLoading: boolean;
}

function RoadmapCard({ roadmap, hasAssessment, onGenerate, isLoading }: RoadmapCardProps) {
  if (!hasAssessment) return null;

  if (!roadmap) {
    return (
      <Card data-testid="roadmap-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Career Roadmap</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Build a phased, personalized roadmap to reach your target role — tailored to your assessment results.
          </p>
          <Button
            className="w-full gap-2"
            onClick={onGenerate}
            disabled={isLoading}
            data-testid="generate-roadmap-button"
          >
            {isLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Layers className="h-4 w-4" />}
            {isLoading ? "Building your roadmap…" : "Generate Career Roadmap"}
          </Button>
          {isLoading && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              AI is designing your personalized career roadmap…
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="roadmap-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Career Roadmap</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">{roadmap.phases.length} phases</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {roadmap.phases.map((phase, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug">{phase.label}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{phase.duration_months}mo</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{phase.focus}</p>
                {phase.milestones.length > 0 && (
                  <p className="mt-1 text-[11px] text-primary/70">
                    {phase.milestones.length} milestone{phase.milestones.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pending Actions Card ─────────────────────────────────────────────────────

interface PendingActionsCardProps {
  actions: CareerAction[];
  hasRoadmap: boolean;
  onGenerateActions: () => void;
  isGenerating: boolean;
  onToggleAction: (id: string, status: ActionStatus) => void;
  togglingActionId: string | null;
}

function PendingActionsCard({
  actions,
  hasRoadmap,
  onGenerateActions,
  isGenerating,
  onToggleAction,
  togglingActionId,
}: PendingActionsCardProps) {
  if (!hasRoadmap) {
    return (
      <Card data-testid="actions-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">This Week&apos;s Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            Generate your career roadmap first to unlock weekly AI-recommended actions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) {
    return (
      <Card data-testid="actions-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">This Week&apos;s Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get AI-recommended actions for this week based on your roadmap and skill gaps.
          </p>
          <Button
            className="w-full gap-2"
            onClick={onGenerateActions}
            disabled={isGenerating}
            data-testid="generate-actions-button"
          >
            {isGenerating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Zap className="h-4 w-4" />}
            {isGenerating ? "Generating actions…" : "Generate This Week's Actions"}
          </Button>
          {isGenerating && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              AI is selecting the best actions for your current phase…
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const completedCount = actions.filter((a) => a.status === "completed").length;

  return (
    <Card data-testid="actions-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">This Week&apos;s Actions</CardTitle>
          <Badge
            variant={completedCount === actions.length ? "default" : "secondary"}
            className="ml-auto text-xs"
          >
            {completedCount}/{actions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {actions.slice(0, 8).map((action) => {
          const done = action.status === "completed";
          const toggling = togglingActionId === action.id;
          return (
            <button
              key={action.id}
              onClick={() => onToggleAction(action.id, action.status as ActionStatus)}
              disabled={toggling}
              className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
              data-testid={`action-item-${action.id}`}
            >
              {toggling ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
              ) : done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pra-success" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-sm font-medium leading-snug",
                  done && "line-through text-muted-foreground"
                )}>
                  {action.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="outline" className="h-4 py-0 text-[10px]">
                    {ACTION_TYPE_LABEL[action.action_type] ?? action.action_type}
                  </Badge>
                  {action.due_date && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(action.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {actions.length > 8 && (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            +{actions.length - 8} more actions
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Check-in helpers ─────────────────────────────────────────────────────────

const MOOD_META: Record<CheckinMood, { label: string; emoji: string; color: string }> = {
  great:      { label: "Great",      emoji: "🚀", color: "text-green-600 dark:text-green-400" },
  good:       { label: "Good",       emoji: "😊", color: "text-blue-600  dark:text-blue-400" },
  neutral:    { label: "Okay",       emoji: "😐", color: "text-slate-500" },
  struggling: { label: "Struggling", emoji: "😓", color: "text-amber-600 dark:text-amber-400" },
  off_track:  { label: "Off Track",  emoji: "😰", color: "text-red-600   dark:text-red-400" },
};

const MOOD_BUTTON_COLOR: Record<CheckinMood, string> = {
  great:      "bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-700 dark:text-green-400",
  good:       "bg-blue-50  border-blue-300  text-blue-700  hover:bg-blue-100  dark:bg-blue-950/30  dark:border-blue-700  dark:text-blue-400",
  neutral:    "bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100 dark:bg-slate-800    dark:border-slate-600 dark:text-slate-300",
  struggling: "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400",
  off_track:  "bg-red-50   border-red-300   text-red-700   hover:bg-red-100   dark:bg-red-950/30   dark:border-red-700   dark:text-red-400",
};

const ORDERED_MOODS: CheckinMood[] = ["great", "good", "neutral", "struggling", "off_track"];

// ─── Check-in Dialog ──────────────────────────────────────────────────────────

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: {
    accomplished: string | null;
    blockers: string | null;
    changes: string | null;
    support_needed: string | null;
    mood: CheckinMood;
  }) => Promise<CheckinAiResponse | null>;
  isSubmitting: boolean;
}

function CheckInDialog({ open, onOpenChange, onSubmit, isSubmitting }: CheckInDialogProps) {
  const [mood, setMood] = useState<CheckinMood | null>(null);
  const [accomplished, setAccomplished] = useState("");
  const [blockers, setBlockers] = useState("");
  const [changes, setChanges] = useState("");
  const [aiResponse, setAiResponse] = useState<CheckinAiResponse | null>(null);

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => {
      setMood(null);
      setAccomplished("");
      setBlockers("");
      setChanges("");
      setAiResponse(null);
    }, 300);
  }

  async function handleSubmit() {
    if (!mood) return;
    const response = await onSubmit({
      accomplished: accomplished.trim() || null,
      blockers: blockers.trim() || null,
      changes: changes.trim() || null,
      support_needed: null,
      mood,
    });
    setAiResponse(response);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="checkin-dialog">
        {!aiResponse ? (
          <>
            <DialogHeader>
              <DialogTitle>Weekly Check-in</DialogTitle>
            </DialogHeader>
            <p className="-mt-1 text-sm text-muted-foreground">
              Reflect on your week and get AI coaching feedback.
            </p>

            <div className="space-y-2">
              <p className="text-sm font-medium">How is your progress feeling this week?</p>
              <div className="flex flex-wrap gap-2">
                {ORDERED_MOODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    data-testid={`checkin-mood-${m}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      MOOD_BUTTON_COLOR[m],
                      mood === m && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    <span>{MOOD_META[m].emoji}</span>
                    <span>{MOOD_META[m].label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="ci-accomplished">
                What did you accomplish this week?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="ci-accomplished"
                data-testid="checkin-accomplished-input"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[72px]"
                placeholder="e.g. Completed the React course, applied to 2 jobs…"
                value={accomplished}
                onChange={(e) => setAccomplished(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="ci-blockers">
                Any blockers or challenges?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="ci-blockers"
                data-testid="checkin-blockers-input"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
                placeholder="e.g. Struggled with time management…"
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="ci-changes">
                Anything you want to change next week?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="ci-changes"
                data-testid="checkin-changes-input"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
                placeholder="e.g. Dedicate more time to practice…"
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!mood || isSubmitting}
                data-testid="checkin-submit-button"
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Analyzing…</>
                ) : (
                  "Submit Check-in"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div data-testid="checkin-success-state" className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-sm">Check-in submitted!</p>
                <p className="text-xs text-muted-foreground">Your AI coach has responded.</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm leading-relaxed">{aiResponse.summary}</p>
              {aiResponse.encouragement && (
                <p className="text-sm text-muted-foreground italic">{aiResponse.encouragement}</p>
              )}
              {aiResponse.updated_priorities?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Focus for next week
                  </p>
                  <ul className="space-y-0.5">
                    {aiResponse.updated_priorities.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full" data-testid="checkin-done-button">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Check-in Card ────────────────────────────────────────────────────────────

interface CheckInCardProps {
  checkins: CareerCheckin[];
  nextCheckinDue: string | null;
  onCheckin: () => void;
}

function CheckInCard({ checkins, nextCheckinDue, onCheckin }: CheckInCardProps) {
  const isDue = !nextCheckinDue || new Date(nextCheckinDue) <= new Date();

  return (
    <Card data-testid="checkin-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Weekly Check-ins</CardTitle>
          </div>
          {nextCheckinDue && (
            <Badge variant={isDue ? "default" : "secondary"} className="text-xs">
              {isDue
                ? "Check-in due"
                : `Next: ${new Date(nextCheckinDue).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checkins.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Start tracking your progress</p>
              <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">
                Submit your first weekly check-in to get AI coaching feedback and build your consistency score.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {checkins.slice(0, 3).map((c) => {
              const meta = MOOD_META[c.mood];
              return (
                <div
                  key={c.id}
                  data-testid={`checkin-item-${c.id}`}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <span className="mt-0.5 text-lg leading-none">{meta.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-xs font-medium", meta.color)}>{meta.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {c.ai_response?.summary ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {c.ai_response.summary}
                      </p>
                    ) : c.accomplished ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.accomplished}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          size="sm"
          variant={checkins.length === 0 ? "default" : "outline"}
          className="w-full gap-1.5"
          onClick={onCheckin}
          data-testid="submit-checkin-button"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          {checkins.length === 0 ? "Submit First Check-in" : "New Check-in"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Next Steps Card ──────────────────────────────────────────────────────────

interface NextStepsCardProps {
  hasAssessment: boolean;
  hasRoadmap: boolean;
  hasActions: boolean;
  checkinCount: number;
  nextCheckinDue: string | null;
  onTriggerAssessment: () => void;
  onGenerateRoadmap: () => void;
  onCheckin: () => void;
  isAssessing: boolean;
  isRoadmapping: boolean;
}

function NextStepsCard({
  hasAssessment,
  hasRoadmap,
  hasActions,
  checkinCount,
  nextCheckinDue,
  onTriggerAssessment,
  onGenerateRoadmap,
  onCheckin,
  isAssessing,
  isRoadmapping,
}: NextStepsCardProps) {
  let heading: string;
  let hint: string;
  let icon = ChevronRight;

  if (!hasAssessment) {
    heading = "Run Career Assessment";
    hint = "Identify your strengths, skill gaps, and best-fit roles with an AI-powered career assessment.";
    icon = Sparkles;
  } else if (!hasRoadmap) {
    heading = "Generate Career Roadmap";
    hint = "Build a phased, personalized roadmap to reach your target role.";
    icon = Layers;
  } else if (!hasActions) {
    heading = "Generate This Week's Actions";
    hint = "Get AI-recommended weekly actions tailored to your roadmap and current phase.";
    icon = Zap;
  } else if (checkinCount === 0) {
    heading = "Complete Your First Check-in";
    hint = "Share your weekly progress and get AI-powered coaching feedback.";
    icon = TrendingUp;
  } else {
    heading = "You are on track!";
    hint = "Keep completing your weekly actions and check in regularly to maintain your momentum.";
    icon = CheckCheck;
  }

  const Icon = icon;

  return (
    <Card data-testid="next-steps-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Recommended Next Step</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{heading}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
            {nextCheckinDue && checkinCount > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Next check-in suggested: {new Date(nextCheckinDue).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {!hasAssessment && (
          <div className="mt-3 border-t pt-3">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={onTriggerAssessment}
              disabled={isAssessing}
              data-testid="next-step-assessment-button"
            >
              {isAssessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {isAssessing ? "Analyzing…" : "Run Assessment"}
            </Button>
          </div>
        )}

        {hasAssessment && !hasRoadmap && (
          <div className="mt-3 border-t pt-3">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={onGenerateRoadmap}
              disabled={isRoadmapping}
              data-testid="next-step-roadmap-button"
            >
              {isRoadmapping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Layers className="h-3 w-3" />}
              {isRoadmapping ? "Building…" : "Generate Roadmap"}
            </Button>
          </div>
        )}

        {hasActions && checkinCount === 0 && (
          <div className="mt-3 border-t pt-3">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={onCheckin}
              data-testid="next-step-checkin-button"
            >
              <TrendingUp className="h-3 w-3" />
              Submit Check-in
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  body: string;
  onConfirm: () => void;
  isPending: boolean;
}

function ConfirmDialog({ open, onOpenChange, title, body, onConfirm, isPending }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{body}</p>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending} data-testid="confirm-status-button">
            {isPending ? "Updating..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

function calcWeekNum(createdAt: string): number {
  return Math.max(1, Math.ceil((Date.now() - new Date(createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

export function CareerCoachDashboard({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAssessing, startAssessing] = useTransition();
  const [isRoadmapping, startRoadmapping] = useTransition();
  const [isGeneratingActions, startGeneratingActions] = useTransition();
  const [isCheckingIn, startCheckingIn] = useTransition();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<GoalStatus | null>(null);
  const [togglingActionId, setTogglingActionId] = useState<string | null>(null);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinKey, setCheckinKey] = useState(0);

  const goal = data.active_goal;
  const progress = data.progress;

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setEditMode(false);
    setGoalDialogOpen(true);
  }

  function openEdit() {
    setEditMode(true);
    setGoalDialogOpen(true);
  }

  function handleStatusChangeRequest(status: GoalStatus) {
    setConfirmStatus(status);
  }

  function executeStatusChange() {
    if (!goal || !confirmStatus) return;
    startTransition(async () => {
      const res = await setGoalStatusAction(goal.id, confirmStatus);
      setConfirmStatus(null);
      if (res.success) {
        toast.success(
          confirmStatus === "paused" ? "Goal paused." :
          confirmStatus === "active" ? "Goal resumed." :
          "Goal marked as complete!"
        );
        refresh();
      } else {
        toast.error(res.error ?? "Failed to update goal status.");
      }
    });
  }

  function handleRunAssessment() {
    if (!goal) return;
    startAssessing(async () => {
      const res = await triggerCareerAssessmentAction(goal.id);
      if (res.success) {
        toast.success("Assessment complete! Your strengths and gaps are ready.");
        refresh();
      } else {
        toast.error(res.error ?? "Assessment failed. Please try again.");
      }
    });
  }

  function handleGenerateRoadmap() {
    if (!goal) return;
    startRoadmapping(async () => {
      const res = await generateCareerRoadmapAction(goal.id);
      if (res.success) {
        toast.success("Career roadmap generated!");
        refresh();
      } else {
        toast.error(res.error ?? "Roadmap generation failed. Please try again.");
      }
    });
  }

  function handleGenerateActions() {
    if (!goal) return;
    startGeneratingActions(async () => {
      const weekNum = calcWeekNum(goal.created_at);
      const res = await generateWeeklyActionsAction(goal.id, weekNum);
      if (res.success) {
        toast.success("Weekly actions generated!");
        refresh();
      } else {
        toast.error(res.error ?? "Action generation failed. Please try again.");
      }
    });
  }

  function handleToggleAction(actionId: string, currentStatus: ActionStatus) {
    const newStatus: ActionStatus = currentStatus === "completed" ? "pending" : "completed";
    setTogglingActionId(actionId);
    startTransition(async () => {
      const res = await updateActionStatusAction(actionId, newStatus);
      setTogglingActionId(null);
      if (res.success) {
        refresh();
      } else {
        toast.error(res.error ?? "Failed to update action.");
      }
    });
  }

  function openCheckinDialog() {
    setCheckinKey((k) => k + 1);
    setCheckinDialogOpen(true);
  }

  async function handleSubmitCheckin(input: {
    accomplished: string | null;
    blockers: string | null;
    changes: string | null;
    support_needed: string | null;
    mood: CheckinMood;
  }): Promise<CheckinAiResponse | null> {
    if (!goal) return null;
    return new Promise((resolve) => {
      startCheckingIn(async () => {
        const res = await submitCheckinAction(goal.id, input);
        if (res.success) {
          refresh();
          resolve(res.data?.ai_response ?? null);
        } else {
          toast.error(res.error ?? "Check-in failed. Please try again.");
          resolve(null);
        }
      });
    });
  }

  const confirmTitle =
    confirmStatus === "paused"    ? "Pause this goal?" :
    confirmStatus === "active"    ? "Resume this goal?" :
    confirmStatus === "completed" ? "Mark goal as complete?" :
    "";

  const confirmBody =
    confirmStatus === "paused"    ? "You can resume it at any time. Progress is preserved." :
    confirmStatus === "active"    ? "Resume working on this goal." :
    confirmStatus === "completed" ? "Great work! You can start a new goal any time." :
    "";

  if (!goal) {
    return (
      <>
        <EmptyState onCreateGoal={openCreate} />
        <GoalDialog
          open={goalDialogOpen}
          onOpenChange={setGoalDialogOpen}
          onSuccess={refresh}
        />
      </>
    );
  }

  const hasAssessment = !!data.latest_assessment;
  const hasRoadmap = !!data.roadmap;
  const hasActions = data.all_actions.length > 0;
  const checkinCount = progress?.breakdown.checkin_count ?? 0;

  return (
    <div className="space-y-6" data-testid="coach-overview">
      {/* Goal Card */}
      <GoalCard
        goal={goal}
        onEdit={openEdit}
        onStatusChange={handleStatusChangeRequest}
        isPending={isPending}
      />

      {/* Two-column grid: progress + readiness / assessment + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          {progress ? (
            <ProgressScoreCard progress={progress} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No progress data yet. Start completing actions.
              </CardContent>
            </Card>
          )}
          <CoachReadinessCard
            hasGoal={true}
            hasAssessment={hasAssessment}
            hasRoadmap={hasRoadmap}
          />
        </div>

        {/* Right */}
        <div className="space-y-6">
          <AssessmentSummaryCard
            assessment={data.latest_assessment}
            onTrigger={handleRunAssessment}
            isLoading={isAssessing}
          />
          <PendingActionsCard
            actions={data.all_actions}
            hasRoadmap={hasRoadmap}
            onGenerateActions={handleGenerateActions}
            isGenerating={isGeneratingActions}
            onToggleAction={handleToggleAction}
            togglingActionId={togglingActionId}
          />
        </div>
      </div>

      {/* Roadmap — full width, shown once assessment exists */}
      <RoadmapCard
        roadmap={data.roadmap}
        hasAssessment={hasAssessment}
        onGenerate={handleGenerateRoadmap}
        isLoading={isRoadmapping}
      />

      {/* Check-ins — full width, shown once goal exists */}
      <CheckInCard
        checkins={data.recent_checkins}
        nextCheckinDue={data.next_checkin_due}
        onCheckin={openCheckinDialog}
      />

      {/* Next Steps — full width */}
      <NextStepsCard
        hasAssessment={hasAssessment}
        hasRoadmap={hasRoadmap}
        hasActions={hasActions}
        checkinCount={checkinCount}
        nextCheckinDue={data.next_checkin_due}
        onTriggerAssessment={handleRunAssessment}
        onGenerateRoadmap={handleGenerateRoadmap}
        onCheckin={openCheckinDialog}
        isAssessing={isAssessing}
        isRoadmapping={isRoadmapping}
      />

      {/* Dialogs */}
      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        existing={editMode ? goal : undefined}
        onSuccess={refresh}
      />

      <ConfirmDialog
        open={!!confirmStatus}
        onOpenChange={(v) => { if (!v) setConfirmStatus(null); }}
        title={confirmTitle}
        body={confirmBody}
        onConfirm={executeStatusChange}
        isPending={isPending}
      />

      <CheckInDialog
        key={checkinKey}
        open={checkinDialogOpen}
        onOpenChange={setCheckinDialogOpen}
        onSubmit={handleSubmitCheckin}
        isSubmitting={isCheckingIn}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function CareerCoachSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}
