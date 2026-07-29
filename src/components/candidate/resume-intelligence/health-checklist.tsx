"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reparseResume } from "@/actions/resume";
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
 * alongside AtsScoreCard's AI-judged sub-scores. Both read the same
 * resume row's parsed_data, so a "fail" here always reflects that field
 * genuinely being empty/missing on that row -- see isPartial below for the
 * one case where that's a known-incomplete AI extraction rather than a
 * property of the resume itself.
 */
/** Reasons that won't self-heal on retry -- offering a "Retry" button for
 * these would just waste the candidate's click and reproduce the exact same
 * fallback, since nothing about the request itself was the problem. */
const NON_RETRYABLE_REASONS = new Set(["missing_api_key", "invalid_api_key", "authentication_error"]);

export function ResumeHealthChecklist({
  checks,
  resumeId,
  isPartial,
  parseErrorCode,
}: {
  checks: StructuralCheck[];
  resumeId: string;
  /** True when parsed_data is the degraded fallback (parse_status === "completed_partial") -- every check below is reporting on that fallback, not on the resume's actual content. */
  isPartial: boolean;
  /** Classified reason for the partial state (see src/lib/ai/errors.ts) -- null for legacy rows predating this column, or when isPartial is false. */
  parseErrorCode: string | null;
}) {
  const t = useTranslations("Candidate.ResumeIntelligence");
  const [isPending, startTransition] = useTransition();

  const handleRetry = () => {
    startTransition(async () => {
      const result = await reparseResume(resumeId);
      if (!result.success) toast.error(result.error ?? t("reparseFailed"));
      else toast.success(t("reparseSucceeded"));
    });
  };

  const canRetry = !parseErrorCode || !NON_RETRYABLE_REASONS.has(parseErrorCode);
  const noticeKey = parseErrorCode ? (`extractionErrors.${parseErrorCode}` as Parameters<typeof t>[0]) : ("partialExtractionNotice" as Parameters<typeof t>[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("checklistTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("checklistSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPartial && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
            <p className="flex items-start gap-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t(noticeKey)}
            </p>
            {canRetry && (
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleRetry}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("retryExtraction")}
              </Button>
            )}
          </div>
        )}
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
