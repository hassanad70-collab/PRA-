import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { CandidateOffersClient } from "@/components/candidate/offers-client";
import { getCandidateOffers } from "@/lib/candidate/messaging-queries";
import { getCurrentUser } from "@/lib/queries/candidate";

export default async function CandidateOffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [t, offers] = await Promise.all([
    getTranslations("Candidate.Offers"),
    getCandidateOffers(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle", { count: offers.filter((o) => o.status === "pending").length })}
        </p>
      </div>
      <CandidateOffersClient
        offers={offers}
        labels={{
          title: t("title"),
          noOffers: t("noOffers"),
          salary: t("salary"),
          startDate: t("startDate"),
          expiryDate: t("expiryDate"),
          accept: t("accept"),
          decline: t("decline"),
          accepted: t("accepted"),
          declined: t("declined"),
          expired: t("expired"),
          withdrawn: t("withdrawn"),
          pending: t("pending"),
          acceptConfirmTitle: t("acceptConfirmTitle"),
          declineConfirmTitle: t("declineConfirmTitle"),
          declineNote: t("declineNote"),
          confirmAccept: t("confirmAccept"),
          confirmDecline: t("confirmDecline"),
          cancel: t("cancel"),
          note: t("note"),
          sentAgo: t("sentAgo"),
        }}
      />
    </div>
  );
}
