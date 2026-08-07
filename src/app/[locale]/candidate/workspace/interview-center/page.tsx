import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/queries/candidate";
import { listMockInterviewSessions } from "@/lib/workspace/queries";
import { InterviewCenterClient } from "@/components/workspace/interview-center-client";

export default async function InterviewCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const sessions = await listMockInterviewSessions(user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          AI-powered mock interviews with real-time answer evaluation, scoring across 6 dimensions, and a full performance report.
        </p>
      </div>
      <InterviewCenterClient initialSessions={sessions} />
    </div>
  );
}
