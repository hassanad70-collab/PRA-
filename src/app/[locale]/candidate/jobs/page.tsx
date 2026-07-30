import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { Building2, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SaveJobButton } from "@/components/candidate/save-job-button";
import { ExternalJobSearch } from "@/components/candidate/external-job-search";
import { getCurrentUser, getRecommendedJobsForCandidate, getSavedJobIds } from "@/lib/queries/candidate";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { generateJobSearchRecommendations } from "@/lib/ai/job-recommendations";
import type { EmploymentType, ExperienceLevel } from "@/types/database";

/**
 * Race AI recommendations against a 4-second wall clock so a slow AI call
 * never delays the page — the external search section loads without them.
 */
async function getRecommendationsWithTimeout(userId: string) {
  return Promise.race([
    generateJobSearchRecommendations(userId),
    new Promise<[]>((resolve) => setTimeout(() => resolve([]), 4000)),
  ]);
}

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
  const [jobs, savedIds, recommended, recommendations, t, tJobs, tShared, tCommon] =
    await Promise.all([
      getPublishedJobs({ search: params.search, location: params.location }),
      getSavedJobIds(user.id),
      getRecommendedJobsForCandidate(user.id, 100),
      getRecommendationsWithTimeout(user.id),
      getTranslations("Candidate.Jobs"),
      getTranslations("Jobs"),
      getTranslations("Candidate.Shared"),
      getTranslations("Common"),
    ]);

  const matchByJobId = new Map(recommended.map((m) => [m.job_id, m.match_score]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tJobs("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PRA Internal Jobs                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-base font-semibold">{t("internalTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("internalSubtitle")}</p>
          </div>
        </div>

        <form className="flex flex-col gap-3 sm:flex-row">
          <Input
            name="search"
            defaultValue={params.search}
            placeholder={tJobs("searchPlaceholder")}
            className="sm:max-w-sm"
          />
          <Input
            name="location"
            defaultValue={params.location}
            placeholder={tJobs("locationPlaceholder")}
            className="sm:max-w-xs"
          />
        </form>

        <div className="space-y-3">
          {jobs.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {tJobs("noResults")}
            </p>
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
                        <Badge
                          variant={
                            matchScore >= 80
                              ? "success"
                              : matchScore >= 60
                                ? "warning"
                                : "outline"
                          }
                        >
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
      </section>

      <Separator />

      {/* ------------------------------------------------------------------ */}
      {/* External Job Search                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <ExternalJobSearch recommendations={recommendations} />
      </section>
    </div>
  );
}
