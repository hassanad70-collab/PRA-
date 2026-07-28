"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import { addAchievement, addSkill, applySummaryRewrite, updateExperienceDescription } from "@/actions/profile";
import { generateResumeSuggestions, type ResumeSuggestions } from "@/actions/resume";

type ItemStatus = "pending" | "applied" | "rejected";

function listKeys(s: ResumeSuggestions): string[] {
  const keys: string[] = [];
  if (s.summary.suggested.trim() && s.summary.suggested.trim() !== (s.summary.current ?? "").trim()) {
    keys.push("summary");
  }
  s.experience.forEach((e) => {
    if (e.suggested.trim() && e.suggested.trim() !== (e.current ?? "").trim()) keys.push(`experience:${e.id}`);
  });
  s.skillAdditions.forEach((skill) => keys.push(`skill:${skill}`));
  s.achievements.forEach((_, i) => keys.push(`achievement:${i}`));
  s.atsKeywords.forEach((k) => keys.push(`keyword:${k}`));
  return keys;
}

/**
 * The Resume Intelligence Hub's "Rewrite & Optimize" module (Unit B).
 * Reuses generateResumeSuggestions (which itself reuses the Resume
 * Builder's generateSummarySuggestion/generateExperienceSuggestion/
 * generateSkillsSuggestion) for the Summary/Bullet/Skills tools, and the
 * decomposed generateAchievementStatements/generateAtsKeywordSuggestions
 * for the rest -- one AI implementation per capability, not duplicated
 * between the Resume Builder and this hub.
 *
 * Weak-phrase and action-verb feedback intentionally live in the Score &
 * Health checklist above, not here: those are deterministic pattern
 * checks, not AI generation, per the "AI only for what can't be produced
 * deterministically" principle.
 */
export function RewriteOptimizePanel() {
  const t = useTranslations("Candidate.ResumeIntelligence");
  const router = useRouter();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [applyingKey, setApplyingKey] = React.useState<string | null>(null);
  const [isBatchApplying, setIsBatchApplying] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<ResumeSuggestions | null>(null);
  const [itemStatus, setItemStatus] = React.useState<Record<string, ItemStatus>>({});

  const generate = () => {
    setIsGenerating(true);
    generateResumeSuggestions()
      .then((result) => {
        if (result.success && result.suggestions) {
          setSuggestions(result.suggestions);
          setItemStatus({});
        } else {
          toast.error(result.error ?? t("toastGenerateFailed"));
        }
      })
      .finally(() => setIsGenerating(false));
  };

  const applyOne = async (key: string): Promise<boolean> => {
    if (!suggestions) return false;

    if (key === "summary") {
      const res = await applySummaryRewrite(suggestions.summary.suggested);
      if (!res.success) toast.error(res.error ?? t("toastApplyFailed"));
      else toast.success(t("toastSummaryApplied"));
      return res.success;
    }
    if (key.startsWith("experience:")) {
      const id = key.slice("experience:".length);
      const item = suggestions.experience.find((e) => e.id === id);
      if (!item) return false;
      const res = await updateExperienceDescription(id, item.suggested);
      if (!res.success) toast.error(res.error ?? t("toastApplyFailed"));
      else toast.success(t("toastExperienceApplied"));
      return res.success;
    }
    if (key.startsWith("skill:") || key.startsWith("keyword:")) {
      const name = key.startsWith("skill:") ? key.slice("skill:".length) : key.slice("keyword:".length);
      const formData = new FormData();
      formData.set("skillName", name);
      formData.set("proficiency", "intermediate");
      const res = await addSkill(formData);
      if (!res.success) toast.error(res.error ?? t("toastApplyFailed"));
      else toast.success(t("toastSkillApplied"));
      return res.success;
    }
    if (key.startsWith("achievement:")) {
      const index = Number(key.slice("achievement:".length));
      const text = suggestions.achievements[index];
      if (!text) return false;
      const res = await addAchievement(text);
      if (!res.success) toast.error(res.error ?? t("toastApplyFailed"));
      else toast.success(t("toastAchievementApplied"));
      return res.success;
    }
    return false;
  };

  const handleAccept = (key: string) => {
    setApplyingKey(key);
    applyOne(key)
      .then((ok) => {
        if (ok) {
          setItemStatus((prev) => ({ ...prev, [key]: "applied" }));
          router.refresh();
        }
      })
      .finally(() => setApplyingKey(null));
  };

  const handleReject = (key: string) => {
    setItemStatus((prev) => ({ ...prev, [key]: "rejected" }));
  };

  const pendingKeys = suggestions ? listKeys(suggestions).filter((k) => (itemStatus[k] ?? "pending") === "pending") : [];

  const handleBatchApply = async () => {
    setIsBatchApplying(true);
    let count = 0;
    for (const key of pendingKeys) {
      setApplyingKey(key);
      const ok = await applyOne(key);
      if (ok) {
        count++;
        setItemStatus((prev) => ({ ...prev, [key]: "applied" }));
      }
    }
    setApplyingKey(null);
    setIsBatchApplying(false);
    if (count > 0) {
      toast.success(t("toastBatchApplied", { count }));
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">{t("rewriteOptimizeTitle")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("rewriteOptimizeSubtitle")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {suggestions && pendingKeys.length > 0 && (
            <Button variant="outline" size="sm" disabled={isBatchApplying || isGenerating} onClick={handleBatchApply}>
              {isBatchApplying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("batchApply", { count: pendingKeys.length })}
            </Button>
          )}
          <Button variant="gradient" size="sm" disabled={isGenerating} onClick={generate}>
            {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {suggestions ? t("regenerate") : t("generateSuggestions")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!suggestions && !isGenerating && <p className="py-8 text-center text-sm text-muted-foreground">{t("noSuggestionsYet")}</p>}
        {isGenerating && !suggestions && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {suggestions && listKeys(suggestions).length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noSuggestionsFound")}</p>
        )}

        {suggestions && listKeys(suggestions).length > 0 && (
          <div className="space-y-4">
            {listKeys(suggestions).includes("summary") && (
              <CompareItem
                itemKey="summary"
                label={t("summaryLabel")}
                current={suggestions.summary.current}
                suggested={suggestions.summary.suggested}
                status={itemStatus.summary ?? "pending"}
                isApplying={applyingKey === "summary"}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}

            {suggestions.experience
              .filter((e) => e.suggested.trim() && e.suggested.trim() !== (e.current ?? "").trim())
              .map((e) => {
                const key = `experience:${e.id}`;
                return (
                  <CompareItem
                    key={key}
                    itemKey={key}
                    label={t("experienceLabel", { role: e.jobTitle, company: e.companyName })}
                    current={e.current}
                    suggested={e.suggested}
                    status={itemStatus[key] ?? "pending"}
                    isApplying={applyingKey === key}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                );
              })}

            {!!suggestions.skillAdditions.length && (
              <ListItem
                label={t("skillAdditionsLabel")}
                prefix="skill:"
                items={suggestions.skillAdditions}
                itemStatus={itemStatus}
                applyingKey={applyingKey}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}

            {!!suggestions.achievements.length && (
              <ListItem
                label={t("achievementsLabel")}
                prefix="achievement:"
                items={suggestions.achievements}
                itemStatus={itemStatus}
                applyingKey={applyingKey}
                onAccept={handleAccept}
                onReject={handleReject}
                useIndexKey
              />
            )}

            {!!suggestions.atsKeywords.length && (
              <ListItem
                label={t("atsKeywordsLabel")}
                prefix="keyword:"
                items={suggestions.atsKeywords}
                itemStatus={itemStatus}
                applyingKey={applyingKey}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompareItem({
  itemKey,
  label,
  current,
  suggested,
  status,
  isApplying,
  onAccept,
  onReject,
}: {
  itemKey: string;
  label: string;
  current: string | null;
  suggested: string;
  status: ItemStatus;
  isApplying: boolean;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
}) {
  const t = useTranslations("Candidate.ResumeIntelligence");

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <StatusOrActions status={status} isApplying={isApplying} onAccept={() => onAccept(itemKey)} onReject={() => onReject(itemKey)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{t("current")}</p>
          <p className="whitespace-pre-line rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
            {current || "—"}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{t("suggested")}</p>
          <p className="whitespace-pre-line rounded-lg bg-primary/5 p-3 text-sm">{suggested}</p>
        </div>
      </div>
    </div>
  );
}

function ListItem({
  label,
  prefix,
  items,
  itemStatus,
  applyingKey,
  onAccept,
  onReject,
  useIndexKey,
}: {
  label: string;
  prefix: string;
  items: string[];
  itemStatus: Record<string, ItemStatus>;
  applyingKey: string | null;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
  useIndexKey?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="space-y-2">
        {items.map((item, index) => {
          const key = `${prefix}${useIndexKey ? index : item}`;
          const status = itemStatus[key] ?? "pending";
          return (
            <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
              <span className="text-sm">{item}</span>
              <StatusOrActions
                status={status}
                isApplying={applyingKey === key}
                onAccept={() => onAccept(key)}
                onReject={() => onReject(key)}
                compact
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusOrActions({
  status,
  isApplying,
  onAccept,
  onReject,
  compact,
}: {
  status: ItemStatus;
  isApplying: boolean;
  onAccept: () => void;
  onReject: () => void;
  compact?: boolean;
}) {
  const t = useTranslations("Candidate.ResumeIntelligence");

  if (status === "applied") {
    return (
      <Badge variant="success">
        <Check className="me-1 h-3 w-3" /> {t("applied")}
      </Badge>
    );
  }
  if (status === "rejected") {
    return <Badge variant="outline">{t("rejected")}</Badge>;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button size={compact ? "icon" : "sm"} variant="gradient" disabled={isApplying} onClick={onAccept}>
        {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        {!compact && t("accept")}
      </Button>
      <Button size={compact ? "icon" : "sm"} variant="outline" disabled={isApplying} onClick={onReject}>
        <X className="h-3.5 w-3.5" />
        {!compact && t("reject")}
      </Button>
    </div>
  );
}
