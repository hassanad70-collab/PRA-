"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Undo2, Redo2, CheckCircle, Loader2, Clock, FileText,
  History, Download, Save
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { ResumeDraftSection, ResumeDraftVersion } from "@/types/database";
import type { ResumeTemplate } from "@/lib/resume-studio/templates";
import { saveVersion } from "@/actions/studio";
import { VersionHistoryPanel } from "./version-history-panel";

interface Props {
  title: string;
  draftId: string;
  saveStatus: "saved" | "saving" | "unsaved";
  locale: string;
  onTitleChange: (t: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  versions: ResumeDraftVersion[];
  onVersionSaved: (v: ResumeDraftVersion) => void;
  onVersionRestored: (sections: ResumeDraftSection[], template: ResumeTemplate) => void;
}

export function StudioTopBar({
  title, draftId, saveStatus, locale,
  onTitleChange, onUndo, onRedo, versions, onVersionSaved, onVersionRestored,
}: Props) {
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [localTitle, setLocalTitle] = React.useState(title);
  const [isSavingVersion, setIsSavingVersion] = React.useState(false);

  React.useEffect(() => { setLocalTitle(title); }, [title]);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (localTitle.trim() && localTitle !== title) {
      onTitleChange(localTitle.trim());
    }
  };

  const handleSaveVersion = async () => {
    setIsSavingVersion(true);
    const result = await saveVersion(draftId, `Snapshot ${new Date().toLocaleDateString()}`);
    setIsSavingVersion(false);
    if (result.success && result.version) {
      onVersionSaved(result.version);
      toast.success("Version saved");
    } else {
      toast.error(result.error ?? "Failed to save version");
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
      <Link
        href={{ pathname: "/candidate/workspace/studio" }}
        locale={locale}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Drafts</span>
      </Link>

      <div className="mx-2 h-5 w-px bg-border" />

      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      {editingTitle ? (
        <Input
          autoFocus
          className="h-7 max-w-[200px] text-sm font-medium"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === "Enter") handleTitleBlur(); if (e.key === "Escape") { setLocalTitle(title); setEditingTitle(false); } }}
        />
      ) : (
        <button
          className="max-w-[200px] truncate text-sm font-medium hover:text-primary"
          onClick={() => setEditingTitle(true)}
        >
          {localTitle}
        </button>
      )}

      <div className="flex items-center gap-0.5 ml-1">
        {saveStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {saveStatus === "saved" && <CheckCircle className="h-3.5 w-3.5 text-pra-success" />}
        {saveStatus === "unsaved" && <Clock className="h-3.5 w-3.5 text-pra-warning" />}
        <span className="hidden text-xs text-muted-foreground sm:inline ml-1">
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Unsaved"}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRedo} title="Redo (Ctrl+Y)">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleSaveVersion}
        disabled={isSavingVersion}
      >
        {isSavingVersion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save version
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">History</span>
            {versions.length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{versions.length}</Badge>}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>
          <VersionHistoryPanel
            draftId={draftId}
            versions={versions}
            onRestored={onVersionRestored}
          />
        </DialogContent>
      </Dialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8 gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/api/resume-pdf/${draftId}`} target="_blank" rel="noopener noreferrer">
              Download PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/resume-docx/${draftId}`} target="_blank" rel="noopener noreferrer">
              Download DOCX
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.print()}>
            Print
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
