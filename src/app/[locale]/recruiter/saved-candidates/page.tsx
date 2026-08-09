import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { SavedCandidatesClient } from "@/components/recruiter/saved-candidates-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getSavedCandidates } from "@/lib/recruiter/employer-queries";

export default async function SavedCandidatesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/recruiter/dashboard", locale });

  const t = await getTranslations("Recruiter.SavedCandidates");

  const saved = await getSavedCandidates(recruiter.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { count: saved.length })}</p>
      </div>
      <SavedCandidatesClient
        initialSaved={saved}
        labels={{
          empty: t("empty"),
          notes: t("notes"),
          saveNotes: t("saveNotes"),
          remove: t("remove"),
          viewProfile: t("viewProfile"),
          noteSaved: t("noteSaved"),
          removed: t("removed"),
        }}
      />
    </div>
  );
}
