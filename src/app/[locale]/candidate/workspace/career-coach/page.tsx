import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import {
  getActiveGoal,
  getLatestAssessment,
  getRoadmapByGoal,
  getPendingActions,
  getActions,
  getCheckins,
} from "@/lib/queries/career-coach";
import { computeProgress } from "@/lib/coach/progress";
import { CareerCoachDashboard } from "@/components/workspace/career-coach-dashboard";
import type { CoachDashboardData } from "@/components/workspace/career-coach-dashboard";

export default async function CareerCoachPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const goal = await getActiveGoal(user!.id);

  let data: CoachDashboardData;

  if (!goal) {
    data = {
      active_goal: null,
      latest_assessment: null,
      roadmap: null,
      pending_actions: [],
      next_checkin_due: null,
      progress: null,
    };
  } else {
    const [assessment, roadmap, pendingActions, allActions, checkins] = await Promise.all([
      getLatestAssessment(user!.id, goal.id),
      getRoadmapByGoal(user!.id, goal.id),
      getPendingActions(user!.id, goal.id),
      getActions(user!.id, goal.id),
      getCheckins(user!.id, goal.id, 99),
    ]);

    const progress = computeProgress({
      actions: allActions,
      checkinCount: checkins.length,
      phases: roadmap?.phases ?? [],
      hasAssessment: !!assessment,
      hasRoadmap: !!roadmap,
    });

    // Suggest next check-in: 7 days after last one, or today
    let nextCheckinDue: string | null = null;
    const lastCheckin = checkins[0];
    if (lastCheckin) {
      const d = new Date(lastCheckin.created_at);
      d.setDate(d.getDate() + 7);
      nextCheckinDue = d.toISOString().split("T")[0];
    } else {
      nextCheckinDue = new Date().toISOString().split("T")[0];
    }

    data = {
      active_goal: goal,
      latest_assessment: assessment,
      roadmap,
      pending_actions: pendingActions,
      next_checkin_due: nextCheckinDue,
      progress: {
        ...progress,
        readiness: {
          has_goal: true,
          has_assessment: !!assessment,
          has_roadmap: !!roadmap,
        },
      },
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Career Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personalized, persistent career development companion.
        </p>
      </div>
      <CareerCoachDashboard data={data} locale={locale} />
    </div>
  );
}
