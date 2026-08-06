import { redirect } from "@/i18n/navigation";
import { BarChart3, Briefcase, FileText, Mic, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getCareerAnalytics } from "@/lib/workspace/analytics";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  reviewing: "bg-blue-500",
  shortlisted: "bg-purple-500",
  interview_scheduled: "bg-orange-500",
  offered: "bg-emerald-500",
  hired: "bg-green-600",
  rejected: "bg-red-500",
  withdrawn: "bg-gray-400",
};

export default async function CareerAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const analytics = await getCareerAnalytics(user.id);
  const latestScore = analytics.atsScoreHistory[0]?.overall_score ?? null;
  const avgScore =
    analytics.atsScoreHistory.length > 0
      ? Math.round(
          analytics.atsScoreHistory.reduce((sum, s) => sum + s.overall_score, 0) /
            analytics.atsScoreHistory.length
        )
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Career Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your progress, AI tool usage, and application funnel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Applications</p>
              <p className="mt-1 text-2xl font-bold">{analytics.totals.applications}</p>
              <p className="mt-1 text-xs text-muted-foreground">{analytics.totals.activeApplications} active</p>
            </div>
            <Briefcase className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Cover Letters</p>
              <p className="mt-1 text-2xl font-bold">{analytics.totals.coverLetters}</p>
              <p className="mt-1 text-xs text-muted-foreground">AI-generated</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Interview Sessions</p>
              <p className="mt-1 text-2xl font-bold">{analytics.totals.interviewSessions}</p>
              <p className="mt-1 text-xs text-muted-foreground">Practice rounds</p>
            </div>
            <Mic className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Latest ATS Score</p>
              <p className="mt-1 text-2xl font-bold">{latestScore ?? "—"}</p>
              {avgScore !== null && (
                <p className="mt-1 text-xs text-muted-foreground">Avg: {avgScore}</p>
              )}
            </div>
            {latestScore !== null && <ScoreRing score={latestScore} size={52} strokeWidth={5} />}
          </CardContent>
        </Card>
      </div>

      {analytics.atsScoreHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> ATS Score History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.atsScoreHistory.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-20 shrink-0 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex-1 bg-muted rounded-full overflow-hidden h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        s.overall_score >= 80
                          ? "bg-emerald-500"
                          : s.overall_score >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${s.overall_score}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                    {s.overall_score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(analytics.appsByStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Application Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.appsByStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[status] ?? "bg-gray-400"}`}
                    />
                    <span className="flex-1 text-sm capitalize text-muted-foreground">
                      {status.replace("_", " ")}
                    </span>
                    <Badge variant="secondary" className="tabular-nums">
                      {count}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics.totals.applications === 0 && analytics.atsScoreHistory.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No data yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Apply to jobs, run ATS checks, and use AI tools to see your analytics here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
