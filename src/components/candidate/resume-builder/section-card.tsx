"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptSectionSuggestion,
  regenerateSection,
  rejectSectionSuggestion,
  updateSectionContent,
} from "@/actions/resume-builder";
import { RepeatableEntryEditor } from "@/components/candidate/resume-builder/repeatable-entry-editor";
import { getArraySectionFields, getSectionLabels, isArraySectionType } from "@/lib/resume-builder/section-schemas";
import type {
  AiEligibleSectionType,
  ResumeDraftSection,
  ResumeSectionContentMap,
} from "@/types/database";

const AI_ELIGIBLE = new Set<string>(["summary", "experience", "skills"]);

export function SectionCard({ draftId, section }: { draftId: string; section: ResumeDraftSection }) {
  const t = useTranslations("Candidate.SectionCard");
  const tSchemas = useTranslations("Candidate.SectionSchemas");
  const tShared = useTranslations("Candidate.Shared");
  const sectionLabels = getSectionLabels(tSchemas);

  const [isEditing, setIsEditing] = React.useState(false);
  const [draftContent, setDraftContent] = React.useState<unknown>(section.content);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!isEditing) setDraftContent(section.content);
  }, [section.content, isEditing]);

  const isAiEligible = AI_ELIGIBLE.has(section.section_type);

  const handleRegenerate = () => {
    startTransition(async () => {
      const res = await regenerateSection(draftId, section.section_type as AiEligibleSectionType);
      if (!res.success) toast.error(res.error ?? t("regenerateFailed"));
    });
  };

  const handleAccept = () => {
    startTransition(async () => {
      const res = await acceptSectionSuggestion(section.id);
      if (!res.success) toast.error(res.error ?? t("acceptFailed"));
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const res = await rejectSectionSuggestion(section.id);
      if (!res.success) toast.error(res.error ?? t("rejectFailed"));
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateSectionContent(section.id, draftContent);
      if (res.success) {
        toast.success(t("savedToast", { section: sectionLabels[section.section_type] }));
        setIsEditing(false);
      } else {
        toast.error(res.error ?? t("saveFailed"));
      }
    });
  };

  return (
    <Card data-testid={`section-${section.section_type}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{sectionLabels[section.section_type]}</CardTitle>
        <div className="flex items-center gap-2">
          {isAiEligible && (
            <Button variant="outline" size="sm" disabled={isPending} onClick={handleRegenerate}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t("regenerateWithAi")}
            </Button>
          )}
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              {tShared("edit")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {section.ai_suggestion != null && (
          <SuggestionReview
            sectionType={section.section_type}
            current={section.content}
            suggestion={section.ai_suggestion}
            isPending={isPending}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}

        {isEditing ? (
          <div className="space-y-4">
            <SectionEditForm sectionType={section.section_type} content={draftContent} onChange={setDraftContent} />
            <div className="flex gap-2">
              <Button size="sm" variant="gradient" disabled={isPending} onClick={handleSave}>
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {tShared("save")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraftContent(section.content);
                  setIsEditing(false);
                }}
              >
                {tShared("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <SectionReadView sectionType={section.section_type} content={section.content} />
        )}
      </CardContent>
    </Card>
  );
}

function SuggestionReview({
  sectionType,
  current,
  suggestion,
  isPending,
  onAccept,
  onReject,
}: {
  sectionType: string;
  current: unknown;
  suggestion: unknown;
  isPending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = useTranslations("Candidate.SectionCard");
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" /> {t("aiSuggestionCompare")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{t("current")}</p>
          <div className="rounded-lg bg-background/70 p-3 text-sm">
            <SectionReadView sectionType={sectionType as ResumeDraftSection["section_type"]} content={current} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">{t("suggested")}</p>
          <div className="rounded-lg bg-background/70 p-3 text-sm">
            <SectionReadView sectionType={sectionType as ResumeDraftSection["section_type"]} content={suggestion} />
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="gradient" disabled={isPending} onClick={onAccept}>
          <Check className="h-3.5 w-3.5" /> {t("accept")}
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={onReject}>
          <X className="h-3.5 w-3.5" /> {t("reject")}
        </Button>
      </div>
    </div>
  );
}

function SectionReadView({
  sectionType,
  content,
}: {
  sectionType: ResumeDraftSection["section_type"];
  content: unknown;
}) {
  if (sectionType === "personal_info") {
    const c = content as ResumeSectionContentMap["personal_info"];
    const rows = [c?.full_name, c?.current_position, c?.email, c?.phone, c?.address].filter(Boolean);
    if (!rows.length) return <EmptyHint />;
    return <p className="text-sm text-muted-foreground">{rows.join(" · ")}</p>;
  }

  if (sectionType === "summary") {
    const c = content as ResumeSectionContentMap["summary"];
    if (!c?.text) return <EmptyHint />;
    return <p className="text-sm text-muted-foreground">{c.text}</p>;
  }

  if (sectionType === "skills") {
    const c = content as ResumeSectionContentMap["skills"];
    if (!c?.items?.length) return <EmptyHint />;
    return (
      <div className="flex flex-wrap gap-1.5">
        {c.items.map((s, i) => (
          <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
            {s}
          </span>
        ))}
      </div>
    );
  }

  if (sectionType === "social_links") {
    const c = content as ResumeSectionContentMap["social_links"];
    const rows = [c?.linkedin_url, c?.github_url, c?.portfolio_url, c?.website_url].filter(Boolean);
    if (!rows.length) return <EmptyHint />;
    return <p className="text-sm text-muted-foreground">{rows.join(" · ")}</p>;
  }

  // Array-shaped factual sections: experience, education, certifications, languages, projects, achievements
  const entries = (Array.isArray(content) ? content : []) as Record<string, unknown>[];
  if (!entries.length) return <EmptyHint />;

  return (
    <ul className="space-y-2">
      {entries.map((entry, i) => (
        <li key={i} className="rounded-lg border border-border p-2.5 text-sm">
          {Object.entries(entry)
            .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)
            .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" · ")}
        </li>
      ))}
    </ul>
  );
}

function EmptyHint() {
  const t = useTranslations("Candidate.SectionCard");
  return <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>;
}

function SectionEditForm({
  sectionType,
  content,
  onChange,
}: {
  sectionType: ResumeDraftSection["section_type"];
  content: unknown;
  onChange: (next: unknown) => void;
}) {
  const t = useTranslations("Candidate.SectionCard");
  const tSchemas = useTranslations("Candidate.SectionSchemas");
  const tBasicInfo = useTranslations("Candidate.BasicInfoForm");

  if (sectionType === "personal_info") {
    const c = (content as ResumeSectionContentMap["personal_info"]) ?? {};
    const update = (key: keyof typeof c, value: string) => onChange({ ...c, [key]: value });
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("fields.fullName")} value={c.full_name} onChange={(v) => update("full_name", v)} />
        <Field label={tBasicInfo("currentPosition")} value={c.current_position} onChange={(v) => update("current_position", v)} />
        <Field label={t("fields.email")} value={c.email} onChange={(v) => update("email", v)} />
        <Field label={t("fields.phone")} value={c.phone} onChange={(v) => update("phone", v)} />
        <Field label={t("fields.address")} value={c.address} onChange={(v) => update("address", v)} />
      </div>
    );
  }

  if (sectionType === "summary") {
    const c = (content as ResumeSectionContentMap["summary"]) ?? {};
    return (
      <div className="space-y-2">
        <Label htmlFor="summary-text">{t("fields.summary")}</Label>
        <Textarea
          id="summary-text"
          rows={4}
          value={c.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
    );
  }

  if (sectionType === "skills") {
    const c = (content as ResumeSectionContentMap["skills"]) ?? { items: [] };
    return (
      <div className="space-y-2">
        <Label htmlFor="skills-input">{t("fields.skillsCommaSeparated")}</Label>
        <Input
          id="skills-input"
          value={(c.items ?? []).join(", ")}
          onChange={(e) => onChange({ items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
    );
  }

  if (sectionType === "social_links") {
    const c = (content as ResumeSectionContentMap["social_links"]) ?? {};
    const update = (key: keyof typeof c, value: string) => onChange({ ...c, [key]: value });
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("fields.linkedin")} value={c.linkedin_url} onChange={(v) => update("linkedin_url", v)} />
        <Field label={t("fields.github")} value={c.github_url} onChange={(v) => update("github_url", v)} />
        <Field label={t("fields.portfolio")} value={c.portfolio_url} onChange={(v) => update("portfolio_url", v)} />
        <Field label={t("fields.website")} value={c.website_url} onChange={(v) => update("website_url", v)} />
      </div>
    );
  }

  if (isArraySectionType(sectionType)) {
    const entries = (Array.isArray(content) ? content : []) as Record<string, unknown>[];
    return <RepeatableEntryEditor fields={getArraySectionFields(tSchemas)[sectionType]} entries={entries} onChange={onChange} />;
  }

  return null;
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const id = `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
