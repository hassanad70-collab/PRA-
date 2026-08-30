"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RESUME_TEMPLATES, TEMPLATE_CONFIGS } from "@/lib/resume-studio/templates";
import type { ResumeTemplate, TemplateConfig } from "@/lib/resume-studio/templates";
import { ResumePreview } from "./resume-preview";

type LayoutFilter = "all" | "single" | "two-column";

interface Props {
  previewHtml: string;
  template: ResumeTemplate;
  collapsed: boolean;
  onTemplateChange: (t: ResumeTemplate) => void;
  onToggleCollapse: () => void;
}

function TemplateMiniPreview({ config }: { config: TemplateConfig }) {
  const isTwoCol = config.layout === "two-column";
  return (
    <div
      className="h-14 w-full overflow-hidden rounded-sm border border-gray-100"
      style={{ background: "#FFFFFF" }}
    >
      {isTwoCol ? (
        <div className="flex h-full">
          <div className="h-full w-[30%]" style={{ background: config.sidebarBg ?? config.accent }} />
          <div className="flex flex-1 flex-col gap-[2px] p-[4px]">
            <div className="h-[4px] rounded-[1px]" style={{ background: config.accent, width: "65%" }} />
            <div className="h-[2px] rounded-[1px] bg-gray-200" style={{ width: "45%" }} />
            <div className="mt-[2px] h-[1px]" style={{ background: config.accent, opacity: 0.4, width: "100%" }} />
            <div className="h-[2px] rounded-[1px] bg-gray-100" style={{ width: "80%" }} />
            <div className="h-[2px] rounded-[1px] bg-gray-100" style={{ width: "60%" }} />
            <div className="h-[2px] rounded-[1px] bg-gray-100" style={{ width: "75%" }} />
            <div className="mt-[2px] h-[1px]" style={{ background: config.accent, opacity: 0.4, width: "100%" }} />
            <div className="h-[2px] rounded-[1px] bg-gray-100" style={{ width: "70%" }} />
            <div className="h-[2px] rounded-[1px] bg-gray-100" style={{ width: "55%" }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[2px] p-[5px]">
          {config.sectionHeaderStyle === "filled" && (
            <div className="h-[5px] rounded-[1px]" style={{ background: config.accent, width: "100%" }} />
          )}
          <div className="h-[4px] rounded-[1px]" style={{ background: config.accent, width: "55%" }} />
          <div className="h-[2px] rounded-[1px] bg-gray-300" style={{ width: "35%" }} />
          <div
            className="mt-[2px] h-[1px]"
            style={{
              background: config.sectionHeaderStyle === "underline" ? config.accent : "#e5e7eb",
              width: "100%",
            }}
          />
          <div className="h-[2px] rounded-[1px] bg-gray-200" style={{ width: "80%" }} />
          <div className="h-[2px] rounded-[1px] bg-gray-200" style={{ width: "65%" }} />
          <div className="h-[2px] rounded-[1px] bg-gray-200" style={{ width: "70%" }} />
          <div className="mt-[2px] h-[1px] bg-gray-100" style={{ width: "100%" }} />
          <div className="h-[2px] rounded-[1px] bg-gray-200" style={{ width: "75%" }} />
          <div className="h-[2px] rounded-[1px] bg-gray-200" style={{ width: "60%" }} />
        </div>
      )}
    </div>
  );
}

export function StudioRightPanel({
  previewHtml, template, collapsed, onTemplateChange, onToggleCollapse,
}: Props) {
  const [zoom, setZoom] = React.useState(70);
  const [filter, setFilter] = React.useState<LayoutFilter>("all");

  const filtered = RESUME_TEMPLATES.filter((t) => {
    if (filter === "all") return true;
    return TEMPLATE_CONFIGS[t].layout === filter;
  });

  return (
    <div
      className={cn(
        "relative flex flex-col border-l bg-muted/10 transition-all duration-200",
        collapsed ? "w-12" : "w-[420px]"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3.5 top-3 z-10 h-7 w-7 rounded-full border bg-background shadow-sm"
        onClick={onToggleCollapse}
      >
        {collapsed ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </Button>

      {!collapsed && (
        <>
          {/* Preview toolbar */}
          <div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom((z) => Math.max(40, z - 10))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-xs">{zoom}%</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom((z) => Math.min(120, z + 10))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Template selector */}
          <div className="shrink-0 border-b bg-background">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">Template</p>
                <p className="text-[10px] text-muted-foreground">Choose how your CV looks</p>
              </div>
              <div className="flex items-center gap-1">
                {(["all", "single", "two-column"] as LayoutFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-150",
                      filter === f
                        ? "bg-pra-primary text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {f === "all" ? "All" : f === "single" ? "Single" : "Two-Col"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid max-h-[286px] grid-cols-2 gap-2 overflow-y-auto px-3 pb-3">
              {filtered.map((t) => {
                const config = TEMPLATE_CONFIGS[t];
                const isSelected = t === template;
                return (
                  <button
                    key={t}
                    onClick={() => onTemplateChange(t)}
                    aria-pressed={isSelected}
                    aria-label={`Select ${config.name} template`}
                    className={cn(
                      "group relative rounded-lg border-2 bg-card p-1.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pra-primary",
                      isSelected
                        ? "border-pra-primary bg-pra-primary/[0.03] shadow-sm"
                        : "border-border hover:border-pra-primary/40 hover:shadow-sm"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-pra-primary">
                        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                    <TemplateMiniPreview config={config} />
                    <div className="mt-1.5 px-0.5">
                      <p
                        className={cn(
                          "text-[11px] font-semibold leading-tight",
                          isSelected ? "text-pra-primary" : "text-foreground"
                        )}
                      >
                        {config.name}
                      </p>
                      <p className="mt-0.5 text-[9px] capitalize text-muted-foreground">
                        {config.layout === "two-column" ? "Two column" : "Single column"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resume preview */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <ResumePreview html={previewHtml} zoom={zoom} />
          </div>
        </>
      )}
    </div>
  );
}
