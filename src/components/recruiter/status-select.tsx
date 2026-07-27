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
];

export function StatusSelect({
  applicationId,
  status,
  className,
}: {
  applicationId: string;
  status: ApplicationStatus;
  className?: string;
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
            toast.success("Status updated");
            router.refresh();
          } else {
            toast.error(result.error ?? "Failed to update status");
          }
        })
      }
    >
      <SelectTrigger className={cn("w-44 capitalize", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">
            {s.replace("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
