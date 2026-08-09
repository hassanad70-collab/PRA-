import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { RecruiterMessagesClient } from "@/components/recruiter/messages-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getRecruiterThreads } from "@/lib/recruiter/messaging-queries";

export default async function RecruiterMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/recruiter/dashboard", locale });

  const [t, threads] = await Promise.all([
    getTranslations("Recruiter.Messages"),
    getRecruiterThreads(recruiter.id),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <RecruiterMessagesClient
        threads={threads}
        recruiterId={recruiter.id}
        labels={{
          inbox: t("inbox"),
          noThreads: t("noThreads"),
          selectThread: t("selectThread"),
          placeholder: t("placeholder"),
          send: t("send"),
          sending: t("sending"),
          you: t("you"),
          sendFailed: t("sendFailed"),
        }}
      />
    </div>
  );
}
