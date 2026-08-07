import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { CompanyProfileClient } from "@/components/recruiter/company-profile-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getCompanyProfile } from "@/lib/recruiter/employer-queries";

export default async function CompanyProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const t = await getTranslations("Recruiter.CompanyProfile");

  const profile = await getCompanyProfile(recruiter.company_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { company: recruiter.company?.name ?? "" })}</p>
      </div>
      <CompanyProfileClient
        company={recruiter.company!}
        profile={profile}
        labels={{
          saved: t("saved"),
          published: t("published"),
          unpublished: t("unpublished"),
          saveFailed: t("saveFailed"),
          aboutLabel: t("about"),
          cultureLabel: t("culture"),
          websiteLabel: t("website"),
          hqLabel: t("headquarters"),
          sizeLabel: t("companySize"),
          foundedLabel: t("foundedYear"),
          benefitsLabel: t("benefits"),
          techStackLabel: t("techStack"),
          addBenefit: t("addBenefit"),
          addTech: t("addTech"),
          saveBtn: t("save"),
          publishBtn: t("publish"),
          unpublishBtn: t("unpublish"),
          previewLabel: t("preview"),
        }}
      />
    </div>
  );
}
