import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import {
  Briefcase,
  Calendar,
  Clock,
  Handshake,
  Percent,
  Plus,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentChart, FunnelChart, TopSkillsChart, TrendChart } from "@/components/shared/dynamic-charts";
import { getCurrentUser } from "@/lib/queries/candidate";
import {
  getCompanyDashboardStats,
  getMonthlyApplicationTrend,
  getRecentHires,
  getTopSkills,
  getUpcomingInterviews,
} from "@/lib/queries/dashboard";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getRecentActivity } from "@/lib/queries/activity-feed";
import { formatDate, formatRelativeTime, initials } from "@/lib/utils";

export default async function RecruiterDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [stats, trend, topSkills, upcomingInterviews, recentHires, recentActivity, t, tShared] = await Promise.all([
    getCompanyDashboardStats(recruiter.company_id),
    getMonthlyApplicationTrend(recruiter.company_id),
    getTopSkills(recruiter.company_id),
    getUpcomingInterviews(recruiter.company_id),
    getRecentHires(recruiter.company_id),
    getRecentActivity(recruiter.company_id),
    getTranslations("Recruiter.Dashboard"),
    getTranslations("Recruiter.Shared"),
  ]);

  const kpis = [
    { label: t("kpiOpenJobs"), value: stats?.open_jobs ?? 0, icon: Briefcase },
    { label: t("kpiActiveCandidates"), value: stats?.total_candidates ?? 0, icon: Users },
    { label: t("kpiInterviewsScheduled"), value: stats?.interviews_scheduled ?? 0, icon: Calendar },
    { label: t("kpiOffersPending"), value: stats?.offers_pending ?? 0, icon: Handshake },
    { label: t("kpiHiresThisMonth"), value: stats?.hires_this_month ?? 0, icon: UserCheck },
    {
      label: t("kpiTimeToHire"),
      value: stats?.avg_time_to_hire_days != null ? t("kpiTimeToHireValue", { days: stats.avg_time_to_hire_days }) : "—",
      icon: Clock,
    },
    {
      label: t("kpiHiringVelocity"),
      value: t("kpiHiringVelocityValue", { count: stats?.hires_last_30_days ?? 0 }),
      icon: Zap,
    },
    { label: t("kpiOfferAcceptanceRate"), value: `${stats?.offer_acceptance_rate ?? 0}%`, icon: Percent },
  ];

  const funnelStageLabels = {
    submitted: tShared("applicationStatus.submitted"),
    screening: tShared("applicationStatus.screening"),
    shortlisted: tShared("applicationStatus.shortlisted"),
    interview: tShared("applicationStatus.interview"),
    offer: tShared("applicationStatus.offer"),
    hired: tShared("applicationStatus.hired"),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { company: recruiter.company?.name ?? "" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gradient" asChild size="sm">
            <Link href="/recruiter/jobs/new">
              <Plus className="h-4 w-4" /> {t("quickActionPostJob")}
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/recruiter/jobs">
              <Users className="h-4 w-4" /> {t("quickActionViewCandidates")}
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/recruiter/interviews">
              <Calendar className="h-4 w-4" /> {t("quickActionInterviews")}
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/recruiter/settings/team">
              <UserPlus className="h-4 w-4" /> {t("quickActionInviteTeammate")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between pt-6">
              <div className="min-w-0">
                <p className="truncate text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-2xl font-bold">{kpi.value}</p>
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
            <CardTitle className="text-base">{t("chartApplicationsOverTime")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trend} noDataLabel={t("noApplicationData")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("chartHiringFunnel")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart funnel={stats?.hiring_funnel ?? {}} stageLabels={funnelStageLabels} noDataLabel={t("noFunnelData")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("chartTopSkills")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TopSkillsChart data={topSkills} noDataLabel={t("noSkillData")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("chartDepartmentBreakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DepartmentChart
              breakdown={stats?.department_breakdown ?? {}}
              unspecifiedLabel={t("unspecifiedDepartment")}
              noDataLabel={t("noDepartmentData")}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("recruiterWorkloadTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!stats?.recruiter_workload.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("workloadEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-start text-xs text-muted-foreground">
                    <th className="py-2 text-start font-medium">{t("workloadRecruiter")}</th>
                    <th className="py-2 text-start font-medium">{t("workloadOpenJobs")}</th>
                    <th className="py-2 text-start font-medium">{t("workloadActiveApplications")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recruiter_workload.map((row) => (
                    <tr key={row.recruiter_id ?? "unassigned"} className="border-b border-border last:border-0">
                      <td className="py-2 font-medium">{row.recruiter_name ?? t("workloadUnassigned")}</td>
                      <td className="py-2">{row.open_jobs}</td>
                      <td className="py-2">{row.active_applications}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-base">{t("activityFeedTitle")}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("activityFeedSubtitle")}</p>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("activityFeedEmpty")}</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/recruiter${item.href.replace("/recruiter", "")}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent"
                >
                  <span className="shrink-0 text-base">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(item.occurred_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("upcomingInterviewsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingInterviews.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("upcomingInterviewsEmpty")}</p>
            )}
            {upcomingInterviews.map((iv) => (
              <Link
                key={iv.id}
                href={`/recruiter/applications/${iv.application_id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{iv.application?.candidate?.profile?.full_name ?? tShared("candidateFallback")}</p>
                  <p className="truncate text-xs text-muted-foreground">{iv.application?.job?.title}</p>
                </div>
                <Badge variant="warning" className="shrink-0">
                  {formatDate(iv.scheduled_at)}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("recentHiresTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentHires.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("recentHiresEmpty")}</p>
            )}
            {recentHires.map((hire) => (
              <Link
                key={hire.id}
                href={`/recruiter/applications/${hire.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-semibold text-success">
                  {initials(hire.candidate?.profile?.full_name ?? "?")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{hire.candidate?.profile?.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{hire.job?.title}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(hire.updated_at)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
