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
  const subScores: [string, number | null][] = [
    ["Experience", result.experience_score],
    ["Skills", result.skills_score],
    ["Formatting", result.formatting_score],
    ["Education", result.education_score],
    ["Achievements", result.achievements_score],
    ["Recruiter readability", result.recruiter_readability_score],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your ATS Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={result.overall_score} size={100} label="Overall" />
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

        {!!result.weaknesses?.length && (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" /> Weaknesses
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
              <Lightbulb className="h-4 w-4 text-primary" /> Suggestions
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
            <p className="text-sm font-medium">Top keywords detected</p>
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
