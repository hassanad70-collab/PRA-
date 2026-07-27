import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SaveJobButton } from "@/components/candidate/save-job-button";
import { getCurrentUser, getRecommendedJobsForCandidate, getSavedJobIds } from "@/lib/queries/candidate";
import { getPublishedJobs } from "@/lib/queries/jobs";
import type { EmploymentType, ExperienceLevel } from "@/types/database";

export default async function BrowseJobsPage({
  searchParams,
  params: routeParams,
}: {
  searchParams: Promise<{ search?: string; location?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await routeParams;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const params = await searchParams;
  const [jobs, savedIds, recommended, t, tJobs, tShared, tCommon] = await Promise.all([
    getPublishedJobs({ search: params.search, location: params.location }),
    getSavedJobIds(user.id),
    getRecommendedJobsForCandidate(user.id, 100),
    getTranslations("Candidate.Jobs"),
    getTranslations("Jobs"),
    getTranslations("Candidate.Shared"),
    getTranslations("Common"),
  ]);

  const matchByJobId = new Map(recommended.map((m) => [m.job_id, m.match_score]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tJobs("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row">
        <Input name="search" defaultValue={params.search} placeholder={tJobs("searchPlaceholder")} className="sm:max-w-sm" />
        <Input name="location" defaultValue={params.location} placeholder={tJobs("locationPlaceholder")} className="sm:max-w-xs" />
      </form>

      <div className="space-y-3">
        {jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{tJobs("noResults")}</p>
        )}
        {jobs.map((job) => {
          const matchScore = matchByJobId.get(job.id);
          return (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <Link href={`/candidate/jobs/${job.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{job.title}</h3>
                    {matchScore !== undefined && (
                      <Badge variant={matchScore >= 80 ? "success" : matchScore >= 60 ? "warning" : "outline"}>
                        <Sparkles className="me-1 h-3 w-3" />
                        {tShared("matchPercent", { percent: Math.round(matchScore) })}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.company?.name}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location ?? tCommon("remote")}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {tCommon(`employmentType.${job.employment_type as EmploymentType}`)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {tCommon(`experienceLevel.${job.experience_level as ExperienceLevel}`)}
                    </Badge>
                  </div>
                </Link>
                <SaveJobButton jobId={job.id} initialSaved={savedIds.has(job.id)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
