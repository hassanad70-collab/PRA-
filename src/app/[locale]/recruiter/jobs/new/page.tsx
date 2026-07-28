import { getTranslations } from "next-intl/server";

import { JobForm } from "@/components/recruiter/job-form";

export default async function NewJobPage() {
  const t = await getTranslations("Recruiter.JobForm");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("newJobTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("newJobSubtitle")}</p>
      </div>
      <JobForm
        labels={{
          jobTitleLabel: t("jobTitleLabel"),
          jobTitlePlaceholder: t("jobTitlePlaceholder"),
          departmentLabel: t("departmentLabel"),
          departmentPlaceholder: t("departmentPlaceholder"),
          aiAssistantLabel: t("aiAssistantLabel"),
          aiAssistantDescription: t("aiAssistantDescription"),
          keyPointsPlaceholder: t("keyPointsPlaceholder"),
          draftWithAi: t("draftWithAi"),
          descriptionLabel: t("descriptionLabel"),
          responsibilitiesLabel: t("responsibilitiesLabel"),
          requirementsLabel: t("requirementsLabel"),
          benefitsLabel: t("benefitsLabel"),
          employmentTypeLabel: t("employmentTypeLabel"),
          employmentTypeLabels: {
            full_time: t("employmentTypeLabels.full_time"),
            part_time: t("employmentTypeLabels.part_time"),
            contract: t("employmentTypeLabels.contract"),
            internship: t("employmentTypeLabels.internship"),
            temporary: t("employmentTypeLabels.temporary"),
          },
          experienceLevelLabel: t("experienceLevelLabel"),
          experienceLevelLabels: {
            entry: t("experienceLevelLabels.entry"),
            junior: t("experienceLevelLabels.junior"),
            mid: t("experienceLevelLabels.mid"),
            senior: t("experienceLevelLabels.senior"),
            lead: t("experienceLevelLabels.lead"),
            manager: t("experienceLevelLabels.manager"),
            director: t("experienceLevelLabels.director"),
            executive: t("experienceLevelLabels.executive"),
          },
          minExperienceYearsLabel: t("minExperienceYearsLabel"),
          educationRequirementLabel: t("educationRequirementLabel"),
          educationRequirementPlaceholder: t("educationRequirementPlaceholder"),
          headcountLabel: t("headcountLabel"),
          requiredSkillsLabel: t("requiredSkillsLabel"),
          niceToHaveSkillsLabel: t("niceToHaveSkillsLabel"),
          locationLabel: t("locationLabel"),
          locationPlaceholder: t("locationPlaceholder"),
          remotePositionLabel: t("remotePositionLabel"),
          salaryMinLabel: t("salaryMinLabel"),
          salaryMaxLabel: t("salaryMaxLabel"),
          currencyLabel: t("currencyLabel"),
          saveChanges: t("saveChanges"),
          createJobDraft: t("createJobDraft"),
          toastJobUpdated: t("toastJobUpdated"),
          toastJobCreated: t("toastJobCreated"),
          toastFormErrors: t("toastFormErrors"),
          toastAddTitleFirst: t("toastAddTitleFirst"),
          toastDraftGenerated: t("toastDraftGenerated"),
          toastDraftFailed: t("toastDraftFailed"),
        }}
      />
    </div>
  );
}
