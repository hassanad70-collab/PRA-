"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { withdrawApplication } from "@/actions/applications";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations("Candidate.Applications");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await withdrawApplication(applicationId);
          if (result.success) {
            toast.success(t("toastWithdrawn"));
            router.refresh();
          } else {
            toast.error(result.error ?? t("toastWithdrawFailed"));
          }
        })
      }
    >
      {t("withdraw")}
    </Button>
  );
}
