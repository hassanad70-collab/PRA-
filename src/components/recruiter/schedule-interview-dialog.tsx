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

export function ScheduleInterviewDialog({ applicationId, jobId }: { applicationId: string; jobId: string }) {
  const [open, setOpen] = React.useState(false);
  const [interviewType, setInterviewType] = React.useState<InterviewType>("video");
  const [isPending, startTransition] = React.useTransition();
  const router = useRouter();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await scheduleInterview(applicationId, jobId, formData);
      if (result.success) {
        toast.success("Interview scheduled");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to schedule interview");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarPlus className="h-4 w-4" /> Schedule interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>The candidate will see this on their applications page.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date and time</Label>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input id="durationMinutes" name="durationMinutes" type="number" min={5} max={480} defaultValue={45} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interviewType">Type</Label>
            <Select value={interviewType} onValueChange={(v) => setInterviewType(v as InterviewType)}>
              <SelectTrigger id="interviewType" className="capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="interviewType" value={interviewType} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationOrLink">Location or link</Label>
            <Input id="locationOrLink" name="locationOrLink" placeholder="Video call link or office address" />
          </div>
          <DialogFooter>
            <Button type="submit" variant="gradient" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
