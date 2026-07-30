"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  BellOff,
  BookmarkX,
  Copy,
  MoreHorizontal,
  Play,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteSavedSearch,
  duplicateSavedSearch,
  toggleSavedSearchAlert,
  updateAlertFrequency,
} from "@/actions/saved-searches";
import { toggleJobAlert, deleteJobAlert } from "@/actions/job-alerts";
import type { SavedSearch, JobAlert } from "@/types/job-discovery";

type AlertFrequency = "instant" | "daily" | "weekly";

interface SavedSearchesPanelProps {
  savedSearches: SavedSearch[];
  alerts: JobAlert[];
  onRerun: (search: SavedSearch) => void;
}

export function SavedSearchesPanel({
  savedSearches: initial,
  alerts: initialAlerts,
  onRerun,
}: SavedSearchesPanelProps) {
  const t = useTranslations("Candidate.Jobs");
  const [searches, setSearches] = useState(initial);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isPending, startTransition] = useTransition();

  const FREQ_OPTS: Array<{ value: AlertFrequency; label: string }> = [
    { value: "instant", label: t("alertFrequencyInstant") },
    { value: "daily", label: t("alertFrequencyDaily") },
    { value: "weekly", label: t("alertFrequencyWeekly") },
  ];

  function handleDelete(id: string) {
    setSearches((prev) => prev.filter((s) => s.id !== id));
    startTransition(async () => { await deleteSavedSearch(id); });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateSavedSearch(id);
      if (result.success && result.id) {
        const original = searches.find((s) => s.id === id);
        if (original) {
          setSearches((prev) => [
            { ...original, id: result.id!, name: `${original.name} (copy)`, alert_enabled: false },
            ...prev,
          ]);
        }
      }
    });
  }

  function handleToggleAlert(id: string) {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, alert_enabled: !s.alert_enabled } : s))
    );
    startTransition(async () => { await toggleSavedSearchAlert(id); });
  }

  function handleFrequency(id: string, freq: AlertFrequency) {
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, alert_frequency: freq } : s))
    );
    startTransition(async () => { await updateAlertFrequency(id, freq); });
  }

  function handleToggleJobAlert(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
    );
    startTransition(async () => { await toggleJobAlert(id); });
  }

  function handleDeleteJobAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    startTransition(async () => { await deleteJobAlert(id); });
  }

  return (
    <div className="space-y-8">
      {/* Saved Searches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("savedSearchesTitle")}</h3>
          <Badge variant="secondary">{searches.length}</Badge>
        </div>

        {searches.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <BookmarkX className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("savedSearchesEmpty")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("savedSearchesEmptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {searches.map((search) => {
              const label = [search.query, search.keywords, search.location]
                .filter(Boolean)
                .join(" · ") || t("historyUnnamed");

              return (
                <div key={search.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{search.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {search.experience_level !== "any" && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {search.experience_level}
                          </Badge>
                        )}
                        {search.filters.map((f) => (
                          <Badge key={f} variant="outline" className="text-xs">
                            {f.replace("_", " ")}
                          </Badge>
                        ))}
                        {search.alert_enabled && (
                          <Badge variant="default" className="gap-1 text-xs">
                            <Bell className="h-3 w-3" />
                            {FREQ_OPTS.find((o) => o.value === search.alert_frequency)?.label}
                          </Badge>
                        )}
                      </div>

                      {/* Inline frequency selector — shown only when alert is enabled */}
                      {search.alert_enabled && (
                        <div className="mt-2 max-w-[160px]">
                          <Select
                            value={search.alert_frequency}
                            onValueChange={(v) => handleFrequency(search.id, v as AlertFrequency)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FREQ_OPTS.map((o) => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRerun(search)}>
                          <Play className="me-2 h-3.5 w-3.5" />
                          {t("savedSearchRun")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(search.id)}>
                          <Copy className="me-2 h-3.5 w-3.5" />
                          {t("savedSearchDuplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleAlert(search.id)}>
                          {search.alert_enabled ? (
                            <><BellOff className="me-2 h-3.5 w-3.5" />{t("savedSearchDisableAlert")}</>
                          ) : (
                            <><Bell className="me-2 h-3.5 w-3.5" />{t("savedSearchEnableAlert")}</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(search.id)}
                          className="text-destructive focus:text-destructive"
                          disabled={isPending}
                        >
                          <Trash2 className="me-2 h-3.5 w-3.5" />
                          {t("savedSearchDelete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Alerts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{t("alertsTitle")}</h3>
          <Badge variant="secondary">
            {alerts.filter((a) => a.is_active).length} {t("alertsActive")}
          </Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <BellOff className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("alertsEmpty")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("alertsEmptyHint")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    alert.is_active ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  {alert.is_active ? (
                    <Bell className="h-4 w-4 text-primary" />
                  ) : (
                    <BellOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{alert.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                    {FREQ_OPTS.find((o) => o.value === alert.frequency)?.label}
                    {alert.last_sent_at &&
                      ` · ${t("alertLastSent", { date: new Date(alert.last_sent_at).toLocaleDateString() })}`}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleJobAlert(alert.id)}
                    title={alert.is_active ? t("alertPause") : t("alertResume")}
                    disabled={isPending}
                  >
                    {alert.is_active ? (
                      <BellOff className="h-3.5 w-3.5" />
                    ) : (
                      <Bell className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteJobAlert(alert.id)}
                    disabled={isPending}
                    title={t("alertDelete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SavedSearchesPanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
