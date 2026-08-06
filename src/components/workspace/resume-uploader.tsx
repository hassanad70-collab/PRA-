"use client";

import * as React from "react";
import { FileText, Loader2, Trash2, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  uploadWorkspaceResumeAction,
  saveTextWorkspaceResumeAction,
  deleteWorkspaceResumeAction,
} from "@/actions/workspace";

interface ResumeUploaderProps {
  /** Raw text of the current workspace resume, if any */
  currentResumeText: string | null;
  currentFileName?: string | null;
  /** Called after a successful upload/paste/delete so parent can refresh */
  onResumeChange: (newText: string | null) => void;
}

export function ResumeUploader({ currentResumeText, currentFileName, onResumeChange }: ResumeUploaderProps) {
  const [mode, setMode] = React.useState<"paste" | "upload">("upload");
  const [pasteText, setPasteText] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const res = await uploadWorkspaceResumeAction(formData);
      if (res.success && res.data) {
        toast.success("Resume saved to your workspace");
        onResumeChange(res.data.rawText);
      } else {
        toast.error(res.error ?? "Upload failed. Please try again.");
      }
    });
  };

  const handlePasteSave = () => {
    if (pasteText.trim().length < 50) {
      toast.error("Please paste at least a few lines of your resume.");
      return;
    }
    startTransition(async () => {
      const res = await saveTextWorkspaceResumeAction(pasteText);
      if (res.success && res.data) {
        toast.success("Resume saved to your workspace");
        onResumeChange(res.data.rawText);
        setPasteText("");
      } else {
        toast.error(res.error ?? "Save failed. Please try again.");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteWorkspaceResumeAction();
      toast.success("Resume removed from workspace");
      onResumeChange(null);
    });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // If resume already exists, show compact "has resume" state
  if (currentResumeText) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="font-medium text-sm">Resume loaded</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentFileName ? (
                  <span className="font-mono">{currentFileName}</span>
                ) : (
                  "Pasted text"
                )}
                {" · "}~{Math.round(currentResumeText.split(/\s+/).length / 50)} pages
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically applied to all AI tools in your workspace.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 text-muted-foreground hover:text-destructive shrink-0"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  // No resume yet — show upload UI
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Upload your resume once — used in all tools</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-md border border-border bg-background p-0.5 w-fit mb-4">
        {(["upload", "paste"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 px-4 cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
          />
          {isPending ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Parsing your resume…</p>
              <p className="text-xs text-muted-foreground mt-1">This takes a few seconds</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Drop your resume here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or Word · max 10 MB</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder="Paste your resume text here…"
            rows={8}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="resize-none font-mono text-xs"
          />
          <Button
            onClick={handlePasteSave}
            disabled={isPending || pasteText.trim().length < 50}
            variant="gradient"
            className="w-full"
          >
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              "Save resume to workspace"
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {pasteText.trim().split(/\s+/).filter(Boolean).length} words
          </p>
        </div>
      )}
    </div>
  );
}

// Compact badge shown inside tool forms when resume is auto-loaded
export function WorkspaceResumeBadge({ hasResume }: { hasResume: boolean }) {
  if (!hasResume) return null;
  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      <CheckCircle2 className="h-2.5 w-2.5 text-success" />
      Auto-loaded from workspace
    </Badge>
  );
}
