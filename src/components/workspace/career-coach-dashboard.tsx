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
  Lock,
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
import { setGoalStatusAction } from "@/actions/career-coach";
import { cn } from "@/lib/utils";
import type {
  CareerGoal,
  CareerAssessment,
  CareerRoadmap,
  CareerAction,
  CareerProgressResult,
  GoalStatus,
} from "@/types/career-coach";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachDashboardData {
  active_goal: CareerGoal | null;
  latest_assessment: CareerAssessment | null;
  roadmap: CareerRoadmap | null;
  pending_actions: CareerAction[];
  next_checkin_due: string | null;
  progress: CareerProgressResult | null;
}

interface Props {
  data: CoachDashboardData;
  locale: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<GoalStatus, string> = {
  active:    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  paused:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
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
              className="h-7 gap-1 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
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
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={done ? "font-medium" : "text-muted-foreground"}>{label}</span>
            </div>
            <span className={cn("text-xs font-medium", done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {done ? "Complete" : "Pending"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Assessment Summary Card ──────────────────────────────────────────────────

function AssessmentSummaryCard({ assessment }: { assessment: CareerAssessment | null }) {
  if (!assessment) {
    return (
      <Card data-testid="assessment-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Career Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Run your first career assessment to unlock personalized strengths and gap analysis.
            </p>
            <Button size="sm" variant="outline" disabled>
              <Lock className="mr-1.5 h-3 w-3" />
              Coming in next phase
            </Button>
          </div>
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
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
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
                      gap.priority === "high" && "border-red-500/40 text-red-600 dark:text-red-400",
                      gap.priority === "medium" && "border-amber-500/40 text-amber-600 dark:text-amber-400",
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

// ─── Pending Actions Card ─────────────────────────────────────────────────────

function PendingActionsCard({ actions, hasRoadmap }: { actions: CareerAction[]; hasRoadmap: boolean }) {
  if (!hasRoadmap || actions.length === 0) {
    return (
      <Card data-testid="actions-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">This Week&apos;s Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Lock className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Generate your career roadmap to unlock weekly AI-recommended actions.
            </p>
            <Button size="sm" variant="outline" disabled>
              <Lock className="mr-1.5 h-3 w-3" />
              Coming in next phase
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="actions-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">This Week&apos;s Actions</CardTitle>
          <Badge variant="secondary" className="ml-auto text-xs">{actions.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.slice(0, 5).map((action) => (
          <div key={action.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
            <Circle className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug truncate">{action.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] py-0 h-4">
                  {ACTION_TYPE_LABEL[action.action_type] ?? action.action_type}
                </Badge>
                {action.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {new Date(action.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Next Steps Card ──────────────────────────────────────────────────────────

interface NextStepsCardProps {
  hasAssessment: boolean;
  hasRoadmap: boolean;
  checkinCount: number;
  nextCheckinDue: string | null;
}

function NextStepsCard({ hasAssessment, hasRoadmap, checkinCount, nextCheckinDue }: NextStepsCardProps) {
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
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{heading}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
            {nextCheckinDue && checkinCount > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Next check-in suggested: {new Date(nextCheckinDue).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        {(!hasAssessment || !hasRoadmap) && (
          <div className="mt-3 pt-3 border-t">
            <Button size="sm" variant="outline" disabled className="gap-1.5">
              <Lock className="h-3 w-3" />
              Available in next phase
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

export function CareerCoachDashboard({ data }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<GoalStatus | null>(null);

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
          <AssessmentSummaryCard assessment={data.latest_assessment} />
          <PendingActionsCard actions={data.pending_actions} hasRoadmap={hasRoadmap} />
        </div>
      </div>

      {/* Next Steps — full width */}
      <NextStepsCard
        hasAssessment={hasAssessment}
        hasRoadmap={hasRoadmap}
        checkinCount={checkinCount}
        nextCheckinDue={data.next_checkin_due}
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
