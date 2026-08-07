import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { TalentPoolClient } from "@/components/recruiter/talent-pool-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getTalentPoolWithFilters } from "@/lib/recruiter/employer-queries";

export default async function TalentPoolPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const t = await getTranslations("Recruiter.TalentPool");

  const pool = await getTalentPoolWithFilters(recruiter.company_id, { limit: 300 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { company: recruiter.company?.name ?? "" })}</p>
      </div>
      <TalentPoolClient
        initialPool={pool as Parameters<typeof TalentPoolClient>[0]["initialPool"]}
        labels={{
          searchPlaceholder: t("searchPlaceholder"),
          favoritesOnly: t("favoritesOnly"),
          removeToast: t("removeToast"),
          removeFailed: t("removeFailed"),
          empty: t("emptyState"),
        }}
      />
    </div>
  );
}
