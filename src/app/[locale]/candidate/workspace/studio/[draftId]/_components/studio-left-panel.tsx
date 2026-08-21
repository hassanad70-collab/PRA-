"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { computeSectionCompletion } from "@/lib/resume-studio/completion";
import { STUDIO_SECTION_LABELS } from "@/lib/resume-studio/schema";
import type { ResumeDraftSection } from "@/types/database";
import { JobDescriptionSection } from "./job-description-section";

interface Props {
  sections: ResumeDraftSection[];
  activeSectionId: string | null;
  collapsed: boolean;
  draftId: string;
  jobDescription: string;
  onSectionSelect: (id: string) => void;
  onToggleCollapse: () => void;
  onJobDescriptionChange: (jd: string) => void;
}

function CompletionRing({ pct, size = 20 }: { pct: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct === 100 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#e5e7eb";

  return (
    <svg width={size} height={size} className="shrink-0" style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={2} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={2}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StudioLeftPanel({
  sections, activeSectionId, collapsed, draftId, jobDescription,
  onSectionSelect, onToggleCollapse, onJobDescriptionChange,
}: Props) {
  const [showJD, setShowJD] = React.useState(false);

  return (
    <div
      className={cn(
        "relative flex flex-col border-r bg-muted/20 transition-all duration-200",
        collapsed ? "w-12" : "w-64"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3.5 top-3 z-10 h-7 w-7 rounded-full border bg-background shadow-sm"
        onClick={onToggleCollapse}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </Button>

      {!collapsed && (
        <div className="flex h-9 shrink-0 items-center border-b px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sections</span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowJD((v) => !v)}
            title="Job Description"
          >
            <Briefcase className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className={cn("py-1", collapsed && "flex flex-col items-center gap-1 py-2")}>
          {sections.map((section) => {
            const completion = computeSectionCompletion(section);
            const label = STUDIO_SECTION_LABELS[section.section_type] ?? section.section_type;
            const isActive = section.id === activeSectionId;

            if (collapsed) {
              return (
                <button
                  key={section.id}
                  title={label}
                  onClick={() => onSectionSelect(section.id)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <CompletionRing pct={completion.pct} size={18} />
                </button>
              );
            }

            return (
              <button
                key={section.id}
                onClick={() => onSectionSelect(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <CompletionRing pct={completion.pct} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{label}</div>
                  {completion.status === "empty" && (
                    <div className="text-[10px] text-muted-foreground">Empty</div>
                  )}
                  {completion.status === "partial" && (
                    <div className="text-[10px] text-pra-warning">{completion.pct}%</div>
                  )}
                  {completion.status === "complete" && (
                    <div className="text-[10px] text-pra-success">Complete</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {!collapsed && showJD && (
        <div className="border-t">
          <JobDescriptionSection
            draftId={draftId}
            value={jobDescription}
            onChange={onJobDescriptionChange}
          />
        </div>
      )}
    </div>
  );
}
