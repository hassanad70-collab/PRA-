"use client";

import * as React from "react";
import { Loader2, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { removeFromTalentPoolAction, toggleTalentPoolFavoriteAction } from "@/actions/employer";
import { initials } from "@/lib/utils";

interface TalentPoolEntry {
  id: string;
  candidate_id: string;
  is_favorite: boolean;
  notes: string | null;
  tags: string[];
  candidate: {
    current_position: string | null;
    profile: { full_name: string; email: string } | null;
  } | null;
}

interface TalentPoolClientProps {
  initialPool: TalentPoolEntry[];
  labels: {
    searchPlaceholder: string;
    favoritesOnly: string;
    removeToast: string;
    removeFailed: string;
    empty: string;
  };
}

export function TalentPoolClient({ initialPool, labels }: TalentPoolClientProps) {
  const [pool, setPool] = React.useState(initialPool);
  const [search, setSearch] = React.useState("");
  const [favOnly, setFavOnly] = React.useState(false);
  const [togglingFav, setTogglingFav] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);

  const filtered = pool.filter((entry) => {
    const name = (entry.candidate?.profile?.full_name ?? "").toLowerCase();
    const pos = (entry.candidate?.current_position ?? "").toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !search || name.includes(q) || pos.includes(q);
    const matchesFav = !favOnly || entry.is_favorite;
    return matchesSearch && matchesFav;
  });

  async function handleToggleFav(entryId: string, current: boolean) {
    setTogglingFav(entryId);
    try {
      await toggleTalentPoolFavoriteAction(entryId, !current);
      setPool((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, is_favorite: !current } : e))
      );
    } finally {
      setTogglingFav(null);
    }
  }

  async function handleRemove(entryId: string) {
    setRemoving(entryId);
    try {
      await removeFromTalentPoolAction(entryId);
      setPool((prev) => prev.filter((e) => e.id !== entryId));
      toast.success(labels.removeToast);
    } catch {
      toast.error(labels.removeFailed);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
            className="ps-9"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={favOnly}
            onChange={(e) => setFavOnly(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          {labels.favoritesOnly}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">{labels.empty}</CardContent>
            </Card>
          </div>
        )}
        {filtered.map((entry) => {
          const name = entry.candidate?.profile?.full_name ?? "—";
          const pos = entry.candidate?.current_position ?? "—";

          return (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{pos}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={togglingFav === entry.id}
                      onClick={() => handleToggleFav(entry.id, entry.is_favorite)}
                    >
                      {togglingFav === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className={`h-4 w-4 ${entry.is_favorite ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={removing === entry.id}
                      onClick={() => handleRemove(entry.id)}
                    >
                      {removing === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {entry.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
                {entry.notes && (
                  <p className="mt-3 text-xs text-muted-foreground">{entry.notes}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
