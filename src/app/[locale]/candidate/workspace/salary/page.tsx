import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { listSalaryEstimates, listCareerReports } from "@/lib/workspace/queries";
import { SalaryInsightsClient } from "@/components/workspace/salary-insights-client";

export default async function SalaryInsightsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [estimates, reports] = await Promise.all([
    listSalaryEstimates(user.id),
    listCareerReports(user.id),
  ]);

  const latestTargetRole = reports[0]?.target_role ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salary Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get AI-estimated salary ranges for any role. Results are estimates based on general knowledge, not real-time market data.
        </p>
      </div>

      <SalaryInsightsClient initialEstimates={estimates} latestTargetRole={latestTargetRole} />
    </div>
  );
}
