import { redirect } from "next/navigation";
import { FileText, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtsScoreCard } from "@/components/candidate/ats-score-card";
import { ImproveResumeDialog } from "@/components/candidate/improve-resume-dialog";
import { ResumeUpload } from "@/components/candidate/resume-upload";
import { SetPrimaryButton } from "@/components/candidate/set-primary-button";
import { getCandidateFullProfile, getCurrentUser, getLatestAtsScore } from "@/lib/queries/candidate";
import { formatRelativeTime } from "@/lib/utils";

export default async function ResumePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ resumes }, atsScore] = await Promise.all([
    getCandidateFullProfile(user.id),
    getLatestAtsScore(user.id),
  ]);

  const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resume & ATS Score</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume for instant AI parsing, ATS scoring, and job matching.
        </p>
      </div>

      <ResumeUpload />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your resumes</CardTitle>
            {primaryResume?.parse_status === "completed" && <ImproveResumeDialog resumeId={primaryResume.id} />}
          </CardHeader>
          <CardContent className="space-y-3">
            {resumes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No resumes uploaded yet.</p>
            )}
            {resumes.map((resume) => (
              <div key={resume.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {formatRelativeTime(resume.uploaded_at)} ·{" "}
                      <span className="capitalize">{resume.parse_status}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {resume.is_primary ? (
                    <Badge variant="success">
                      <Star className="mr-1 h-3 w-3" /> Primary
                    </Badge>
                  ) : (
                    <SetPrimaryButton resumeId={resume.id} />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {atsScore ? (
          <AtsScoreCard score={atsScore} />
        ) : (
          <Card>
            <CardContent className="flex h-full items-center justify-center py-16 text-center text-sm text-muted-foreground">
              Your ATS score will appear here once a resume finishes AI processing.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
