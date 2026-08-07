import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getApplicationAnalytics, getRecentApplicationsWithContext } from "@/lib/workspace/application-analytics";
import { AppIntelligenceDashboard } from "@/components/workspace/app-intelligence-dashboard";

export default async function AppIntelligencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [analytics, recentApplications] = await Promise.all([
    getApplicationAnalytics(user!.id),
    getRecentApplicationsWithContext(user!.id, 10),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Application Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Analytics and AI-powered insights across all your job applications.
        </p>
      </div>
      <AppIntelligenceDashboard analytics={analytics} recentApplications={recentApplications} />
    </div>
  );
}
