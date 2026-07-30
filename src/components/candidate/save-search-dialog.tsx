"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookmarkPlus, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSearch } from "@/actions/saved-searches";

export interface SearchParamsToSave {
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
}

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: SearchParamsToSave;
  onSaved?: (id: string) => void;
}

export function SaveSearchDialog({ open, onOpenChange, params, onSaved }: SaveSearchDialogProps) {
  const t = useTranslations("Candidate.Jobs");
  const [name, setName] = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("weekly");
  const [saving, setSaving] = useState(false);

  const defaultName = [params.query, params.keywords, params.location]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 60) || "My Search";

  async function handleSave() {
    setSaving(true);
    const result = await saveSearch({
      name: name.trim() || defaultName,
      query: params.query,
      keywords: params.keywords,
      location: params.location,
      experience_level: params.experience_level,
      filters: params.filters,
      alert_enabled: alertEnabled,
      alert_frequency: frequency,
    });
    setSaving(false);
    if (result.success) {
      onSaved?.(result.id!);
      setName("");
      setAlertEnabled(false);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-4 w-4" />
            {t("saveSearchTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="search-name">{t("saveSearchNameLabel")}</Label>
            <Input
              id="search-name"
              placeholder={defaultName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t("saveSearchAlertLabel")}</p>
                <p className="text-xs text-muted-foreground">{t("saveSearchAlertHint")}</p>
              </div>
            </div>
            <Switch checked={alertEnabled} onCheckedChange={setAlertEnabled} />
          </div>

          {alertEnabled && (
            <div className="space-y-1.5">
              <Label>{t("saveSearchFrequencyLabel")}</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">{t("alertFrequencyInstant")}</SelectItem>
                  <SelectItem value="daily">{t("alertFrequencyDaily")}</SelectItem>
                  <SelectItem value="weekly">{t("alertFrequencyWeekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("saveSearchSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
