"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { RadioGroupResumes } from "@/components/candidate/radio-group-resumes";
import { Textarea } from "@/components/ui/textarea";
import { applyToJob } from "@/actions/applications";
import type { Resume } from "@/types/database";

export function ApplyDialog({ jobId, resumes }: { jobId: string; resumes: Resume[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [resumeId, setResumeId] = React.useState(resumes.find((r) => r.is_primary)?.id ?? resumes[0]?.id ?? "");
  const [coverLetter, setCoverLetter] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const submit = () => {
    if (!resumeId) {
      toast.error("Please select a resume.");
      return;
    }
    startTransition(async () => {
      const result = await applyToJob(jobId, resumeId, coverLetter);
      if (result.success) {
        toast.success("Application submitted! AI screening is running now.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to submit application.");
      }
    });
  };

  if (resumes.length === 0) {
    return (
      <Button variant="gradient" asChild>
        <a href="/candidate/resume">Upload a resume to apply</a>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="lg">
          Apply now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit your application</DialogTitle>
          <DialogDescription>Choose which resume to send and add an optional cover letter.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Resume</Label>
            <RadioGroupResumes resumes={resumes} value={resumeId} onChange={setResumeId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverLetter">Cover letter (optional)</Label>
            <Textarea
              id="coverLetter"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Tell the recruiter why you're a great fit…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="gradient" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
