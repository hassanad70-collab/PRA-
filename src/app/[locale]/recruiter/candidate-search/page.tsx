import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { CandidateSearchClient } from "@/components/recruiter/candidate-search-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { searchCandidates } from "@/lib/recruiter/employer-queries";

export default async function CandidateSearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/recruiter/dashboard", locale });

  const t = await getTranslations("Recruiter.CandidateSearch");

  const initialResults = await searchCandidates(recruiter.company_id, recruiter.id, {
    openToWork: false,
    limit: 60,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CandidateSearchClient
        initialResults={initialResults}
        labels={{
          searchPlaceholder: t("searchPlaceholder"),
          locationPlaceholder: t("locationPlaceholder"),
          filterLabel: t("filters"),
          openToWorkLabel: t("openToWorkLabel"),
          searchBtn: t("searchBtn"),
          saveLabel: t("save"),
          unsaveLabel: t("unsave"),
          savedToast: t("savedToast"),
          unsavedToast: t("unsavedToast"),
          noResults: t("noResults"),
          yearsExp: t("yearsExp"),
          viewProfile: t("viewProfile"),
        }}
      />
    </div>
  );
}
