import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { AiJdGeneratorClient } from "@/components/recruiter/ai-jd-generator-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

export default async function AiJobDescriptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [t, tCommon] = await Promise.all([
    getTranslations("Recruiter.AiJobDescription"),
    getTranslations("Common"),
  ]);

  const employmentTypeLabels: Record<string, string> = {
    full_time: tCommon("employmentType.full_time"),
    part_time: tCommon("employmentType.part_time"),
    contract: tCommon("employmentType.contract"),
    internship: tCommon("employmentType.internship"),
    temporary: tCommon("employmentType.temporary"),
  };

  const experienceLevelLabels: Record<string, string> = {
    entry: tCommon("experienceLevel.entry"),
    junior: tCommon("experienceLevel.junior"),
    mid: tCommon("experienceLevel.mid"),
    senior: tCommon("experienceLevel.senior"),
    lead: tCommon("experienceLevel.lead"),
    manager: tCommon("experienceLevel.manager"),
    director: tCommon("experienceLevel.director"),
    executive: tCommon("experienceLevel.executive"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <AiJdGeneratorClient
        labels={{
          titleLabel: t("jobTitle"),
          departmentLabel: t("department"),
          employmentTypeLabel: t("employmentType"),
          experienceLevelLabel: t("experienceLevel"),
          keyPointsLabel: t("keyPoints"),
          keyPointsPlaceholder: t("keyPointsPlaceholder"),
          generateBtn: t("generate"),
          generating: t("generating"),
          generatedTitle: t("generatedTitle"),
          description: t("description"),
          responsibilities: t("responsibilities"),
          requirements: t("requirements"),
          benefits: t("benefits"),
          skills: t("skills"),
          copyBtn: t("copy"),
          copied: t("copied"),
          errorMsg: t("errorMsg"),
          selectType: t("selectType"),
          selectLevel: t("selectLevel"),
        }}
        employmentTypeLabels={employmentTypeLabels}
        experienceLevelLabels={experienceLevelLabels}
      />
    </div>
  );
}
