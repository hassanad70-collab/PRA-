"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Building2, Clock, MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { SaveJobButton } from "@/components/candidate/save-job-button";
import { ExternalJobSearch } from "@/components/candidate/external-job-search";
import { SearchHistoryPanel } from "@/components/candidate/search-history-panel";
import { SavedSearchesPanel } from "@/components/candidate/saved-searches-panel";
import { CareerRecommendationsPanel } from "@/components/candidate/career-recommendations-panel";
import { saveSearchToHistory } from "@/actions/search-history";
import type {
  SearchHistoryEntry,
  SavedSearch,
  JobAlert,
  CareerRecommendationsResult,
  JobSearchRecommendation,
} from "@/types/job-discovery";
import type { SearchState } from "@/components/candidate/external-job-search";
import type { EmploymentType, ExperienceLevel } from "@/types/database";

interface BrowseJobItem {
  id: string;
  title: string;
  location: string | null;
  employment_type: string;
  experience_level: string;
  company: { id: string; name: string; slug: string; logo_url: string | null } | null;
}

interface JobDiscoveryTabsProps {
  jobs: BrowseJobItem[];
  savedJobIds: string[];
  matchScores: Record<string, number>;
  searchQuery?: string;
  searchLocation?: string;
  recommendations: JobSearchRecommendation[];
  recentSearches: SearchHistoryEntry[];
  savedSearches: SavedSearch[];
  alerts: JobAlert[];
  careerData: CareerRecommendationsResult;
}

const TAB_BROWSE = "browse";
const TAB_EXTERNAL = "external";
const TAB_AI = "ai";
const TAB_SAVED = "saved";
const TAB_HISTORY = "history";

export function JobDiscoveryTabs({
  jobs,
  savedJobIds,
  matchScores,
  searchQuery,
  searchLocation,
  recommendations,
  recentSearches,
  savedSearches,
  alerts,
  careerData,
}: JobDiscoveryTabsProps) {
  const t = useTranslations("Candidate.Jobs");
  const tShared = useTranslations("Candidate.Shared");
  const tJobs = useTranslations("Jobs");
  const tCommon = useTranslations("Common");

  const savedIdSet = new Set(savedJobIds);
  const [activeTab, setActiveTab] = useState(TAB_BROWSE);
  const [prefill, setPrefill] = useState<{ key: number; state: SearchState } | null>(null);
  const [, startHistoryTransition] = useTransition();

  function handleSearchExecuted(params: {
    query: string;
    keywords: string;
    location: string;
    experience_level: string;
    filters: string[];
  }) {
    startHistoryTransition(async () => { await saveSearchToHistory(params); });
  }

  function handleRerunFromHistory(entry: SearchHistoryEntry) {
    setPrefill({
      key: Date.now(),
      state: {
        title: entry.query,
        keywords: entry.keywords,
        location: entry.location,
        experienceLevel: entry.experience_level,
        filters: entry.filters,
      },
    });
    setActiveTab(TAB_EXTERNAL);
  }

  function handleRerunFromSaved(search: SavedSearch) {
    setPrefill({
      key: Date.now(),
      state: {
        title: search.query,
        keywords: search.keywords,
        location: search.location,
        experienceLevel: search.experience_level,
        filters: search.filters,
      },
    });
    setActiveTab(TAB_EXTERNAL);
  }

  function handleApplyAIRec(rec: JobSearchRecommendation) {
    setPrefill({
      key: Date.now(),
      state: {
        title: rec.title,
        keywords: rec.keywords,
        location: "",
        experienceLevel: "any",
        filters: [],
      },
    });
    setActiveTab(TAB_EXTERNAL);
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="h-auto flex-wrap gap-1">
        <TabsTrigger value={TAB_BROWSE} className="gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          {t("tabBrowse")}
          {jobs.length > 0 && (
            <Badge variant="secondary" className="ms-1 text-xs">
              {jobs.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value={TAB_EXTERNAL} className="gap-1.5">
          {t("tabExternal")}
        </TabsTrigger>
        <TabsTrigger value={TAB_AI} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {t("tabAI")}
        </TabsTrigger>
        <TabsTrigger value={TAB_SAVED} className="gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          {t("tabSaved")}
          {savedSearches.length > 0 && (
            <Badge variant="secondary" className="ms-1 text-xs">
              {savedSearches.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value={TAB_HISTORY} className="gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t("tabHistory")}
        </TabsTrigger>
      </TabsList>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Browse PRA Jobs                                                */}
      {/* ------------------------------------------------------------------ */}
      <TabsContent value={TAB_BROWSE} className="mt-0 space-y-4">
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
            defaultValue={searchQuery}
            placeholder={tJobs("searchPlaceholder")}
            className="sm:max-w-sm"
          />
          <Input
            name="location"
            defaultValue={searchLocation}
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
            const matchScore = matchScores[job.id];
            return (
              <Card key={job.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <Link href={`/candidate/jobs/${job.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{job.title}</h3>
                      {matchScore !== undefined && (
                        <Badge
                          variant={
                            matchScore >= 80 ? "success" : matchScore >= 60 ? "warning" : "outline"
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
                  <SaveJobButton jobId={job.id} initialSaved={savedIdSet.has(job.id)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: External Search                                                */}
      {/* ------------------------------------------------------------------ */}
      <TabsContent value={TAB_EXTERNAL} className="mt-0">
        <ExternalJobSearch
          key={prefill?.key ?? 0}
          initialSearch={prefill?.state}
          recommendations={recommendations}
          onSearchExecuted={handleSearchExecuted}
        />
      </TabsContent>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: AI Career                                                       */}
      {/* ------------------------------------------------------------------ */}
      <TabsContent value={TAB_AI} className="mt-0">
        <CareerRecommendationsPanel
          data={careerData}
          onApplyRecommendation={handleApplyAIRec}
        />
      </TabsContent>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Saved Searches & Alerts                                        */}
      {/* ------------------------------------------------------------------ */}
      <TabsContent value={TAB_SAVED} className="mt-0">
        <SavedSearchesPanel
          savedSearches={savedSearches}
          alerts={alerts}
          onRerun={handleRerunFromSaved}
        />
      </TabsContent>

      {/* ------------------------------------------------------------------ */}
      {/* Tab: Search History                                                 */}
      {/* ------------------------------------------------------------------ */}
      <TabsContent value={TAB_HISTORY} className="mt-0">
        <SearchHistoryPanel
          entries={recentSearches}
          onRerun={handleRerunFromHistory}
        />
      </TabsContent>
    </Tabs>
  );
}
