import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { ArrowRight, FileText, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AtsScoreCard } from "@/components/candidate/ats-score-card";
import { ResumeHealthChecklist } from "@/components/candidate/resume-intelligence/health-checklist";
import { ResumeUpload } from "@/components/candidate/resume-upload";
import { SetPrimaryButton } from "@/components/candidate/set-primary-button";
import { ImproveResumeDialog } from "@/components/shared/dynamic-dialogs";
import { getCandidateFullProfile, getCurrentUser, getLatestAtsScore } from "@/lib/queries/candidate";
import { runStructuralChecks } from "@/lib/resume-intelligence/structural-checks";
import { formatRelativeTime } from "@/lib/utils";

export default async function ResumePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [{ resumes }, atsScore, t, tShared, tResumeIntelligence] = await Promise.all([
    getCandidateFullProfile(user.id),
    getLatestAtsScore(user.id),
    getTranslations("Candidate.Resume"),
    getTranslations("Candidate.Shared"),
    getTranslations("Candidate.ResumeIntelligence"),
  ]);

  const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0];
  const scoredResume = atsScore ? resumes.find((r) => r.id === atsScore.resume_id) : undefined;
  const structuralChecks = scoredResume?.raw_text ? runStructuralChecks(scoredResume.raw_text, scoredResume.parsed_data ?? {}) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{t("builderTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("builderSubtitle")}</p>
            </div>
          </div>
          <Button variant="gradient" asChild>
            <Link href="/candidate/resume-builder">
              {t("openBuilder")} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ResumeUpload />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("yourResumes")}</CardTitle>
            {primaryResume?.parse_status === "completed" && <ImproveResumeDialog resumeId={primaryResume.id} />}
          </CardHeader>
          <CardContent className="space-y-3">
            {resumes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("noResumes")}</p>
            )}
            {resumes.map((resume) => (
              <div key={resume.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{resume.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tShared("uploaded", { time: formatRelativeTime(resume.uploaded_at) })} ·{" "}
                      <span className="capitalize">{resume.parse_status}</span>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {resume.is_primary ? (
                    <Badge variant="success">
                      <Star className="me-1 h-3 w-3" /> {t("primary")}
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
              {t("noAtsScoreYet")}
            </CardContent>
          </Card>
        )}
      </div>

      {structuralChecks && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{tResumeIntelligence("scoreHealthTitle")}</h2>
          <ResumeHealthChecklist checks={structuralChecks} />
        </div>
      )}
    </div>
  );
}
