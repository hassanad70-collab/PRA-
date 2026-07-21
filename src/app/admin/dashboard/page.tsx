import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  GraduationCap,
  HardDrive,
  Send,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelChart } from "@/components/recruiter/charts/funnel-chart";
import { TopSkillsChart } from "@/components/recruiter/charts/top-skills-chart";
import { MonthlyCountChart } from "@/components/admin/charts/monthly-count-chart";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import {
  getAdminAuditLogs,
  getAdminDashboardStats,
  getMonthlyApplicationsTrend,
  getMonthlyCandidatesTrend,
  getMonthlyJobsTrend,
  getTopCompaniesByJobs,
  getTopRecruitersByActivity,
} from "@/lib/queries/admin";

export default async function AdminDashboardPage() {
  const [stats, applicationsTrend, candidatesTrend, jobsTrend, topCompanies, topRecruiters, recentActivity] =
    await Promise.all([
      getAdminDashboardStats(),
      getMonthlyApplicationsTrend(),
      getMonthlyCandidatesTrend(),
      getMonthlyJobsTrend(),
      getTopCompaniesByJobs(5),
      getTopRecruitersByActivity(5),
      getAdminAuditLogs({ page: 1, pageSize: 8 }),
    ]);

  const kpis = [
    { label: "Total companies", value: stats?.total_companies ?? 0, icon: Building2 },
    { label: "Total recruiters", value: stats?.total_recruiters ?? 0, icon: UserCog },
    { label: "Total candidates", value: stats?.total_candidates ?? 0, icon: GraduationCap },
    { label: "Active jobs", value: stats?.active_jobs ?? 0, icon: Briefcase },
    { label: "Published jobs", value: stats?.published_jobs ?? 0, icon: Send },
    { label: "Total applications", value: stats?.total_applications ?? 0, icon: FileText },
    { label: "Interviews", value: stats?.total_interviews ?? 0, icon: Calendar },
    { label: "Resume uploads", value: stats?.total_resumes ?? 0, icon: Users },
    { label: "AI requests", value: "Not tracked", icon: Sparkles, subtext: "No usage-metering table yet" },
    { label: "Storage used", value: formatBytes(stats?.storage_bytes ?? 0), icon: HardDrive, subtext: "Resume files only" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform-wide overview across every company.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
                {"subtext" in kpi && kpi.subtext && <p className="mt-0.5 text-xs text-muted-foreground">{kpi.subtext}</p>}
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <kpi.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications per month</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCountChart data={applicationsTrend} color="#6366f1" emptyLabel="No applications yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New candidates per month</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCountChart data={candidatesTrend} color="#22c55e" emptyLabel="No new candidates yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs created per month</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyCountChart data={jobsTrend} color="#f59e0b" emptyLabel="No jobs created yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hiring funnel (platform-wide)</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart funnel={stats?.hiring_funnel ?? {}} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top companies by applications</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSkillsChart data={topCompanies.map((c) => ({ name: c.company_name, count: c.applications_count }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top recruiters by applications</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSkillsChart data={topRecruiters.map((r) => ({ name: r.full_name, count: r.applications_count }))} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <Link href="/admin/audit-logs" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity.rows.length === 0 && <p className="text-sm text-muted-foreground">No activity recorded yet.</p>}
          {recentActivity.rows.map((log) => {
            const actor = log.actor as { full_name?: string; email?: string } | null;
            return (
              <div key={log.id as string} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{(log.action as string).replace(/_/g, " ")}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {actor?.full_name ?? "System"} · {log.entity_type as string}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {formatRelativeTime(log.created_at as string)}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
