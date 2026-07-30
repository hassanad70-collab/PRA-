"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, ExternalLink, Globe, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SaveSearchDialog } from "./save-search-dialog";
import { SearchAutocomplete } from "./search-autocomplete";
import type { JobSearchRecommendation } from "@/types/job-discovery";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SearchState {
  title: string;
  keywords: string;
  location: string;
  experienceLevel: string;
  filters: string[];
}

export type { JobSearchRecommendation };

type FilterKey = "remote" | "hybrid" | "on-site" | "full_time" | "part_time" | "internship";

const FILTER_KEYS: FilterKey[] = [
  "remote",
  "hybrid",
  "on-site",
  "full_time",
  "part_time",
  "internship",
];

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

function buildQuery(title: string, keywords: string): string {
  return [title.trim(), keywords.trim()].filter(Boolean).join(" ");
}

function buildGoogleJobsUrl({ title, keywords, location }: SearchState): string {
  const q = [buildQuery(title, keywords), location.trim()].filter(Boolean).join(" ");
  return q
    ? `https://www.google.com/search?q=${encodeURIComponent(q)}&ibp=htl;jobs`
    : "https://www.google.com/search?ibp=htl;jobs";
}

function buildLinkedInUrl({ title, keywords, location, experienceLevel, filters }: SearchState): string {
  const params = new URLSearchParams();
  const q = buildQuery(title, keywords);
  if (q) params.set("keywords", q);
  if (location.trim()) params.set("location", location.trim());
  const expMap: Record<string, string> = { entry: "2", mid: "3", senior: "4", executive: "6" };
  if (expMap[experienceLevel]) params.set("f_E", expMap[experienceLevel]);
  const wtCodes: string[] = [];
  if (filters.includes("remote")) wtCodes.push("2");
  if (filters.includes("hybrid")) wtCodes.push("3");
  if (filters.includes("on-site")) wtCodes.push("1");
  if (wtCodes.length) params.set("f_WT", wtCodes.join(","));
  const jtCodes: string[] = [];
  if (filters.includes("full_time")) jtCodes.push("F");
  if (filters.includes("part_time")) jtCodes.push("P");
  if (filters.includes("internship")) jtCodes.push("I");
  if (jtCodes.length) params.set("f_JT", jtCodes.join(","));
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

function buildWuzzufUrl({ title, keywords, location }: SearchState): string {
  const params = new URLSearchParams();
  const q = buildQuery(title, keywords);
  if (q) params.set("q", q);
  if (location.trim()) params.set("l", location.trim());
  return `https://wuzzuf.net/search/jobs/?${params.toString()}`;
}

function buildIndeedUrl({ title, keywords, location, filters }: SearchState): string {
  const params = new URLSearchParams();
  const q = buildQuery(title, keywords);
  if (q) params.set("q", q);
  if (location.trim()) params.set("l", location.trim());
  if (filters.includes("remote")) params.set("remotejob", "1");
  const jtMap: Record<string, string> = { full_time: "fulltime", part_time: "parttime", internship: "internship" };
  const matchedJt = filters.find((f) => jtMap[f]);
  if (matchedJt) params.set("jt", jtMap[matchedJt]);
  return `https://www.indeed.com/jobs?${params.toString()}`;
}

function buildBaytUrl({ title, keywords, location }: SearchState): string {
  const params = new URLSearchParams();
  const q = buildQuery(title, keywords);
  if (q) params.set("q", q);
  if (location.trim()) params.set("l", location.trim());
  return `https://www.bayt.com/en/international/jobs/?${params.toString()}`;
}

interface PlatformDef {
  key: string;
  label: string;
  color: string;
  initials: string;
  buildUrl: (s: SearchState) => string;
}

const PLATFORMS: PlatformDef[] = [
  { key: "google", label: "Google Jobs", color: "#4285F4", initials: "G", buildUrl: buildGoogleJobsUrl },
  { key: "linkedin", label: "LinkedIn Jobs", color: "#0077B5", initials: "in", buildUrl: buildLinkedInUrl },
  { key: "wuzzuf", label: "Wuzzuf", color: "#E84045", initials: "W", buildUrl: buildWuzzufUrl },
  { key: "indeed", label: "Indeed", color: "#2164F3", initials: "id", buildUrl: buildIndeedUrl },
  { key: "bayt", label: "Bayt", color: "#C8102E", initials: "B", buildUrl: buildBaytUrl },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ExternalJobSearchProps {
  recommendations?: JobSearchRecommendation[];
  initialSearch?: SearchState;
  onSearchExecuted?: (params: { query: string; keywords: string; location: string; experience_level: string; filters: string[] }) => void;
}

export function ExternalJobSearch({
  recommendations = [],
  initialSearch,
  onSearchExecuted,
}: ExternalJobSearchProps) {
  const t = useTranslations("Candidate.Jobs");

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "remote", label: t("filterRemote") },
    { key: "hybrid", label: t("filterHybrid") },
    { key: "on-site", label: t("filterOnSite") },
    { key: "full_time", label: t("filterFullTime") },
    { key: "part_time", label: t("filterPartTime") },
    { key: "internship", label: t("filterInternship") },
  ];

  const [state, setState] = useState<SearchState>(
    initialSearch ?? { title: "", keywords: "", location: "", experienceLevel: "any", filters: [] }
  );
  const [hasSearched, setHasSearched] = useState(!!initialSearch?.title || !!initialSearch?.keywords);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  function updateField<K extends keyof SearchState>(field: K, value: SearchState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
    if (hasSearched) setHasSearched(false);
  }

  function toggleFilter(key: FilterKey) {
    setState((prev) => {
      const next = prev.filters.includes(key)
        ? prev.filters.filter((f) => f !== key)
        : [...prev.filters, key];
      return { ...prev, filters: next };
    });
    if (hasSearched) setHasSearched(false);
  }

  function handleSearch() {
    if (!state.title.trim() && !state.keywords.trim()) return;
    setHasSearched(true);
    onSearchExecuted?.({
      query: state.title,
      keywords: state.keywords,
      location: state.location,
      experience_level: state.experienceLevel,
      filters: state.filters,
    });
  }

  function applyRecommendation(rec: JobSearchRecommendation) {
    setState((prev) => ({ ...prev, title: rec.title, keywords: rec.keywords }));
    setHasSearched(true);
    onSearchExecuted?.({
      query: rec.title,
      keywords: rec.keywords,
      location: state.location,
      experience_level: state.experienceLevel,
      filters: state.filters,
    });
  }

  const queryDisplay = [buildQuery(state.title, state.keywords), state.location.trim()]
    .filter(Boolean)
    .join(" · ");

  const canSearch = state.title.trim() !== "" || state.keywords.trim() !== "";
  const canSave = state.title.trim() !== "" || state.keywords.trim() !== "" || state.location.trim() !== "";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Globe className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{t("externalTitle")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("externalSubtitle")}</p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{t("recommendationsTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("recommendationsSubtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((rec) => (
              <button
                key={rec.title}
                type="button"
                onClick={() => applyRecommendation(rec)}
                title={rec.reason}
                className="group inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Search className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                {rec.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("titleLabel")}</Label>
            <SearchAutocomplete
              field="title"
              placeholder={t("titlePlaceholder")}
              value={state.title}
              onChange={(v) => updateField("title", v)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("keywordsLabel")}</Label>
            <SearchAutocomplete
              field="keywords"
              placeholder={t("keywordsPlaceholder")}
              value={state.keywords}
              onChange={(v) => updateField("keywords", v)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("locationLabel")}</Label>
            <SearchAutocomplete
              field="location"
              placeholder={t("locationPlaceholder")}
              value={state.location}
              onChange={(v) => updateField("location", v)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("experienceLabel")}</Label>
            <Select value={state.experienceLevel} onValueChange={(v) => updateField("experienceLevel", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("experienceAny")}</SelectItem>
                <SelectItem value="entry">{t("experienceEntry")}</SelectItem>
                <SelectItem value="mid">{t("experienceMid")}</SelectItem>
                <SelectItem value="senior">{t("experienceSenior")}</SelectItem>
                <SelectItem value="executive">{t("experienceExecutive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{t("filtersLabel")}:</span>
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                state.filters.includes(key)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSearch} disabled={!canSearch} className="shrink-0">
            <Search className="me-2 h-4 w-4" />
            {t("searchButton")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!canSave}
            className="shrink-0"
          >
            <Bookmark className="me-2 h-4 w-4" />
            {t("saveSearch")}
          </Button>
        </div>
      </div>

      {/* Platform cards — always visible so users understand what will happen */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            {hasSearched ? t("resultsTitle") : t("platformsTitle")}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            {t("opensInNewTab")}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLATFORMS.map((platform) => (
            <Card
              key={platform.key}
              className={cn(
                "transition-all",
                hasSearched
                  ? "hover:shadow-md hover:border-primary/40"
                  : "opacity-60 hover:opacity-80"
              )}
            >
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{platform.label}</p>
                    {queryDisplay && hasSearched ? (
                      <p className="truncate text-xs text-muted-foreground">{queryDisplay}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("searchToOpen")}</p>
                    )}
                  </div>
                </div>
                <a
                  href={hasSearched ? platform.buildUrl(state) : undefined}
                  onClick={!hasSearched ? (e) => e.preventDefault() : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!hasSearched}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                    hasSearched
                      ? "border-primary bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer"
                      : "border-border bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {t("openSearch")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
        {!hasSearched && (
          <p className="text-center text-xs text-muted-foreground">{t("enterSearchToActivate")}</p>
        )}
      </div>

      <SaveSearchDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        params={{
          query: state.title,
          keywords: state.keywords,
          location: state.location,
          experience_level: state.experienceLevel,
          filters: state.filters,
        }}
      />
    </div>
  );
}

export { FILTER_KEYS };
