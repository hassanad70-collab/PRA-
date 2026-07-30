import { Activity, BarChart3, Bell, Bookmark, Briefcase, Database, FileText, Search, Sparkles, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AtsDistributionChart,
  DailyActivityChart,
  MonthlyGrowthChart,
} from "@/components/shared/dynamic-charts";
import { formatBytes } from "@/lib/utils";
import {
  getAtsScoreDistribution,
  getCompaniesForFilter,
  getDailyActivity,
  getMonthlyGrowthMetrics,
  getPlatformAnalytics,
  getSearchAnalytics,
} from "@/actions/admin-analytics";

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; company_id?: string }>;
}) {
  const params = await searchParams;

  const [analytics, monthlyGrowth, atsDistribution, dailyActivity, companies, searchAnalytics] = await Promise.all([
    getPlatformAnalytics(params.from, params.to, params.company_id),
    getMonthlyGrowthMetrics(12, params.company_id),
    getAtsScoreDistribution(params.company_id),
    getDailyActivity(30, params.company_id),
    getCompaniesForFilter(),
    getSearchAnalytics(),
  ]);

  const a = analytics;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Executive Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platform-wide KPIs and trends across all companies.
          </p>
        </div>

        <form className="flex flex-wrap gap-2">
          <input
            name="from"
            type="date"
            defaultValue={params.from}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
          />
          <input
            name="to"
            type="date"
            defaultValue={params.to}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
          />
          <select
            name="company_id"
            defaultValue={params.company_id ?? ""}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total Companies" value={a?.total_companies ?? 0} icon={Briefcase} />
        <KpiCard label="Total Users" value={a?.total_users ?? 0} icon={Users} />
        <KpiCard label="Candidates" value={a?.total_candidates ?? 0} icon={Users} />
        <KpiCard label="Recruiters" value={a?.total_recruiters ?? 0} icon={Users} />
        <KpiCard label="Total Jobs" value={a?.total_jobs ?? 0} sub={`${a?.active_jobs ?? 0} active`} icon={Briefcase} />
        <KpiCard label="Total Applications" value={a?.total_applications ?? 0} icon={FileText} />
        <KpiCard label="Total Resumes" value={a?.total_resumes ?? 0} icon={FileText} />
        <KpiCard label="Total Interviews" value={a?.total_interviews ?? 0} icon={Activity} />
      </div>

      {/* Date-range KPIs */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">In selected date range</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="New Applications" value={a?.new_applications_in_range ?? 0} icon={TrendingUp} />
          <KpiCard label="Today" value={a?.new_applications_today ?? 0} icon={Activity} />
          <KpiCard label="This Week" value={a?.new_applications_this_week ?? 0} icon={BarChart3} />
          <KpiCard label="This Month" value={a?.new_applications_this_month ?? 0} icon={BarChart3} />
        </div>
      </div>

      {/* Conversion metrics */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Conversion & quality</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label="Avg ATS Score"
            value={a?.avg_ats_score != null ? `${a.avg_ats_score}%` : "—"}
            icon={BarChart3}
          />
          <KpiCard
            label="Interview Rate"
            value={a?.interview_conversion_rate != null ? `${a.interview_conversion_rate}%` : "—"}
            icon={TrendingUp}
          />
          <KpiCard
            label="Offer Acceptance"
            value={a?.offer_acceptance_rate != null ? `${a.offer_acceptance_rate}%` : "—"}
            icon={TrendingUp}
          />
          <KpiCard
            label="Avg Days to Hire"
            value={a?.avg_days_to_hire != null ? `${a.avg_days_to_hire}d` : "—"}
            icon={Activity}
          />
        </div>
      </div>

      {/* Resume parse health */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Resume parse pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Parsed OK" value={a?.parse_success_count ?? 0} icon={FileText} />
          <KpiCard label="Partial" value={a?.parse_partial_count ?? 0} icon={FileText} />
          <KpiCard label="Failed" value={a?.parse_failed_count ?? 0} icon={FileText} />
          <KpiCard label="Pending" value={a?.parse_pending_count ?? 0} icon={FileText} />
        </div>
      </div>

      {/* Storage */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard
          label="Resume Storage"
          value={formatBytes(a?.storage_bytes ?? 0)}
          icon={Database}
        />
        <Card>
          <CardContent className="p-5">
            <p className="mb-2 text-xs text-muted-foreground">Hiring funnel</p>
            {a?.hiring_funnel ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(a.hiring_funnel).map(([status, count]) => (
                  <Badge key={status} variant="secondary">
                    {status}: {count}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Discovery Analytics */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Job Discovery & Search Intelligence</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Searches" value={searchAnalytics?.total_searches ?? 0} sub={`${searchAnalytics?.searches_today ?? 0} today`} icon={Search} />
          <KpiCard label="Unique Searchers" value={searchAnalytics?.unique_searchers ?? 0} sub={`${searchAnalytics?.searches_this_week ?? 0} this week`} icon={Users} />
          <KpiCard label="Saved Searches" value={searchAnalytics?.total_saved_searches ?? 0} icon={Bookmark} />
          <KpiCard label="Active Alerts" value={searchAnalytics?.total_active_alerts ?? 0} sub={`of ${searchAnalytics?.total_alerts ?? 0} total`} icon={Bell} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-1">
          <KpiCard label="AI Career Recs Cached" value={searchAnalytics?.ai_recs_cached ?? 0} sub="24h TTL cache" icon={Sparkles} />
        </div>
      </div>

      {/* Top Searched Terms */}
      {(searchAnalytics?.top_queries?.length || 0) > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Job Titles Searched</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(searchAnalytics?.top_queries ?? []).map((q, i) => (
                  <div key={q.term} className="flex items-center gap-2">
                    <span className="w-5 flex-shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{q.term}</span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">×{q.count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted">
                        <div
                          className="h-1 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (q.count / (searchAnalytics?.top_queries?.[0]?.count ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Keywords</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(searchAnalytics?.top_keywords ?? []).map((q, i) => (
                  <div key={q.term} className="flex items-center gap-2">
                    <span className="w-5 flex-shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{q.term}</span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">×{q.count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted">
                        <div
                          className="h-1 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (q.count / (searchAnalytics?.top_keywords?.[0]?.count ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(searchAnalytics?.top_locations ?? []).map((q, i) => (
                  <div key={q.term} className="flex items-center gap-2">
                    <span className="w-5 flex-shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-medium">{q.term}</span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">×{q.count}</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted">
                        <div
                          className="h-1 rounded-full bg-primary"
                          style={{ width: `${Math.min(100, (q.count / (searchAnalytics?.top_locations?.[0]?.count ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Growth (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyGrowthChart data={monthlyGrowth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ATS Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <AtsDistributionChart data={atsDistribution} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Daily Application Activity (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyActivityChart data={dailyActivity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
