import { redirect } from "@/i18n/navigation";
import { FileText, FileStack, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUpload } from "@/components/candidate/resume-upload";
import { getCurrentUser, getCandidateFullProfile } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function MyResumesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const supabase = await createClient();
  const [{ resumes }, workspaceResume] = await Promise.all([
    getCandidateFullProfile(user.id),
    getWorkspaceResume(user.id),
  ]);

  // Re-sign every resume URL at request time — the stored file_url is a signed
  // URL generated at upload time with a 7-day TTL and may be expired.
  // The "resumes" bucket is private so getPublicUrl() always 403s; a fresh
  // 1-hour signed URL generated here is the correct pattern.
  const resumesWithUrls = await Promise.all(
    resumes.map(async (resume) => {
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(resume.file_path, 60 * 60);
      return { ...resume, viewUrl: signed?.signedUrl ?? null };
    })
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Resumes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and manage your resumes. Every upload runs the full AI pipeline — ATS scoring, profile population, and job matching.
        </p>
      </div>

      {/* Upload section — always visible, no navigation required */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Upload a Resume
        </h2>
        <ResumeUpload />
      </section>

      {/* AI Workspace Resume */}
      {workspaceResume && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            AI Workspace Resume
          </h2>
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
              <Badge variant="secondary">Active context</Badge>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Uploaded Resumes list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Uploaded Resumes ({resumes.length})
        </h2>

        {resumes.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No resumes uploaded yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use the upload area above to add your first resume.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {resumesWithUrls.map((resume) => (
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
                  {resume.parse_status.replace(/_/g, " ")}
                </Badge>
                {resume.viewUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={resume.viewUrl} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    View
                  </Button>
                )}
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
              Your AI workspace resume is shared context used across all tools — Cover Letters, Interview Prep,
              and Career Advisor. Upload a resume above, then set it as your workspace context from the AI tools.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
