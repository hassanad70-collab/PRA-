"use client";

import * as React from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toggleSavedJob } from "@/actions/profile";
import { cn } from "@/lib/utils";

export function SaveJobButton({ jobId, initialSaved }: { jobId: string; initialSaved: boolean }) {
  const [saved, setSaved] = React.useState(initialSaved);
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isPending}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleSavedJob(jobId);
          if (result.success) setSaved(result.saved ?? false);
          else toast.error(result.error ?? "Failed to save job");
        })
      }
    >
      <Bookmark className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
    </Button>
  );
}
