import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { listInterviewSessions } from "@/lib/workspace/queries";
import { WorkspaceInterviewPrep } from "@/components/workspace/workspace-interview-prep";

export default async function WorkspaceInterviewPrepPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [resume, savedSessions] = await Promise.all([
    getWorkspaceResume(user.id),
    listInterviewSessions(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interview Preparation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get role-specific questions, model answers, and coaching tailored to your experience.
        </p>
      </div>

      <WorkspaceInterviewPrep
        workspaceResumeText={resume?.raw_text ?? null}
        initialSaved={savedSessions}
      />
    </div>
  );
}
