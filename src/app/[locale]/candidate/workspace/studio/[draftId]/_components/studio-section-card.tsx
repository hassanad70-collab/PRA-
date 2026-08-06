"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RepeatableEntryEditor } from "@/components/candidate/resume-builder/repeatable-entry-editor";
import { computeSectionCompletion } from "@/lib/resume-studio/completion";
import { STUDIO_SECTION_LABELS, getStudioSectionFields, isArraySection } from "@/lib/resume-studio/schema";
import type { ResumeDraftSection } from "@/types/database";
import type { FieldSchema } from "@/lib/resume-builder/section-schemas";
import type { SectionAiOperation } from "@/types/database";
import { AiOperationsPanel } from "./ai-operations-panel";

type Entry = Record<string, unknown>;

interface Props {
  section: ResumeDraftSection;
  draftId: string;
  isActive: boolean;
  onUpdate: (id: string, content: unknown) => void;
  onSelect: () => void;
}

export function StudioSectionCard({ section, draftId, isActive, onUpdate, onSelect }: Props) {
  const [collapsed, setCollapsed] = React.useState(!isActive);
  const [showAi, setShowAi] = React.useState(false);
  const completion = computeSectionCompletion(section);
  const label = STUDIO_SECTION_LABELS[section.section_type] ?? section.section_type;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  React.useEffect(() => {
    if (isActive && collapsed) setCollapsed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const studioFields = getStudioSectionFields(section.section_type);
  // Cast to FieldSchema[] so RepeatableEntryEditor accepts it (same shape)
  const fields = studioFields as unknown as FieldSchema[];
  const isArr = isArraySection(section.section_type);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = section.content as any;

  const handleAiResult = (op: SectionAiOperation, resultText: string) => {
    if (section.section_type === "summary") {
      onUpdate(section.id, { ...content, text: resultText });
    } else if (section.section_type === "skills" || section.section_type === "interests") {
      const items = resultText.split("\n").map((l: string) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
      onUpdate(section.id, { items });
    } else {
      onUpdate(section.id, { ...content, _ai_suggestion: resultText });
    }
    setShowAi(false);
  };

  const getContentText = (): string => {
    if (!content) return "";
    if (section.section_type === "summary") return content.text ?? "";
    if (section.section_type === "skills" || section.section_type === "interests") {
      return Array.isArray(content.items) ? content.items.join(", ") : "";
    }
    if (Array.isArray(content)) {
      return content.map((e: Entry) => Object.values(e).join(" ")).join("\n");
    }
    return JSON.stringify(content);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-lg border bg-card", isActive && "ring-1 ring-primary")}>
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={() => { onSelect(); setCollapsed((c) => !c); }}
      >
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <Badge
          variant="outline"
          className={cn(
            "h-5 text-[10px] px-1.5",
            completion.status === "complete" && "border-green-500 text-green-600",
            completion.status === "partial" && "border-yellow-500 text-yellow-600",
            completion.status === "empty" && "border-muted text-muted-foreground"
          )}
        >
          {completion.pct}%
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => { e.stopPropagation(); setShowAi((v) => !v); }}
          title="AI operations"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        </Button>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </div>

      {!collapsed && (
        <div className="border-t px-3 pb-3 pt-2.5 space-y-3">
          {showAi && (
            <AiOperationsPanel
              draftId={draftId}
              sectionId={section.id}
              sectionType={section.section_type}
              currentContentText={getContentText()}
              onResult={handleAiResult}
            />
          )}

          {renderEditor(section, content, fields, isArr, onUpdate)}
        </div>
      )}
    </div>
  );
}

function renderEditor(
  section: ResumeDraftSection,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any,
  fields: FieldSchema[],
  isArr: boolean,
  onUpdate: (id: string, content: unknown) => void
) {
  const type = section.section_type;

  if (type === "personal_info") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "full_name", label: "Full Name" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
          { key: "address", label: "Location / Address" },
          { key: "current_position", label: "Current Job Title" },
        ].map(({ key, label, type: t }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
              type={t ?? "text"}
              value={content?.[key] ?? ""}
              onChange={(e) => onUpdate(section.id, { ...content, [key]: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    );
  }

  if (type === "summary") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Summary Text</Label>
        <Textarea
          rows={5}
          value={content?.text ?? ""}
          onChange={(e) => onUpdate(section.id, { text: e.target.value })}
          placeholder="Write a compelling professional summary…"
          className="text-sm"
        />
      </div>
    );
  }

  if (type === "skills" || type === "interests") {
    const items: string[] = Array.isArray(content?.items) ? content.items : [];
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">
          {type === "skills" ? "Skills (comma-separated)" : "Interests (comma-separated)"}
        </Label>
        <Input
          value={items.join(", ")}
          onChange={(e) =>
            onUpdate(section.id, { items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
          }
          placeholder="e.g. TypeScript, React, Next.js"
          className="h-8 text-sm"
        />
        {items.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {items.map((item) => (
              <span key={item} className="rounded-full bg-muted px-2 py-0.5 text-xs">{item}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === "social_links") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "linkedin_url", label: "LinkedIn URL" },
          { key: "github_url", label: "GitHub URL" },
          { key: "portfolio_url", label: "Portfolio URL" },
          { key: "website_url", label: "Website URL" },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <Input
              type="url"
              value={content?.[key] ?? ""}
              onChange={(e) => onUpdate(section.id, { ...content, [key]: e.target.value })}
              className="h-8 text-sm"
              placeholder="https://"
            />
          </div>
        ))}
      </div>
    );
  }

  if (isArr && fields.length > 0) {
    const entries: Entry[] = Array.isArray(content) ? content : [];
    return (
      <RepeatableEntryEditor
        fields={fields}
        entries={entries}
        onChange={(next) => onUpdate(section.id, next)}
      />
    );
  }

  return (
    <div className="text-sm text-muted-foreground">
      This section type does not have a configurable editor yet.
    </div>
  );
}
