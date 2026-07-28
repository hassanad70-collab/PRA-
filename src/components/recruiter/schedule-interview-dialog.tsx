"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";

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
import { scheduleInterview } from "@/actions/interviews";
import type { InterviewType } from "@/types/database";

const INTERVIEW_TYPES: InterviewType[] = ["phone", "video", "onsite", "technical", "panel", "final"];

export interface ScheduleInterviewDialogLabels {
  trigger: string;
  title: string;
  description: string;
  dateTimeLabel: string;
  durationLabel: string;
  typeLabel: string;
  interviewTypeLabels: Record<InterviewType, string>;
  locationLabel: string;
  locationPlaceholder: string;
  submit: string;
  toastSuccess: string;
  toastFailed: string;
}

export function ScheduleInterviewDialog({
  applicationId,
  jobId,
  labels,
}: {
  applicationId: string;
  jobId: string;
  labels: ScheduleInterviewDialogLabels;
}) {
  const [open, setOpen] = React.useState(false);
  const [interviewType, setInterviewType] = React.useState<InterviewType>("video");
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await scheduleInterview(applicationId, jobId, formData);
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
          <CalendarPlus className="h-4 w-4" /> {labels.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">{labels.dateTimeLabel}</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">{labels.durationLabel}</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" min={5} max={480} defaultValue={45} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewType">{labels.typeLabel}</Label>
            <Select value={interviewType} onValueChange={(v) => setInterviewType(v as InterviewType)}>
              <SelectTrigger id="interviewType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {labels.interviewTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="interviewType" value={interviewType} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationOrLink">{labels.locationLabel}</Label>
            <Input id="locationOrLink" name="locationOrLink" placeholder={labels.locationPlaceholder} />
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
