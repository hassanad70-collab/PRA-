import { redirect } from "@/i18n/navigation";
import { FileText, FileStack, Upload, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, getCandidateFullProfile } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { formatDate } from "@/lib/utils";

export default async function MyResumesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [{ resumes }, workspaceResume] = await Promise.all([
    getCandidateFullProfile(user.id),
    getWorkspaceResume(user.id),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your uploaded resumes and AI workspace resume context.
          </p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/candidate/resume`}>
            <Upload className="mr-2 h-4 w-4" /> Upload Resume
          </Link>
        </Button>
      </div>

      {workspaceResume && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">AI Workspace Resume</h2>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileStack className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{workspaceResume.file_name ?? "Pasted resume"}</p>
                  <p className="text-xs text-muted-foreground">
                    Source: {workspaceResume.source} · Updated {formatDate(workspaceResume.updated_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Active context</Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${locale}/candidate/resume`}>Replace</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Uploaded Resumes ({resumes.length})
        </h2>

        {resumes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No resumes uploaded yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload your resume to unlock AI job matching and ATS scoring.
                </p>
              </div>
              <Button asChild>
                <Link href={`/${locale}/candidate/resume`}>Upload Resume</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {resumes.map((resume) => (
          <Card key={resume.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{resume.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {resume.file_type ?? "PDF"} ·{" "}
                    {resume.file_size_bytes ? `${Math.round(resume.file_size_bytes / 1024)} KB` : "—"} ·{" "}
                    Uploaded {formatDate(resume.uploaded_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {resume.is_primary && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <Star className="h-3 w-3" /> Primary
                  </Badge>
                )}
                <Badge
                  variant={
                    resume.parse_status === "completed"
                      ? "success"
                      : resume.parse_status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize"
                >
                  {resume.parse_status.replace("_", " ")}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <a href={resume.file_url} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {!workspaceResume && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Set up AI Workspace Resume</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Your AI workspace resume is a shared context used across all AI tools — Cover Letters, Interview Prep,
              and Career Advisor.
            </p>
            <Button asChild variant="outline">
              <Link href={`/${locale}/candidate/resume`}>Upload to Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
