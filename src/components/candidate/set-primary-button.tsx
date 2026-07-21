"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setPrimaryResume } from "@/actions/resume";

export function SetPrimaryButton({ resumeId }: { resumeId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await setPrimaryResume(resumeId);
          if (!result.success) toast.error(result.error ?? "Failed to update.");
        })
      }
    >
      Set as primary
    </Button>
  );
}
