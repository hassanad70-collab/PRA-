"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RESUME_TEMPLATES, TEMPLATE_CONFIGS } from "@/lib/resume-studio/templates";
import type { ResumeTemplate } from "@/lib/resume-studio/templates";
import { ResumePreview } from "./resume-preview";

interface Props {
  previewHtml: string;
  template: ResumeTemplate;
  collapsed: boolean;
  onTemplateChange: (t: ResumeTemplate) => void;
  onToggleCollapse: () => void;
}

export function StudioRightPanel({
  previewHtml, template, collapsed, onTemplateChange, onToggleCollapse,
}: Props) {
  const [zoom, setZoom] = React.useState(70);

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

          <div className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Template</span>
            <Select value={template} onValueChange={(v) => onTemplateChange(v as ResumeTemplate)}>
              <SelectTrigger className="h-7 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESUME_TEMPLATES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    <span className="font-medium">{TEMPLATE_CONFIGS[t].name}</span>
                    <span className="ml-2 text-muted-foreground">{TEMPLATE_CONFIGS[t].description.slice(0, 30)}…</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <ResumePreview html={previewHtml} zoom={zoom} />
          </div>
        </>
      )}
    </div>
  );
}
