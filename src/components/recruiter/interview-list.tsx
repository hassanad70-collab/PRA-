"use client";

import * as React from "react";
import { toast } from "sonner";
import { Ban, Calendar, Loader2, MapPin, Sparkles } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewFeedbackDialog, type InterviewFeedbackDialogLabels } from "@/components/recruiter/interview-feedback-dialog";
import { generateInterviewSummary, updateInterviewStatus } from "@/actions/interviews";
import { formatDate } from "@/lib/utils";
import type { Interview, InterviewCompetency, InterviewStatus, InterviewType } from "@/types/database";

const STATUS_VARIANT: Record<InterviewStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  scheduled: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
  rescheduled: "outline",
};

export interface InterviewListLabels {
  noInterviewsYet: string;
  cancel: string;
  cancelSucceeded: string;
  cancelFailed: string;
  recommendationLabel: string;
  scorecardTitle: string;
  starEvaluationTitle: string;
  situationLabel: string;
  taskLabel: string;
  actionLabel: string;
  resultLabel: string;
  competencyRatingsTitle: string;
  competencyLabels: Record<InterviewCompetency, string>;
  feedbackLabel: string;
  aiSummaryTitle: string;
  generateSummary: string;
  regenerateSummary: string;
  generatingSummary: string;
  summaryFailed: string;
  statusLabels: Record<InterviewStatus, string>;
  interviewTypeLabels: Record<InterviewType, string>;
  recommendationLabels: Record<string, string>;
  /** Keyed by interview id -- precomputed server-side since functions can't
   * cross the Server-to-Client Component boundary. */
  minutesLabels: Record<string, string>;
  feedbackDialog: InterviewFeedbackDialogLabels;
}

export function InterviewList({
  applicationId,
  interviews,
  labels,
}: {
  applicationId: string;
  interviews: Interview[];
  labels: InterviewListLabels;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [summarizingId, setSummarizingId] = React.useState<string | null>(null);
  const [summaries, setSummaries] = React.useState<Record<string, string>>({});
  const router = useRouter();

  const handleCancel = (interviewId: string) => {
    setPendingId(interviewId);
    updateInterviewStatus(interviewId, applicationId, "cancelled")
      .then((result) => {
        if (result.success) {
          toast.success(labels.cancelSucceeded);
          router.refresh();
        } else {
          toast.error(result.error ?? labels.cancelFailed);
        }
      })
      .finally(() => setPendingId(null));
  };

  const handleGenerateSummary = (interviewId: string) => {
    setSummarizingId(interviewId);
    generateInterviewSummary(interviewId, applicationId)
      .then((result) => {
        if (result.success && result.summary) {
          setSummaries((prev) => ({ ...prev, [interviewId]: result.summary! }));
        } else {
          toast.error(result.error ?? labels.summaryFailed);
        }
      })
      .finally(() => setSummarizingId(null));
  };

  if (interviews.length === 0) {
    return <p className="text-sm text-muted-foreground">{labels.noInterviewsYet}</p>;
  }

  return (
    <div className="space-y-3">
      {interviews.map((iv) => {
        const summary = summaries[iv.id] ?? iv.ai_summary;
        const isSummarizing = summarizingId === iv.id;

        return (
          <Card key={iv.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_VARIANT[iv.status]}>{labels.statusLabels[iv.status]}</Badge>
                    <Badge variant="outline">{labels.interviewTypeLabels[iv.interview_type]}</Badge>
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(iv.scheduled_at)} · {labels.minutesLabels[iv.id]}
                  </p>
                  {iv.location_or_link && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {iv.location_or_link}
                    </p>
                  )}
                  {iv.status === "completed" && iv.hiring_recommendation && (
                    <p className="mt-2 text-sm">
                      <span className="font-medium">{labels.recommendationLabel}: </span>
                      <span>{labels.recommendationLabels[iv.hiring_recommendation]}</span>
                    </p>
                  )}
                </div>
                {iv.status === "scheduled" && (
                  <div className="flex shrink-0 items-center gap-2">
                    <InterviewFeedbackDialog interviewId={iv.id} applicationId={applicationId} labels={labels.feedbackDialog} />
                    <Button variant="ghost" size="sm" disabled={pendingId === iv.id} onClick={() => handleCancel(iv.id)}>
                      {pendingId === iv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                      {labels.cancel}
                    </Button>
                  </div>
                )}
              </div>

              {iv.status === "completed" && (
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{labels.scorecardTitle}</p>

                  {!!iv.competency_ratings && Object.keys(iv.competency_ratings).length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Object.entries(iv.competency_ratings).map(([competency, rating]) => (
                        <div key={competency} className="rounded-lg border border-border p-2 text-center">
                          <p className="text-xs text-muted-foreground">
                            {labels.competencyLabels[competency as InterviewCompetency] ?? competency}
                          </p>
                          <p className="text-lg font-bold">{rating}/5</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {iv.star_evaluation && (iv.star_evaluation.situation || iv.star_evaluation.task || iv.star_evaluation.action || iv.star_evaluation.result) && (
                    <div className="space-y-1 text-sm">
                      <p className="text-xs font-medium text-muted-foreground">{labels.starEvaluationTitle}</p>
                      {iv.star_evaluation.situation && (
                        <p>
                          <span className="font-medium">{labels.situationLabel}: </span>
                          {iv.star_evaluation.situation}
                        </p>
                      )}
                      {iv.star_evaluation.task && (
                        <p>
                          <span className="font-medium">{labels.taskLabel}: </span>
                          {iv.star_evaluation.task}
                        </p>
                      )}
                      {iv.star_evaluation.action && (
                        <p>
                          <span className="font-medium">{labels.actionLabel}: </span>
                          {iv.star_evaluation.action}
                        </p>
                      )}
                      {iv.star_evaluation.result && (
                        <p>
                          <span className="font-medium">{labels.resultLabel}: </span>
                          {iv.star_evaluation.result}
                        </p>
                      )}
                    </div>
                  )}

                  {iv.feedback && (
                    <p className="text-sm">
                      <span className="font-medium">{labels.feedbackLabel}: </span>
                      {iv.feedback}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                        <Sparkles className="h-3 w-3 text-primary" /> {labels.aiSummaryTitle}
                      </p>
                      <Button type="button" size="sm" variant="outline" disabled={isSummarizing} onClick={() => handleGenerateSummary(iv.id)}>
                        {isSummarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {isSummarizing ? labels.generatingSummary : summary ? labels.regenerateSummary : labels.generateSummary}
                      </Button>
                    </div>
                    {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
