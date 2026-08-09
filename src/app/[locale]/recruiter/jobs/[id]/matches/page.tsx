import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JobMatchesClient } from "@/components/recruiter/job-matches-client";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import { getJobMatches } from "@/lib/recruiter/employer-queries";

export default async function JobMatchesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/recruiter/dashboard", locale });

  const [job, t] = await Promise.all([
    getJobById(id),
    getTranslations("Recruiter.AiMatching"),
  ]);

  if (!job || job.company_id !== recruiter.company_id) redirect({ href: "/recruiter/jobs", locale });

  const matches = await getJobMatches(id, 50);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link href={`/recruiter/jobs/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{job!.title} · {matches.length} {t("matchCount")}</p>
        </div>
      </div>

      <JobMatchesClient
        jobId={id}
        jobTitle={job!.title}
        initialMatches={matches}
        labels={{
          matchScore: t("matchScore"),
          interviewProb: t("interviewProb"),
          strengths: t("strengths"),
          weaknesses: t("weaknesses"),
          missingSkills: t("missingSkills"),
          refreshMatch: t("refreshMatch"),
          refreshing: t("refreshing"),
          refreshed: t("refreshed"),
          refreshFailed: t("refreshFailed"),
          viewProfile: t("viewProfile"),
          empty: t("empty"),
        }}
      />
    </div>
  );
}
