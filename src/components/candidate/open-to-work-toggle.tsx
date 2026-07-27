"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toggleOpenToWork } from "@/actions/profile";

export function OpenToWorkToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const t = useTranslations("Candidate.OpenToWork");
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [isPending, startTransition] = React.useTransition();

  const handleChange = (next: boolean) => {
    setEnabled(next);
    startTransition(async () => {
      const result = await toggleOpenToWork(next);
      if (!result.success) {
        setEnabled(!next);
        toast.error(result.error ?? t("toastFailed"));
      }
    });
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <Label htmlFor="open-to-work">{t("label")}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Switch id="open-to-work" checked={enabled} disabled={isPending} onCheckedChange={handleChange} />
    </div>
  );
}
