"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { createDraft } from "@/actions/resume-builder";

export function CreateDraftButton() {
  const t = useTranslations("Candidate.ResumeBuilder");
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createDraft();
      if (res.success && res.draft) {
        router.push(`/candidate/resume-builder/${res.draft.id}`);
      } else {
        toast.error(res.error ?? t("createFailed"));
      }
    });
  };

  return (
    <Button variant="gradient" disabled={isPending} onClick={handleCreate}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      {t("newDraft")}
    </Button>
  );
}
