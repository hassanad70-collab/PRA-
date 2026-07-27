"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
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
  const t = useTranslations("Candidate.ApplyDialog");
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [resumeId, setResumeId] = React.useState(resumes.find((r) => r.is_primary)?.id ?? resumes[0]?.id ?? "");
  const [coverLetter, setCoverLetter] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const submit = () => {
    if (!resumeId) {
      toast.error(t("selectResumeError"));
      return;
    }
    startTransition(async () => {
      const result = await applyToJob(jobId, resumeId, coverLetter);
      if (result.success) {
        toast.success(t("toastSubmitted"));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? t("toastFailed"));
      }
    });
  };

  if (resumes.length === 0) {
    return (
      <Button variant="gradient" asChild>
        <Link href="/candidate/resume">{t("uploadResumeToApply")}</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="lg">
          {t("applyNow")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("resumeLabel")}</Label>
            <RadioGroupResumes resumes={resumes} value={resumeId} onChange={setResumeId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverLetter">{t("coverLetterLabel")}</Label>
            <Textarea
              id="coverLetter"
              rows={5}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder={t("coverLetterPlaceholder")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="gradient" onClick={submit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
