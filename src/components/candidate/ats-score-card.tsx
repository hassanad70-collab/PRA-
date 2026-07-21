import { AlertTriangle, Lightbulb } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import type { AtsScore } from "@/types/database";

export function AtsScoreCard({ score }: { score: AtsScore }) {
  const subScores: [string, number | null][] = [
    ["Experience", score.experience_score],
    ["Skills", score.skills_score],
    ["Formatting", score.formatting_score],
    ["Education", score.education_score],
    ["Achievements", score.achievements_score],
    ["Recruiter readability", score.recruiter_readability_score],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI ATS Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={score.overall_score} size={100} label="Overall" />
          <div className="grid flex-1 grid-cols-2 gap-3">
            {subScores.map(([label, value]) => (
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
        </div>

        {!!score.weaknesses?.length && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" /> Weaknesses
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
              <Lightbulb className="h-4 w-4 text-primary" /> Suggestions
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
            <p className="text-sm font-medium">Top keywords detected</p>
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
