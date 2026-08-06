import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { listCareerReports } from "@/lib/workspace/queries";
import { WorkspaceCareerAdvisor } from "@/components/workspace/workspace-career-advisor";

export default async function WorkspaceCareerAdvisorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [resume, savedReports] = await Promise.all([
    getWorkspaceResume(user.id),
    listCareerReports(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Career Advisor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a personalized career roadmap, skill gap analysis, and actionable next steps.
        </p>
      </div>

      <WorkspaceCareerAdvisor
        workspaceResumeText={resume?.raw_text ?? null}
        initialSaved={savedReports}
      />
    </div>
  );
}
