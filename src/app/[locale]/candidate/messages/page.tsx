import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { CandidateMessagesClient } from "@/components/candidate/messages-client";
import { getCandidateThreads } from "@/lib/candidate/messaging-queries";
import { getCurrentUser } from "@/lib/queries/candidate";

export default async function CandidateMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [t, threads] = await Promise.all([
    getTranslations("Candidate.Messages"),
    getCandidateThreads(user.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CandidateMessagesClient
        threads={threads}
        candidateId={user.id}
        labels={{
          inbox: t("inbox"),
          noThreads: t("noThreads"),
          selectThread: t("selectThread"),
          placeholder: t("placeholder"),
          send: t("send"),
          you: t("you"),
          sendFailed: t("sendFailed"),
        }}
      />
    </div>
  );
}
