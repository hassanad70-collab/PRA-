import { getTranslations } from "next-intl/server";
import { CreditCard } from "lucide-react";

import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/queries/candidate";
import { SubscriptionPlans } from "@/components/candidate/subscription-plans";

export default async function SubscriptionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const t = await getTranslations("Candidate.Subscription");

  const tProps = {
    monthlyLabel: t("monthlyLabel"),
    annualLabel: t("annualLabel"),
    annualSaving: t("annualSaving"),
    freeName: t("plans.free.name"),
    freeDesc: t("plans.free.description"),
    professionalName: t("plans.professional.name"),
    professionalDesc: t("plans.professional.description"),
    careerProName: t("plans.careerPro.name"),
    careerProDesc: t("plans.careerPro.description"),
    perMonth: t("perMonth"),
    perYear: t("perYear"),
    freePrice: t("freePrice"),
    currentPlanLabel: t("currentPlanLabel"),
    upgradeLabel: t("upgradeLabel"),
    manageLabel: t("manageLabel"),
    comingSoon: t("comingSoon"),
    mostPopular: t("mostPopular"),
    everythingInFree: t("everythingInFree"),
    everythingInProfessional: t("everythingInProfessional"),
    freeFeatures: [
      t("plans.free.features.profile"),
      t("plans.free.features.jobSearch"),
      t("plans.free.features.applyJobs"),
      t("plans.free.features.appTracking"),
      t("plans.free.features.basicResume"),
      t("plans.free.features.atsChecks"),
      t("plans.free.features.careerGuidance"),
      t("plans.free.features.aiCredits"),
    ],
    professionalFeatures: [
      t("plans.professional.features.resumeStudio"),
      t("plans.professional.features.atsChecks"),
      t("plans.professional.features.careerCoach"),
      t("plans.professional.features.careerAdvisor"),
      t("plans.professional.features.coverLetters"),
      t("plans.professional.features.interviewPrep"),
      t("plans.professional.features.jobMatching"),
      t("plans.professional.features.linkedinOptimizer"),
      t("plans.professional.features.salaryInsights"),
      t("plans.professional.features.aiCredits"),
      t("plans.professional.features.priorityProcessing"),
    ],
    careerProFeatures: [
      t("plans.careerPro.features.careerRoadmap"),
      t("plans.careerPro.features.resumeOptimization"),
      t("plans.careerPro.features.interviewSim"),
      t("plans.careerPro.features.premiumJobMatching"),
      t("plans.careerPro.features.salaryInsights"),
      t("plans.careerPro.features.portfolioOptimization"),
      t("plans.careerPro.features.careerAnalytics"),
      t("plans.careerPro.features.aiCredits"),
      t("plans.careerPro.features.priorityAi"),
    ],
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
      </div>

      <SubscriptionPlans currentPlan="free" t={tProps} />

      <p className="text-center text-xs text-muted-foreground">{t("paymentNote")}</p>
    </div>
  );
}
