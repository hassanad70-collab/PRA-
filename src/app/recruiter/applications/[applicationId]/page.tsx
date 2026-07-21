import { notFound, redirect } from "next/navigation";
import { CheckCircle2, MessageSquare, Sparkles, XCircle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import { StatusSelect } from "@/components/recruiter/status-select";
import { getApplicationDetail } from "@/lib/queries/applications";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { formatRelativeTime, initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  const app = await getApplicationDetail(applicationId);
  if (!app || app.job?.company_id !== recruiter.company_id) notFound();

  const screening = app.screening_result?.[0];
  const match = app.job_match?.[0];
  const ats = app.ats_score?.[0];
  const candidateProfile = app.candidate?.profile;
  const parsed = app.resume?.parsed_data;

  const competencyScores: [string, number | null | undefined][] = screening
    ? [
        ["Experience", screening.experience_score],
        ["Skill match", screening.skill_match_score],
        ["Education match", screening.education_match_score],
        ["Culture fit", screening.culture_fit_score],
        ["Leadership", screening.leadership_score],
        ["Communication", screening.communication_score],
        ["Technical", screening.technical_score],
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg">{initials(candidateProfile?.full_name ?? "?")}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">{candidateProfile?.full_name}</h1>
              <p className="text-sm text-muted-foreground">
                {app.candidate?.current_position ?? "—"} · Applied to {app.job?.title}
              </p>
              <p className="text-xs text-muted-foreground">Applied {formatRelativeTime(app.applied_at)}</p>
            </div>
          </div>
          <StatusSelect applicationId={app.id} status={app.status as ApplicationStatus} />
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-3">
        {screening && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <ScoreRing score={screening.overall_score ?? 0} size={80} label="AI Score" />
              <Badge variant="outline" className="mt-2 capitalize">
                {screening.interview_recommendation?.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>
        )}
        {match && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <ScoreRing score={match.match_score} size={80} label="Job Match" />
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.round(match.interview_probability ?? 0)}% interview probability
              </p>
            </CardContent>
          </Card>
        )}
        {ats && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <ScoreRing score={ats.overall_score} size={80} label="ATS Score" />
            </CardContent>
          </Card>
        )}
      </div>

      {screening && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> AI Screening Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{screening.ai_summary}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {competencyScores.map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span className="font-medium text-foreground">{value ?? "—"}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                      style={{ width: `${value ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {match && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Match Analysis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {!!match.strengths?.length && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Strengths
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {match.strengths.map((s: string) => (
                    <li key={s}>• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!match.weaknesses?.length && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <XCircle className="h-4 w-4 text-destructive" /> Weaknesses
                </p>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {match.weaknesses.map((w: string) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!match.missing_skills?.length && (
              <div>
                <p className="mb-2 text-sm font-medium">Missing skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.missing_skills.map((s: string) => (
                    <Badge key={s} variant="outline">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {!!match.recommended_skills?.length && (
              <div>
                <p className="mb-2 text-sm font-medium">Recommended to learn</p>
                <div className="flex flex-wrap gap-1.5">
                  {match.recommended_skills.map((s: string) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resume Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{parsed.summary}</p>
            <div>
              <p className="mb-2 font-medium">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {(parsed.skills ?? []).map((s: string) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            {!!parsed.experience?.length && (
              <div>
                <p className="mb-2 font-medium">Experience</p>
                <div className="space-y-2">
                  {parsed.experience.map((e: NonNullable<typeof parsed.experience>[number]) => (
                    <div key={`${e.company_name}-${e.job_title}`} className="rounded-lg border border-border p-3">
                      <p className="font-medium">
                        {e.job_title} · {e.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.start_date} — {e.is_current ? "Present" : e.end_date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {app.cover_letter_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Cover Letter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">See candidate application for full cover letter text.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
