"use client";

import * as React from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toggleOpenToWork } from "@/actions/profile";

export function OpenToWorkToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [isPending, startTransition] = React.useTransition();

  const handleChange = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const result = await toggleOpenToWork(next);
      if (!result.success) {
        setEnabled(!next);
        toast.error(result.error ?? "Failed to update.");
      }
    });
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <Label htmlFor="open-to-work">Open to being discovered by recruiters</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          When on, recruiters at a company can see your profile for roles our AI already matches you to — even if you
          haven&apos;t applied. Off by default; you&apos;re never shown for a job you weren&apos;t matched against.
        </p>
      </div>
      <Switch id="open-to-work" checked={enabled} disabled={isPending} onCheckedChange={handleChange} />
    </div>
  );
}
