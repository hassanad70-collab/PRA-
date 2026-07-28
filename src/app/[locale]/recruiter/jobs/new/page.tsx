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
      <JobForm />
    </div>
  );
}
