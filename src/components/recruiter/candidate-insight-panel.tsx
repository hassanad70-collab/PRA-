"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateCandidateInsight } from "@/actions/applications";
import { formatRelativeTime } from "@/lib/utils";
import type { ScreeningResult } from "@/types/database";

type Insight = Pick<
  ScreeningResult,
  "risks" | "red_flags" | "hiring_confidence_score" | "suggested_interview_focus" | "suggested_questions" | "insight_generated_at"
>;

export interface CandidateInsightPanelLabels {
  title: string;
  generate: string;
  regenerate: string;
  generating: string;
  notGeneratedYet: string;
  hiringConfidence: string;
  risksLabel: string;
  noRisks: string;
  redFlagsLabel: string;
  noRedFlags: string;
  suggestedFocusLabel: string;
  suggestedQuestionsLabel: string;
  generatedAt: string;
  generateFailed: string;
}

export function CandidateInsightPanel({
  applicationId,
  initialInsight,
  labels,
}: {
  applicationId: string;
  initialInsight: Insight | null;
  labels: CandidateInsightPanelLabels;
}) {
  const [insight, setInsight] = React.useState<Insight | null>(initialInsight);
  const [isPending, startTransition] = React.useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await generateCandidateInsight(applicationId);
      if (result.success && result.insight) {
        setInsight(result.insight);
      } else {
        toast.error(result.error ?? labels.generateFailed);
      }
    });
  };

  const hasInsight = !!insight?.insight_generated_at;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {hasInsight ? labels.generatedAt.replace("{time}", formatRelativeTime(insight!.insight_generated_at!)) : labels.notGeneratedYet}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleGenerate}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isPending ? labels.generating : hasInsight ? labels.regenerate : labels.generate}
        </Button>
      </div>

      {hasInsight && insight && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-medium">{labels.hiringConfidence}</p>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                  style={{ width: `${insight.hiring_confidence_score ?? 0}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-semibold">{insight.hiring_confidence_score ?? 0}%</span>
            </div>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" /> {labels.risksLabel}
            </p>
            {insight.risks?.length ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {insight.risks.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{labels.noRisks}</p>
            )}
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <ShieldAlert className="h-3.5 w-3.5 text-destructive" /> {labels.redFlagsLabel}
            </p>
            {insight.red_flags?.length ? (
              <div className="flex flex-wrap gap-1.5">
                {insight.red_flags.map((f) => (
                  <Badge key={f} variant="destructive">
                    {f}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{labels.noRedFlags}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">{labels.suggestedFocusLabel}</p>
            <p className="text-sm text-muted-foreground">{insight.suggested_interview_focus}</p>
          </div>

          {!!insight.suggested_questions?.length && (
            <div className="sm:col-span-2">
              <p className="mb-1 text-sm font-medium">{labels.suggestedQuestionsLabel}</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {insight.suggested_questions.map((q) => (
                  <li key={q}>• {q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
