"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadResume } from "@/actions/resume";
import { cn } from "@/lib/utils";

// Stage schedule: [delay_ms, progress_percent, label]
// Timings are tuned to the typical upload pipeline duration:
// ~2s storage upload, ~3s text extraction, ~10s AI parse + ATS score.
const STAGES: Array<[number, number, string]> = [
  [0, 8, "Uploading your resume..."],
  [2500, 38, "Uploading your resume..."],
  [4500, 52, "Extracting resume content..."],
  [7000, 66, "Running AI analysis..."],
  [12000, 78, "Scoring for ATS compatibility..."],
  [18000, 88, "Finalising results..."],
];

export function ResumeUpload() {
  const t = useTranslations("Candidate.ResumeUpload");
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [stageLabel, setStageLabel] = React.useState("");
  const [uploadedFileName, setUploadedFileName] = React.useState<string | null>(null);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearStageTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  React.useEffect(() => {
    if (!isPending) {
      clearStageTimers();
      // Keep progress at 100% briefly before resetting so the bar completes
      // visually before disappearing on router.refresh().
      return;
    }

    STAGES.forEach(([delay, pct, label]) => {
      const id = setTimeout(() => {
        setProgress(pct);
        setStageLabel(label);
      }, delay);
      timersRef.current.push(id);
    });

    return clearStageTimers;
  }, [isPending]);

  const handleFile = (file: File) => {
    setUploadedFileName(file.name);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadResume(formData);
      clearStageTimers();

      if (result.success) {
        setProgress(100);
        setStageLabel("Resume processed successfully!");
        toast.success(t("success"));
      } else {
        setProgress(0);
        setStageLabel("");
        toast.error(result.error ?? t("failed"));
      }

      // Small delay so the 100% state is visible before the page reloads.
      setTimeout(() => {
        setProgress(0);
        setStageLabel("");
        setUploadedFileName(null);
        router.refresh();
      }, 600);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isPending) setDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (isPending) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10",
        dragging && !isPending ? "border-primary bg-primary/5" : "border-border bg-muted/20",
        isPending && "pointer-events-none select-none"
      )}
    >
      {isPending ? (
        // ── Upload in progress ──────────────────────────────────────────────
        <div className="flex w-full max-w-sm flex-col items-center gap-5">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {uploadedFileName && (
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium">{uploadedFileName}</p>
                <p className="text-xs text-muted-foreground">Processing…</p>
              </div>
            )}
          </div>

          <div className="w-full space-y-2">
            <Progress value={progress} className="h-1.5 w-full" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stageLabel}</p>
              <p className="text-xs tabular-nums text-muted-foreground">{progress}%</p>
            </div>
          </div>
        </div>
      ) : (
        // ── Idle drop zone ──────────────────────────────────────────────────
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted">
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
          </div>

          <div className="mt-4 space-y-1">
            <p className="font-medium">{t("dragDrop")}</p>
            <p className="text-sm text-muted-foreground">{t("hint")}</p>
          </div>

          <Button
            variant="outline"
            className="mt-5"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </Button>

          <p className="mt-3 text-xs text-muted-foreground">
            PDF, DOC, DOCX · Max 10 MB · Any filename accepted
          </p>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
