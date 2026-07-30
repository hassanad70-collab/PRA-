"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Clock, RotateCcw, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteSearchHistoryEntry, clearSearchHistory } from "@/actions/search-history";
import type { SearchHistoryEntry } from "@/types/job-discovery";

interface SearchHistoryPanelProps {
  entries: SearchHistoryEntry[];
  onRerun: (entry: SearchHistoryEntry) => void;
}

export function SearchHistoryPanel({ entries: initialEntries, onRerun }: SearchHistoryPanelProps) {
  const t = useTranslations("Candidate.Jobs");
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    startTransition(() => deleteSearchHistoryEntry(id));
  }

  function handleClear() {
    setEntries([]);
    startTransition(() => clearSearchHistory());
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">{t("historyEmpty")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("historyEmptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {t("historyCount", { count: entries.length })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isPending}
          className="text-destructive hover:text-destructive"
        >
          <X className="me-1.5 h-3.5 w-3.5" />
          {t("historyClearAll")}
        </Button>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const label = [entry.query, entry.keywords, entry.location]
            .filter(Boolean)
            .join(" · ") || t("historyUnnamed");

          return (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {entry.experience_level !== "any" && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {entry.experience_level}
                    </Badge>
                  )}
                  {entry.filters.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f.replace("_", " ")}
                    </Badge>
                  ))}
                  {entry.search_count > 1 && (
                    <span className="text-xs text-muted-foreground">
                      ×{entry.search_count}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onRerun(entry)}
                  title={t("historyRerun")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(entry.id)}
                  disabled={isPending}
                  title={t("historyDelete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SearchHistoryPanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}
