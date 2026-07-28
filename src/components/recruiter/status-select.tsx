"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateApplicationStatus } from "@/actions/applications";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

const STATUSES: ApplicationStatus[] = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "archived",
];

export interface StatusSelectLabels {
  statusLabels: Record<ApplicationStatus, string>;
  updated: string;
  updateFailed: string;
}

export function StatusSelect({
  applicationId,
  status,
  className,
  labels,
}: {
  applicationId: string;
  status: ApplicationStatus;
  className?: string;
  labels: StatusSelectLabels;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await updateApplicationStatus(applicationId, value as ApplicationStatus);
          if (result.success) {
            toast.success(labels.updated);
            router.refresh();
          } else {
            toast.error(result.error ?? labels.updateFailed);
          }
        })
      }
    >
      <SelectTrigger className={cn("w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {labels.statusLabels[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
