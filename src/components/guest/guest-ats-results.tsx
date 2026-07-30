import { useTranslations } from "next-intl";
import { AlertTriangle, Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import type { AtsScoreResult } from "@/lib/ai/ats-scorer";

/**
 * Mirrors AtsScoreCard's layout so a guest sees the exact same depth of
 * analysis an authenticated user would — no hidden sections, per the
 * "show the complete analysis" requirement. Kept as its own component
 * rather than reusing AtsScoreCard directly, since that component is typed
 * for a persisted `AtsScore` DB row (id, resume_id, created_at) that a
 * guest result never has.
 */
export function GuestAtsResults({ result }: { result: AtsScoreResult }) {
  const t = useTranslations("AtsChecker");
  const tSub = useTranslations("AtsChecker.subScores");

  const subScores: ["experience" | "skills" | "formatting" | "education" | "achievements" | "recruiterReadability", number | null][] = [
    ["experience", result.experience_score],
    ["skills", result.skills_score],
    ["formatting", result.formatting_score],
    ["education", result.education_score],
    ["achievements", result.achievements_score],
    ["recruiterReadability", result.recruiter_readability_score],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("resultsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={result.overall_score} size={100} label={t("overallLabel")} />
          <div className="grid flex-1 grid-cols-2 gap-3">
            {subScores.map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{tSub(key)}</span>
                  <span className="font-medium text-foreground">{value ?? "—"}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-blue-400 rtl:bg-gradient-to-l"
                    style={{ width: `${value ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!!result.weaknesses?.length && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" /> {t("weaknesses")}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {result.weaknesses.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-warning">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!result.suggestions?.length && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-primary" /> {t("suggestions")}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {result.suggestions.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-primary">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!result.keyword_density?.length && (
          <div>
            <p className="text-sm font-medium">{t("topKeywords")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.keyword_density.map(({ keyword, count }) => (
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
