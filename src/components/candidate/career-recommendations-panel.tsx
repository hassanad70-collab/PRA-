"use client";

import { useTranslations } from "next-intl";
import {
  Award,
  Briefcase,
  Building2,
  ChevronRight,
  DollarSign,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { CareerRecommendationsResult, JobSearchRecommendation } from "@/types/job-discovery";

interface CareerRecommendationsPanelProps {
  data: CareerRecommendationsResult;
  onApplyRecommendation?: (rec: JobSearchRecommendation) => void;
}

const PRIORITY_VARIANT = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

export function CareerRecommendationsPanel({
  data,
  onApplyRecommendation,
}: CareerRecommendationsPanelProps) {
  const t = useTranslations("Candidate.Jobs");

  if (data.confidence === 0 && data.jobTitles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">{t("aiCareerEmpty")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("aiCareerEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with confidence */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("aiCareerTitle")}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.cached ? t("aiCareerCached") : t("aiCareerFresh")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{t("aiCareerConfidence")}</p>
          <div className="mt-1 flex items-center gap-2">
            <Progress value={data.confidence} className="w-20" />
            <span className="text-xs font-medium">{data.confidence}%</span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Job Title Recommendations */}
        {data.jobTitles.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4" />
                {t("aiCareerJobTitles")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.jobTitles.map((jt) => (
                <button
                  key={jt.title}
                  type="button"
                  onClick={() => onApplyRecommendation?.(jt)}
                  className="group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium group-hover:text-primary">{jt.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{jt.reason}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Career Path */}
        {data.careerPath.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                {t("aiCareerPath")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.careerPath.map((step, i) => (
                <div key={step.step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {step.step}
                    </div>
                    {i < data.careerPath.length - 1 && (
                      <div className="mt-1 h-full w-px bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.timeframe}</p>
                    {step.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Skills to Learn */}
        {data.skillsToLearn.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4" />
                {t("aiCareerSkills")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.skillsToLearn.map((skill) => (
                <div key={skill.skill} className="flex items-start gap-3">
                  <Badge
                    variant={PRIORITY_VARIANT[skill.priority]}
                    className="mt-0.5 flex-shrink-0 text-xs capitalize"
                  >
                    {skill.priority}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{skill.skill}</p>
                    <p className="text-xs text-muted-foreground">{skill.reason}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Certifications */}
        {data.certifications.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4" />
                {t("aiCareerCertifications")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.certifications.map((cert) => (
                <div key={cert.name}>
                  <p className="text-sm font-medium">{cert.name}</p>
                  <p className="text-xs text-muted-foreground">{cert.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Industries */}
        {data.industries.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                {t("aiCareerIndustries")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.industries.map((ind) => (
                <div key={ind.industry}>
                  <p className="text-sm font-medium">{ind.industry}</p>
                  <p className="text-xs text-muted-foreground">{ind.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Salary Range */}
        {data.salaryRange && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4" />
                {t("aiCareerSalary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {data.salaryRange.currency}{" "}
                {data.salaryRange.min.toLocaleString()}–{data.salaryRange.max.toLocaleString()}
              </p>
              {data.salaryRange.note && (
                <p className="mt-1 text-xs text-muted-foreground">{data.salaryRange.note}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next Position */}
      {data.nextPosition && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-primary">
              {t("aiCareerNextPosition")}
            </p>
            <p className="text-lg font-semibold">{data.nextPosition.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{data.nextPosition.timeframe}</p>
            {data.nextPosition.requirements.length > 0 && (
              <ul className="mt-3 space-y-1">
                {data.nextPosition.requirements.map((req) => (
                  <li key={req} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function CareerRecommendationsPanelSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  );
}
