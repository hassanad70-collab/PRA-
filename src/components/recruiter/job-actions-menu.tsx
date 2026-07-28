"use client";

import { useTransition } from "react";

import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Archive, Copy, MoreVertical, Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveJob, closeJob, duplicateJob, publishJob } from "@/actions/jobs";
import type { JobStatus } from "@/types/database";

export interface JobActionsMenuLabels {
  menuAria: string;
  publish: string;
  toastPublished: string;
  closeJob: string;
  toastClosed: string;
  duplicate: string;
  toastDuplicated: string;
  archive: string;
  toastArchived: string;
  toastFailed: string;
}

export function JobActionsMenu({ jobId, status, labels }: { jobId: string; status: JobStatus; labels: JobActionsMenuLabels }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: string; jobId?: string }>, successMsg: string) => {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(successMsg);
        if (result.jobId) router.push(`/recruiter/jobs/${result.jobId}`);
        router.refresh();
      } else {
        toast.error(result.error ?? labels.toastFailed);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending} aria-label={labels.menuAria}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "draft" && (
          <DropdownMenuItem onClick={() => run(() => publishJob(jobId), labels.toastPublished)}>
            <Send className="h-4 w-4" /> {labels.publish}
          </DropdownMenuItem>
        )}
        {status === "published" && (
          <DropdownMenuItem onClick={() => run(() => closeJob(jobId), labels.toastClosed)}>
            <XCircle className="h-4 w-4" /> {labels.closeJob}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => run(() => duplicateJob(jobId), labels.toastDuplicated)}>
          <Copy className="h-4 w-4" /> {labels.duplicate}
        </DropdownMenuItem>
        {status !== "archived" && (
          <DropdownMenuItem onClick={() => run(() => archiveJob(jobId), labels.toastArchived)}>
            <Archive className="h-4 w-4" /> {labels.archive}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
