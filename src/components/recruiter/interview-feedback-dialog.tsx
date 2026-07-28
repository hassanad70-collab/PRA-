"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitInterviewFeedback } from "@/actions/interviews";
import { INTERVIEW_COMPETENCIES } from "@/types/database";
import type { HiringRecommendation, InterviewCompetency } from "@/types/database";

const RECOMMENDATIONS: HiringRecommendation[] = ["strong_yes", "yes", "neutral", "no", "strong_no"];

export interface InterviewFeedbackDialogLabels {
  giveFeedback: string;
  title: string;
  description: string;
  starEvaluationTitle: string;
  situationLabel: string;
  taskLabel: string;
  actionLabel: string;
  resultLabel: string;
  competencyRatingsTitle: string;
  competencyLabels: Record<InterviewCompetency, string>;
  feedbackLabel: string;
  hiringRecommendationLabel: string;
  recommendationLabels: Record<HiringRecommendation, string>;
  submit: string;
  toastSuccess: string;
  toastFailed: string;
}

export function InterviewFeedbackDialog({
  interviewId,
  applicationId,
  labels,
}: {
  interviewId: string;
  applicationId: string;
  labels: InterviewFeedbackDialogLabels;
}) {
  const [open, setOpen] = React.useState(false);
  const [recommendation, setRecommendation] = React.useState<HiringRecommendation>("neutral");
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const onSubmit = (formData: FormData) => {
    formData.set("hiringRecommendation", recommendation);
    startTransition(async () => {
      const result = await submitInterviewFeedback(interviewId, applicationId, formData);
      if (result.success) {
        toast.success(labels.toastSuccess);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? labels.toastFailed);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="h-4 w-4" /> {labels.giveFeedback}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">{labels.starEvaluationTitle}</p>
            <div className="space-y-2">
              <Label htmlFor="situation">{labels.situationLabel}</Label>
              <Textarea id="situation" name="situation" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task">{labels.taskLabel}</Label>
              <Textarea id="task" name="task" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action">{labels.actionLabel}</Label>
              <Textarea id="action" name="action" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="result">{labels.resultLabel}</Label>
              <Textarea id="result" name="result" rows={2} />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">{labels.competencyRatingsTitle}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {INTERVIEW_COMPETENCIES.map((competency) => (
                <div key={competency} className="space-y-2">
                  <Label htmlFor={`competency_${competency}`}>{labels.competencyLabels[competency]}</Label>
                  <Input id={`competency_${competency}`} name={`competency_${competency}`} type="number" min={1} max={5} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">{labels.feedbackLabel}</Label>
            <Textarea id="feedback" name="feedback" rows={3} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hiringRecommendation">{labels.hiringRecommendationLabel}</Label>
            <Select value={recommendation} onValueChange={(v) => setRecommendation(v as HiringRecommendation)}>
              <SelectTrigger id="hiringRecommendation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECOMMENDATIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {labels.recommendationLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {labels.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
