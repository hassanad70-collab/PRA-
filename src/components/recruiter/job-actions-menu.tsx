"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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

export function JobActionsMenu({ jobId, status }: { jobId: string; status: JobStatus }) {
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
        toast.error(result.error ?? "Action failed");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending} aria-label="Job actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "draft" && (
          <DropdownMenuItem onClick={() => run(() => publishJob(jobId), "Job published — AI matching started")}>
            <Send className="h-4 w-4" /> Publish
          </DropdownMenuItem>
        )}
        {status === "published" && (
          <DropdownMenuItem onClick={() => run(() => closeJob(jobId), "Job closed")}>
            <XCircle className="h-4 w-4" /> Close job
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => run(() => duplicateJob(jobId), "Job duplicated")}>
          <Copy className="h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        {status !== "archived" && (
          <DropdownMenuItem onClick={() => run(() => archiveJob(jobId), "Job archived")}>
            <Archive className="h-4 w-4" /> Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
