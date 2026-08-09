import { notFound } from "next/navigation";

import { redirect } from "@/i18n/navigation";
import { FileText } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/shared/back-button";
import { getCandidateFullProfile, getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { formatDate, initials } from "@/lib/utils";

/**
 * Read-only candidate view for recruiters. RLS (is_candidate_visible_to_staff)
 * is the actual gate here -- getCandidateFullProfile returns nulls/empty
 * arrays for a candidate this recruiter's company can't see (never applied,
 * not in the talent pool, and didn't opt into is_open_to_work for one of
 * this company's jobs), which we treat as notFound() rather than rendering
 * an empty page.
 */
export default async function RecruiterCandidateDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/recruiter/dashboard", locale });

  const { candidate, profile, experience, education, skills, resumes } = await getCandidateFullProfile(id);
  if (!candidate || !profile) notFound();

  return (
    <div className="space-y-6">
      <BackButton />

      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
          <p className="text-sm text-muted-foreground">{candidate.current_position ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Years of experience</p>
            <p className="mt-1 text-lg font-semibold">{candidate.years_of_experience}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="mt-1 text-lg font-semibold">{candidate.location ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open to work</p>
            <p className="mt-1 text-lg font-semibold">{candidate.is_open_to_work ? "Yes" : "No"}</p>
          </CardContent>
        </Card>
      </div>

      {candidate.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{candidate.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {experience.length === 0 && <p className="text-sm text-muted-foreground">No experience listed.</p>}
          {experience.map((e) => (
            <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">
                {e.job_title} · {e.company_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.start_date ? formatDate(e.start_date) : "—"} —{" "}
                {e.is_current ? "Present" : e.end_date ? formatDate(e.end_date) : "—"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {education.length === 0 && <p className="text-sm text-muted-foreground">No education listed.</p>}
          {education.map((e) => (
            <div key={e.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{e.institution}</p>
              <p className="text-xs text-muted-foreground">
                {e.degree}
                {e.field_of_study ? ` · ${e.field_of_study}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills listed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <Badge key={s.id} variant="secondary">
                  {s.skill_name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resumes.length === 0 && <p className="text-sm text-muted-foreground">No resumes uploaded.</p>}
          {resumes.map((resume) => (
            <div key={resume.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{resume.file_name}</span>
                {resume.is_primary && <Badge variant="outline">Primary</Badge>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(resume.uploaded_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
