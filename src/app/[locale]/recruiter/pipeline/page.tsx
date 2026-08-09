import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { PipelineBoard, type PipelineApplication } from "@/components/recruiter/pipeline-board";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/types/database";

export default async function PipelinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/recruiter/dashboard", locale });

  const [t, tShared] = await Promise.all([
    getTranslations("Recruiter.Pipeline"),
    getTranslations("Recruiter.Shared"),
  ]);

  const supabase = await createClient();
  // Join through jobs to filter by company — PostgREST inner-join via jobs!inner
  const { data } = await supabase
    .from("applications")
    .select(
      `id, status,
       candidate:candidates(current_position, profile:profiles(full_name, email)),
       job:jobs!inner(id, title, company_id)`
    )
    .eq("job.company_id", recruiter.company_id)
    .order("updated_at", { ascending: false })
    .limit(500);

  const applications: PipelineApplication[] = (data ?? []).map((a) => ({
    id: a.id,
    status: a.status as ApplicationStatus,
    candidate: a.candidate
      ? {
          profile: (a.candidate as { profile?: { full_name: string; email: string } | null }).profile ?? null,
          current_position: (a.candidate as { current_position?: string | null }).current_position ?? null,
        }
      : null,
    job: a.job ? { id: (a.job as unknown as { id: string; title: string }).id, title: (a.job as unknown as { id: string; title: string }).title } : null,
  }));

  const statusLabels = {
    submitted: tShared("applicationStatus.submitted"),
    screening: tShared("applicationStatus.screening"),
    shortlisted: tShared("applicationStatus.shortlisted"),
    interview: tShared("applicationStatus.interview"),
    offer: tShared("applicationStatus.offer"),
    hired: tShared("applicationStatus.hired"),
    rejected: tShared("applicationStatus.rejected"),
    withdrawn: tShared("applicationStatus.withdrawn"),
    archived: tShared("applicationStatus.archived"),
  } as Record<ApplicationStatus, string>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <PipelineBoard
        applications={applications}
        labels={{
          statusLabels,
          noCandidates: t("noCandidates"),
          updated: tShared("statusUpdated"),
          updateFailed: tShared("statusUpdateFailed"),
        }}
      />
    </div>
  );
}
