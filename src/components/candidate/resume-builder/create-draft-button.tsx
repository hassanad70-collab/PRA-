"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createDraft } from "@/actions/resume-builder";

export function CreateDraftButton() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const handleCreate = () => {
    startTransition(async () => {
      const res = await createDraft();
      if (res.success && res.draft) {
        router.push(`/candidate/resume-builder/${res.draft.id}`);
      } else {
        toast.error(res.error ?? "Failed to create a new draft.");
      }
    });
  };

  return (
    <Button variant="gradient" disabled={isPending} onClick={handleCreate}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      New draft
    </Button>
  );
}
