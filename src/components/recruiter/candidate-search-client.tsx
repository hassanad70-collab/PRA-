"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Loader2, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCandidateAction, unsaveCandidateAction } from "@/actions/employer";
import { initials } from "@/lib/utils";
import type { CandidateSearchResult } from "@/types/database";

interface CandidateSearchClientProps {
  initialResults: CandidateSearchResult[];
  labels: {
    searchPlaceholder: string;
    locationPlaceholder: string;
    filterLabel: string;
    openToWorkLabel: string;
    searchBtn: string;
    saveLabel: string;
    unsaveLabel: string;
    savedToast: string;
    unsavedToast: string;
    noResults: string;
    yearsExp: string;
    viewProfile: string;
  };
}

export function CandidateSearchClient({ initialResults, labels }: CandidateSearchClientProps) {
  const [results, setResults] = React.useState(initialResults);
  const [query, setQuery] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [openToWork, setOpenToWork] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  // Optimistic save state
  const [savedIds, setSavedIds] = React.useState<Set<string>>(
    () => new Set(initialResults.filter((r) => r.saved).map((r) => r.id))
  );

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (location) params.set("location", location);
      if (openToWork) params.set("openToWork", "1");
      const res = await fetch(`/api/recruiter/candidate-search?${params}`);
      if (res.ok) {
        const data: CandidateSearchResult[] = await res.json();
        setResults(data);
        setSavedIds(new Set(data.filter((r) => r.saved).map((r) => r.id)));
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave(candidateId: string) {
    setSavingId(candidateId);
    const isSaved = savedIds.has(candidateId);
    try {
      if (isSaved) {
        await unsaveCandidateAction(candidateId);
        setSavedIds((prev) => { const s = new Set(prev); s.delete(candidateId); return s; });
        toast.success(labels.unsavedToast);
      } else {
        await saveCandidateAction(candidateId);
        setSavedIds((prev) => new Set([...prev, candidateId]));
        toast.success(labels.savedToast);
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="ps-9"
            />
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.searchBtn}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4">
            <div className="flex-1 space-y-1.5">
              <Label>{labels.locationPlaceholder}</Label>
              <div className="relative">
                <MapPin className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={labels.locationPlaceholder}
                  className="ps-9"
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={openToWork}
                onChange={(e) => setOpenToWork(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              {labels.openToWorkLabel}
            </label>
          </div>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                {labels.noResults}
              </CardContent>
            </Card>
          </div>
        )}
        {results.map((c) => {
          const isSaved = savedIds.has(c.id);
          return (
            <Card key={c.id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(c.profile.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.profile.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.current_position ?? "—"}</p>
                    {c.location && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {c.location}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    disabled={savingId === c.id}
                    onClick={() => toggleSave(c.id)}
                    title={isSaved ? labels.unsaveLabel : labels.saveLabel}
                  >
                    {savingId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isSaved ? (
                      <BookmarkCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {c.years_of_experience} {labels.yearsExp}
                  </span>
                  {c.is_open_to_work && (
                    <Badge variant="success" className="text-[10px]">Open to work</Badge>
                  )}
                </div>

                {c.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.skills.slice(0, 5).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                    {c.skills.length > 5 && (
                      <Badge variant="outline" className="text-[10px]">+{c.skills.length - 5}</Badge>
                    )}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/recruiter/candidates/${c.id}`}>{labels.viewProfile}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
