"use client";

import * as React from "react";
import { toast } from "sonner";
import { Clock, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreVersion } from "@/actions/studio";
import type { ResumeDraftSection, ResumeDraftVersion } from "@/types/database";
import type { ResumeTemplate } from "@/lib/resume-studio/templates";

interface Props {
  draftId: string;
  versions: ResumeDraftVersion[];
  onRestored: (sections: ResumeDraftSection[], template: ResumeTemplate) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export function VersionHistoryPanel({ draftId, versions, onRestored }: Props) {
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const handleRestore = async (version: ResumeDraftVersion) => {
    setRestoringId(version.id);
    const res = await restoreVersion(draftId, version.id);
    setRestoringId(null);

    if (!res.success) {
      toast.error(res.error ?? "Failed to restore version");
      return;
    }

    const sections = version.sections_snapshot as ResumeDraftSection[];
    onRestored(sections, version.template as ResumeTemplate);
    toast.success("Version restored");
  };

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Clock className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">No saved versions</p>
          <p className="mt-1 text-xs text-muted-foreground">Use &ldquo;Save version&rdquo; in the top bar to capture a snapshot.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="space-y-2 pr-1">
        {versions.map((v) => (
          <div
            key={v.id}
            className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{v.label ?? "Snapshot"}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(v.created_at)} · {v.template}</p>
              <p className="text-xs text-muted-foreground">
                {Array.isArray(v.sections_snapshot) ? v.sections_snapshot.length : 0} sections
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              title="Restore this version"
              disabled={restoringId === v.id}
              onClick={() => handleRestore(v)}
            >
              {restoringId === v.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RotateCcw className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
