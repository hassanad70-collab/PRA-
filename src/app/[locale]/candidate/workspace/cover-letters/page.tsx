import { redirect } from "@/i18n/navigation";

import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { listCoverLetters } from "@/lib/workspace/queries";
import { WorkspaceCoverLetter } from "@/components/workspace/workspace-cover-letter";

export default async function WorkspaceCoverLettersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [resume, savedCoverLetters] = await Promise.all([
    getWorkspaceResume(user.id),
    listCoverLetters(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cover Letters</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate tailored cover letters in seconds using your resume and the job description.
        </p>
      </div>

      <WorkspaceCoverLetter
        workspaceResumeText={resume?.raw_text ?? null}
        initialSaved={savedCoverLetters}
      />
    </div>
  );
}
