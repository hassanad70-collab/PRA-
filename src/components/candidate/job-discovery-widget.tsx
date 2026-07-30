"use client";

import { useTranslations } from "next-intl";
import { Bell, Bookmark, Clock, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SearchHistoryEntry, SavedSearch } from "@/types/job-discovery";

interface JobDiscoveryWidgetProps {
  recentSearches: SearchHistoryEntry[];
  savedSearches: SavedSearch[];
  activeAlerts: number;
}

export function JobDiscoveryWidget({
  recentSearches,
  savedSearches,
  activeAlerts,
}: JobDiscoveryWidgetProps) {
  const t = useTranslations("Candidate.Dashboard");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          {t("jobDiscovery")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{recentSearches.length}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t("recentSearches")}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{savedSearches.length}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Bookmark className="h-3 w-3" />
              {t("savedSearches")}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-2xl font-bold">{activeAlerts}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Bell className="h-3 w-3" />
              {t("activeAlerts")}
            </p>
          </div>
        </div>

        {recentSearches.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("recentSearchLabel")}</p>
            {recentSearches.slice(0, 3).map((s) => {
              const label = [s.query, s.keywords, s.location].filter(Boolean).join(" · ") || "—";
              return (
                <div key={s.id} className="flex items-center gap-2 rounded px-1 py-1.5">
                  <Clock className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                  <p className="min-w-0 flex-1 truncate text-xs">{label}</p>
                  {s.search_count > 1 && (
                    <Badge variant="secondary" className="text-xs">×{s.search_count}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
