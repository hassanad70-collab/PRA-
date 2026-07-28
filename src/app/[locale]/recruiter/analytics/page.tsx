import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBreakdownChart, TimeToHireChart } from "@/components/shared/dynamic-charts";
import { CsvExportButton } from "@/components/recruiter/csv-export-button";
import { APPLICATION_SOURCES } from "@/lib/recruiter/analytics";
import { getHiringAnalytics } from "@/lib/queries/analytics";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

export default async function HiringAnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [analytics, t, tShared] = await Promise.all([
    getHiringAnalytics(recruiter.company_id),
    getTranslations("Recruiter.Analytics"),
    getTranslations("Recruiter.Shared"),
  ]);

  const sourceLabels = Object.fromEntries(APPLICATION_SOURCES.map((s) => [s, t(`source.${s}`)]));
  const funnelLabels: Record<string, string> = {
    submitted: tShared("applicationStatus.submitted"),
    screening: tShared("applicationStatus.screening"),
    shortlisted: tShared("applicationStatus.shortlisted"),
    interview: tShared("applicationStatus.interview"),
    offer: tShared("applicationStatus.offer"),
    hired: tShared("applicationStatus.hired"),
    rejected: tShared("applicationStatus.rejected"),
    withdrawn: tShared("applicationStatus.withdrawn"),
  };

  const sourceRows = Object.entries(analytics?.source_breakdown ?? {}).map(([source, count]) => ({
    source: sourceLabels[source] ?? source,
    count,
  }));
  const funnelRows = Object.entries(analytics?.funnel_drop_off ?? {}).map(([status, count]) => ({
    stage: funnelLabels[status] ?? status,
    count,
  }));
  const productivityRows = (analytics?.recruiter_productivity ?? []).map((r) => ({
    recruiter: r.recruiter_name ?? "—",
    applications: r.total_applications,
    hires: r.total_hires,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { company: recruiter.company?.name ?? "" })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("interviewConversionTitle")}</p>
            <p className="mt-1 text-2xl font-bold">{analytics?.interview_conversion_rate ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t("timeToHireTitle")}</CardTitle>
            <CsvExportButton rows={analytics?.time_to_hire_trend ?? []} filename="time-to-hire.csv" label={t("exportCsv")} />
          </CardHeader>
          <CardContent>
            <TimeToHireChart data={analytics?.time_to_hire_trend ?? []} noDataLabel={t("noTimeToHireData")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">{t("sourceBreakdownTitle")}</CardTitle>
            <CsvExportButton rows={sourceRows} filename="source-of-hire.csv" label={t("exportCsv")} />
          </CardHeader>
          <CardContent>
            <SourceBreakdownChart breakdown={analytics?.source_breakdown ?? {}} sourceLabels={sourceLabels} noDataLabel={t("noSourceData")} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("funnelDropOffTitle")}</CardTitle>
          <CsvExportButton rows={funnelRows} filename="funnel-drop-off.csv" label={t("exportCsv")} />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {funnelRows.map((row) => (
              <div key={row.stage} className="rounded-lg border border-border p-3 text-center">
                <p className="text-xs text-muted-foreground">{row.stage}</p>
                <p className="mt-1 text-xl font-bold">{row.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("recruiterProductivityTitle")}</CardTitle>
          <CsvExportButton rows={productivityRows} filename="recruiter-productivity.csv" label={t("exportCsv")} />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-start font-medium">{t("workloadRecruiter")}</th>
                  <th className="py-2 text-start font-medium">{t("productivityApplications")}</th>
                  <th className="py-2 text-start font-medium">{t("productivityHires")}</th>
                </tr>
              </thead>
              <tbody>
                {productivityRows.map((row) => (
                  <tr key={row.recruiter} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium">{row.recruiter}</td>
                    <td className="py-2">{row.applications}</td>
                    <td className="py-2">{row.hires}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
