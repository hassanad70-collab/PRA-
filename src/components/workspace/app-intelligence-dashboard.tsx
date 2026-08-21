"use client";

import { useState, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Briefcase,
  TrendingUp,
  Target,
  Trophy,
  FileText,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateApplicationInsightsAction,
  estimateWinProbabilityAction,
} from "@/actions/workspace";
import type { ApplicationAnalytics } from "@/types/database";
import type { ApplicationWithRole } from "@/lib/workspace/application-analytics";

interface Props {
  analytics: ApplicationAnalytics;
  recentApplications: ApplicationWithRole[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  submitted:   { label: "Submitted",   color: "text-primary",        icon: Clock },
  screening:   { label: "Screening",   color: "text-pra-warning",    icon: Circle },
  shortlisted: { label: "Shortlisted", color: "text-pra-cyan",       icon: TrendingUp },
  interview:   { label: "Interview",   color: "text-pra-primary",    icon: Target },
  offer:       { label: "Offer",       color: "text-pra-success",    icon: Trophy },
  hired:       { label: "Hired",       color: "text-pra-success",    icon: CheckCircle2 },
  rejected:    { label: "Rejected",    color: "text-pra-danger",     icon: XCircle },
  withdrawn:   { label: "Withdrawn",   color: "text-muted-foreground", icon: Minus },
  archived:    { label: "Archived",    color: "text-muted-foreground", icon: Minus },
};

const FUNNEL_COLORS = ["#94A3B8", "#2563EB", "#06B6D4", "#F59E0B", "#10B981"];

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "flat";
}) {
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {trend && (
                  <TrendIcon
                    className={`h-3 w-3 ${trend === "up" ? "text-pra-success" : trend === "down" ? "text-pra-danger" : "text-muted-foreground"}`}
                  />
                )}
                {sub}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WinProbabilityBadge({ appId, atsScore, matchScore, role, status }: {
  appId: string;
  atsScore: number | null;
  matchScore: number | null;
  role: string;
  status: string;
}) {
  const [probability, setProbability] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const res = await estimateWinProbabilityAction(appId, atsScore, matchScore, role, status);
    if (res.success && res.data) setProbability(res.data.probability);
    setLoading(false);
  }, [appId, atsScore, matchScore, role, status]);

  if (probability !== null) {
    const color = probability >= 60 ? "text-pra-success" : probability >= 35 ? "text-pra-warning" : "text-pra-danger";
    return <span className={`text-sm font-semibold tabular-nums ${color}`}>{probability}%</span>;
  }

  return (
    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={generate} disabled={loading}>
      {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Win %"}
    </Button>
  );
}

export function AppIntelligenceDashboard({ analytics, recentApplications }: Props) {
  const [insights, setInsights] = useState<{ insights: string[]; recommendations: string[] } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const weeklyTrend: "up" | "down" | "flat" =
    analytics.weeklyApplications > analytics.prevWeekApplications ? "up" :
    analytics.weeklyApplications < analytics.prevWeekApplications ? "down" : "flat";

  const refreshInsights = useCallback(async () => {
    setLoadingInsights(true);
    const roles = recentApplications.map(a => a.role);
    const res = await generateApplicationInsightsAction(roles);
    if (res.success && res.data) setInsights(res.data);
    setLoadingInsights(false);
  }, [recentApplications]);

  const hasApplications = analytics.totals.applications > 0;

  if (!hasApplications) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">No applications yet</h2>
        <p className="text-muted-foreground max-w-sm">
          Apply to jobs to see your application analytics, conversion funnel, and AI-powered win probability estimates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Applications"
          value={analytics.totals.applications}
          sub={`${analytics.weeklyApplications} this week`}
          icon={Briefcase}
          trend={weeklyTrend}
        />
        <KpiCard
          title="Interview Rate"
          value={`${analytics.rates.interviewRate}%`}
          sub={`${analytics.totals.interviewed} interviews`}
          icon={TrendingUp}
          trend={analytics.rates.interviewRate >= 20 ? "up" : analytics.rates.interviewRate < 10 ? "down" : "flat"}
        />
        <KpiCard
          title="Avg ATS Score"
          value={analytics.avgAtsScore !== null ? `${analytics.avgAtsScore}/100` : "—"}
          sub="from scored resumes"
          icon={Target}
        />
        <KpiCard
          title="Offer Rate"
          value={`${analytics.rates.offerRate}%`}
          sub={`${analytics.totals.offered} offers`}
          icon={Trophy}
          trend={analytics.rates.offerRate > 0 ? "up" : "flat"}
        />
      </div>

      {/* Funnel + ATS History row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.funnel.map((stage, i) => (
                <div key={stage.stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{stage.stage}</span>
                    <span className="font-medium tabular-nums">
                      {stage.count} <span className="text-muted-foreground text-xs">({stage.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stage.pct}%`,
                        backgroundColor: FUNNEL_COLORS[i] ?? FUNNEL_COLORS[0],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-center text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Rejection Rate</p>
                <p className="font-semibold text-pra-danger tabular-nums">{analytics.rates.rejectionRate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Cover Letter Usage</p>
                <p className="font-semibold tabular-nums">
                  {analytics.coverLetterUsage.total > 0
                    ? `${Math.round((analytics.coverLetterUsage.used / analytics.coverLetterUsage.total) * 100)}%`
                    : "0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ATS Score History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ATS Score History</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.atsHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={analytics.atsHistory} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                No ATS scores yet. Score your resume on the ATS Checker.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status distribution bar chart */}
      {analytics.totals.applications > 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Application Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={[
                  { name: "Submitted", value: analytics.totals.applications - analytics.totals.screened },
                  { name: "Screened", value: analytics.totals.screened - analytics.totals.interviewed },
                  { name: "Interviewed", value: analytics.totals.interviewed - analytics.totals.offered },
                  { name: "Offered", value: analytics.totals.offered - analytics.totals.hired },
                  { name: "Hired", value: analytics.totals.hired },
                  { name: "Rejected", value: analytics.totals.rejected },
                ].filter(d => d.value > 0)}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Applications */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Applications</CardTitle>
            <Badge variant="secondary">{analytics.totals.applications} total</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentApplications.slice(0, 8).map((app) => {
              const statusCfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.submitted;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={app.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                  <StatusIcon className={`h-4 w-4 shrink-0 ${statusCfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.role}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.company ?? "Unknown company"} · {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {app.atsScore !== null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">ATS</p>
                        <p className="text-sm font-semibold tabular-nums">{app.atsScore}</p>
                      </div>
                    )}
                    {app.matchScore !== null && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Match</p>
                        <p className="text-sm font-semibold tabular-nums">{app.matchScore}%</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Win%</p>
                      <WinProbabilityBadge
                        appId={app.id}
                        atsScore={app.atsScore}
                        matchScore={app.matchScore}
                        role={app.role}
                        status={app.status}
                      />
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                      {statusCfg.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Application Insights
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshInsights}
              disabled={loadingInsights}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingInsights ? "animate-spin" : ""}`} />
              {insights ? "Refresh" : "Generate"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insights ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observations</p>
                <ul className="space-y-2">
                  {insights.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recommendations</p>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Target className="h-4 w-4 text-pra-success shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Generate AI-powered insights about your application strategy
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
