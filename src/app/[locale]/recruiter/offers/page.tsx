import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getOffersForCompany } from "@/lib/recruiter/messaging-queries";
import { initials } from "@/lib/utils";
import type { OfferStatus } from "@/types/database";

const STATUS_VARIANT: Record<OfferStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  declined: "destructive",
  expired: "outline",
  withdrawn: "outline",
};

export default async function RecruiterOffersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [t, offers] = await Promise.all([
    getTranslations("Recruiter.Offers"),
    getOffersForCompany(recruiter.company_id),
  ]);

  const statusLabels: Record<OfferStatus, string> = {
    pending: t("statusPending"),
    accepted: t("statusAccepted"),
    declined: t("statusDeclined"),
    expired: t("statusExpired"),
    withdrawn: t("statusWithdrawn"),
  };

  const stats = {
    total: offers.length,
    pending: offers.filter((o) => o.status === "pending").length,
    accepted: offers.filter((o) => o.status === "accepted").length,
    acceptanceRate:
      offers.filter((o) => ["accepted", "declined"].includes(o.status)).length > 0
        ? Math.round(
            (offers.filter((o) => o.status === "accepted").length /
              offers.filter((o) => ["accepted", "declined"].includes(o.status)).length) *
              100
          )
        : null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: t("statTotal"), value: stats.total },
          { label: t("statPending"), value: stats.pending },
          { label: t("statAccepted"), value: stats.accepted },
          { label: t("statAcceptanceRate"), value: stats.acceptanceRate != null ? `${stats.acceptanceRate}%` : "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Offers table */}
      {offers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("noOffers")}</CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[t("colCandidate"), t("colJob"), t("colSalary"), t("colExpiry"), t("colStatus")].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {offers.map((offer) => {
                const candidate = offer.candidate as unknown as { id: string; profile: { full_name: string; email: string } };
                const job = offer.job as unknown as { id: string; title: string };
                const name = candidate.profile?.full_name ?? "—";
                return (
                  <tr key={offer.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(name)}
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{job?.title ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {offer.salary_min && offer.salary_max
                        ? `${offer.currency} ${offer.salary_min.toLocaleString()}–${offer.salary_max.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{offer.expiry_date ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[offer.status]} className="text-xs">
                        {statusLabels[offer.status]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
