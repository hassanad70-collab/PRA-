"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StructuralCheck } from "@/lib/resume-intelligence/structural-checks";

const STATUS_ICON = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  fail: XCircle,
} as const;

const STATUS_COLOR = {
  pass: "text-success",
  warning: "text-warning",
  fail: "text-destructive",
} as const;

/**
 * Renders the deterministic (non-AI) structural checks from
 * runStructuralChecks -- the "Score & Health" module's second half,
 * alongside AtsScoreCard's AI-judged sub-scores.
 */
export function ResumeHealthChecklist({ checks }: { checks: StructuralCheck[] }) {
  const t = useTranslations("Candidate.ResumeIntelligence");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("checklistTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("checklistSubtitle")}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {checks.map((check) => {
            const Icon = STATUS_ICON[check.status];
            return (
              <li key={check.id} className="flex items-start gap-2.5 text-sm">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${STATUS_COLOR[check.status]}`} />
                <span className="text-muted-foreground">
                  {t(`checks.${check.id}.${check.status}` as Parameters<typeof t>[0], check.params)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
