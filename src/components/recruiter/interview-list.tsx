"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Calendar, Loader2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InterviewFeedbackDialog } from "@/components/recruiter/interview-feedback-dialog";
import { updateInterviewStatus } from "@/actions/interviews";
import { formatDate } from "@/lib/utils";
import type { Interview, InterviewStatus } from "@/types/database";

const STATUS_VARIANT: Record<InterviewStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  scheduled: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
  rescheduled: "outline",
};

export function InterviewList({ applicationId, interviews }: { applicationId: string; interviews: Interview[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const router = useRouter();

  const handleCancel = (interviewId: string) => {
    setPendingId(interviewId);
    updateInterviewStatus(interviewId, applicationId, "cancelled")
      .then((result) => {
        if (result.success) {
          toast.success("Interview cancelled");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to cancel interview");
        }
      })
      .finally(() => setPendingId(null));
  };

  if (interviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>;
  }

  return (
    <div className="space-y-3">
      {interviews.map((iv) => (
        <Card key={iv.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[iv.status]} className="capitalize">
                  {iv.status.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {iv.interview_type}
                </Badge>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(iv.scheduled_at)} · {iv.duration_minutes} min
              </p>
              {iv.location_or_link && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {iv.location_or_link}
                </p>
              )}
              {iv.status === "completed" && iv.hiring_recommendation && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">Recommendation: </span>
                  <span className="capitalize">{iv.hiring_recommendation.replace("_", " ")}</span>
                </p>
              )}
            </div>
            {iv.status === "scheduled" && (
              <div className="flex shrink-0 items-center gap-2">
                <InterviewFeedbackDialog interviewId={iv.id} applicationId={applicationId} />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === iv.id}
                  onClick={() => handleCancel(iv.id)}
                >
                  {pendingId === iv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
