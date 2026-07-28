import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { CheckCircle2, MessageSquare, Sparkles, XCircle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import { CandidateInsightPanel } from "@/components/recruiter/candidate-insight-panel";
import { DraftMessageDialog } from "@/components/recruiter/draft-message-dialog";
import { InterviewList } from "@/components/recruiter/interview-list";
import { ScheduleInterviewDialog } from "@/components/recruiter/schedule-interview-dialog";
import { StatusSelect } from "@/components/recruiter/status-select";
import { getApplicationDetail } from "@/lib/queries/applications";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getInterviewsForApplication } from "@/lib/queries/interviews";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { formatRelativeTime, initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string; locale: string }> }) {
  const { applicationId, locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const app = await getApplicationDetail(applicationId);
  if (!app || app.job?.company_id !== recruiter.company_id) notFound();

  const interviews = await getInterviewsForApplication(applicationId);
  const t = await getTranslations("Recruiter.ApplicationDetail");
  const screening = app.screening_result;
  const match = app.job_match?.[0];
  const ats = app.ats_score?.[0];
  const candidateProfile = app.candidate?.profile;
  const parsed = app.resume?.parsed_data;

  const competencyScores: [string, number | null | undefined][] = screening
    ? [
        [t("competencyExperience"), screening.experience_score],
        [t("competencySkillMatch"), screening.skill_match_score],
        [t("competencyEducationMatch"), screening.education_match_score],
        [t("competencyCultureFit"), screening.culture_fit_score],
        [t("competencyLeadership"), screening.leadership_score],
        [t("competencyCommunication"), screening.communication_score],
        [t("competencyTechnical"), screening.technical_score],
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
                {t("appliedTo", { position: app.candidate?.current_position ?? "—", job: app.job?.title ?? "" })}
              </p>
              <p className="text-xs text-muted-foreground">{t("appliedTime", { time: formatRelativeTime(app.applied_at) })}</p>
            </div>
          </div>
          <StatusSelect applicationId={app.id} status={app.status as ApplicationStatus} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t("interviewsTitle")}</CardTitle>
          <div className="flex items-center gap-2">
            <DraftMessageDialog applicationId={app.id} />
            <ScheduleInterviewDialog applicationId={app.id} jobId={app.job_id} />
          </div>
        </CardHeader>
        <CardContent>
          <InterviewList applicationId={app.id} interviews={interviews} />
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-3">
        {screening && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <ScoreRing score={screening.overall_score ?? 0} size={80} label={t("aiScoreLabel")} />
              <Badge variant="outline" className="mt-2 capitalize">
                {screening.interview_recommendation?.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>
        )}
        {match && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <ScoreRing score={match.match_score} size={80} label={t("jobMatchLabel")} />
              <p className="mt-2 text-xs text-muted-foreground">
                {t("interviewProbability", { percent: Math.round(match.interview_probability ?? 0) })}
              </p>
            </CardContent>
          </Card>
        )}
        {ats && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 pt-6">
              <ScoreRing score={ats.overall_score} size={80} label={t("atsScoreLabel")} />
            </CardContent>
          </Card>
        )}
      </div>

      {screening && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> {t("aiScreeningSummaryTitle")}
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

      {screening && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> {t("insightTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateInsightPanel
              applicationId={app.id}
              initialInsight={
                screening.insight_generated_at
                  ? {
                      risks: screening.risks,
                      red_flags: screening.red_flags,
                      hiring_confidence_score: screening.hiring_confidence_score,
                      suggested_interview_focus: screening.suggested_interview_focus,
                      suggested_questions: screening.suggested_questions,
                      insight_generated_at: screening.insight_generated_at,
                    }
                  : null
              }
              labels={{
                title: t("insightTitle"),
                generate: t("generateInsight"),
                regenerate: t("regenerateInsight"),
                generating: t("generatingInsight"),
                notGeneratedYet: t("insightNotGeneratedYet"),
                hiringConfidence: t("hiringConfidence"),
                risksLabel: t("risksLabel"),
                noRisks: t("noRisks"),
                redFlagsLabel: t("redFlagsLabel"),
                noRedFlags: t("noRedFlags"),
                suggestedFocusLabel: t("suggestedFocusLabel"),
                suggestedQuestionsLabel: t("suggestedQuestionsLabel"),
                generatedAt: t("insightGeneratedAt", { time: "{time}" }),
                generateFailed: t("insightGenerateFailed"),
              }}
            />
          </CardContent>
        </Card>
      )}

      {match && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("jobMatchAnalysisTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {!!match.strengths?.length && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {t("strengths")}
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
                  <XCircle className="h-4 w-4 text-destructive" /> {t("weaknesses")}
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
                <p className="mb-2 text-sm font-medium">{t("missingSkills")}</p>
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
                <p className="mb-2 text-sm font-medium">{t("recommendedToLearn")}</p>
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
            <CardTitle className="text-base">{t("resumeSummaryTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">{parsed.summary}</p>
            <div>
              <p className="mb-2 font-medium">{t("skillsLabel")}</p>
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
                <p className="mb-2 font-medium">{t("experienceLabel")}</p>
                <div className="space-y-2">
                  {parsed.experience.map((e: NonNullable<typeof parsed.experience>[number]) => (
                    <div key={`${e.company_name}-${e.job_title}`} className="rounded-lg border border-border p-3">
                      <p className="font-medium">
                        {e.job_title} · {e.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.start_date} — {e.is_current ? t("present") : e.end_date}
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
              <MessageSquare className="h-4 w-4" /> {t("coverLetterTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("coverLetterNote")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
