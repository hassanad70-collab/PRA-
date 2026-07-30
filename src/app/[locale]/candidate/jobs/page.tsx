import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { JobDiscoveryTabs } from "@/components/candidate/job-discovery-tabs";
import {
  getCurrentUser,
  getRecommendedJobsForCandidate,
  getSavedJobIds,
} from "@/lib/queries/candidate";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { generateJobSearchRecommendations } from "@/lib/ai/job-recommendations";
import { generateCareerRecommendations } from "@/lib/ai/career-recommendations";
import { getSearchHistory } from "@/actions/search-history";
import { getSavedSearches } from "@/actions/saved-searches";
import { getJobAlerts } from "@/actions/job-alerts";
import type { CareerRecommendationsResult } from "@/types/job-discovery";

const EMPTY_CAREER: CareerRecommendationsResult = {
  jobTitles: [],
  careerPath: [],
  skillsToLearn: [],
  certifications: [],
  industries: [],
  salaryRange: null,
  nextPosition: null,
  confidence: 0,
  cached: false,
  generatedAt: new Date().toISOString(),
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
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

  const [
    jobs,
    savedIdArray,
    recommended,
    recommendations,
    careerData,
    recentSearches,
    savedSearches,
    alerts,
    t,
    tJobs,
  ] = await Promise.all([
    getPublishedJobs({ search: params.search, location: params.location }),
    getSavedJobIds(user.id),
    getRecommendedJobsForCandidate(user.id, 100),
    withTimeout(generateJobSearchRecommendations(user.id), 4000, []),
    withTimeout(generateCareerRecommendations(user.id), 6000, EMPTY_CAREER),
    getSearchHistory(10),
    getSavedSearches(),
    getJobAlerts(),
    getTranslations("Candidate.Jobs"),
    getTranslations("Jobs"),
  ]);

  const matchScores: Record<string, number> = {};
  for (const m of recommended) matchScores[m.job_id] = m.match_score;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tJobs("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <JobDiscoveryTabs
        jobs={jobs}
        savedJobIds={Array.from(savedIdArray)}
        matchScores={matchScores}
        searchQuery={params.search}
        searchLocation={params.location}
        recommendations={recommendations}
        recentSearches={recentSearches}
        savedSearches={savedSearches}
        alerts={alerts}
        careerData={careerData}
      />
    </div>
  );
}
