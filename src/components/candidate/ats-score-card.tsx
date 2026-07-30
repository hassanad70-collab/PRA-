"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import type { AtsScore } from "@/types/database";

export function AtsScoreCard({ score }: { score: AtsScore }) {
  const t = useTranslations("Candidate.AtsScoreCard");
  const tAtsChecker = useTranslations("AtsChecker");

  const subScores: [string, number | null][] = [
    [tAtsChecker("subScores.experience"), score.experience_score],
    [tAtsChecker("subScores.skills"), score.skills_score],
    [tAtsChecker("subScores.formatting"), score.formatting_score],
    [tAtsChecker("subScores.education"), score.education_score],
    [tAtsChecker("subScores.achievements"), score.achievements_score],
    [tAtsChecker("subScores.recruiterReadability"), score.recruiter_readability_score],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={score.overall_score} size={100} label={tAtsChecker("overallLabel")} />
          <div className="grid flex-1 grid-cols-2 gap-3">
            {subScores.map(([label, value]) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{label}</span>
                  <span className="font-medium text-foreground">{value ?? "—"}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                    style={{ width: `${value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!!score.weaknesses?.length && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" /> {tAtsChecker("weaknesses")}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {score.weaknesses.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-warning">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!score.suggestions?.length && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-primary" /> {tAtsChecker("suggestions")}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {score.suggestions.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-primary">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!score.keyword_density && Object.keys(score.keyword_density).length > 0 && (
          <div>
            <p className="text-sm font-medium">{tAtsChecker("topKeywords")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(score.keyword_density).map(([keyword, count]) => (
                <span key={keyword} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {keyword} <span className="text-muted-foreground">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
