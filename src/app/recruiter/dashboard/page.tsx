import { redirect } from "next/navigation";
import { Briefcase, Star, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelChart } from "@/components/recruiter/charts/funnel-chart";
import { TopSkillsChart } from "@/components/recruiter/charts/top-skills-chart";
import { TrendChart } from "@/components/recruiter/charts/trend-chart";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getCompanyDashboardStats, getMonthlyApplicationTrend, getTopSkills } from "@/lib/queries/dashboard";
import { getRecruiterContext } from "@/lib/queries/jobs";

export default async function RecruiterDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  const [stats, trend, topSkills] = await Promise.all([
    getCompanyDashboardStats(recruiter.company_id),
    getMonthlyApplicationTrend(recruiter.company_id),
    getTopSkills(recruiter.company_id),
  ]);

  const kpis = [
    { label: "Open jobs", value: stats?.open_jobs ?? 0, icon: Briefcase },
    { label: "Total candidates", value: stats?.total_candidates ?? 0, icon: Users },
    { label: "Applications this month", value: stats?.applications_this_month ?? 0, icon: TrendingUp },
    { label: "Avg. ATS score", value: stats?.average_ats_score ?? "—", icon: Star },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">HR Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{recruiter.company?.name} · Recruitment overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <kpi.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Applications over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hiring funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart funnel={stats?.hiring_funnel ?? {}} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top candidate skills</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSkillsChart data={topSkills} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Applications today</p>
            <p className="mt-1 text-2xl font-bold">{stats?.applications_today ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Closed jobs</p>
            <p className="mt-1 text-2xl font-bold">{stats?.closed_jobs ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Offer acceptance rate</p>
            <p className="mt-1 text-2xl font-bold">{stats?.offer_acceptance_rate ?? 0}%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
