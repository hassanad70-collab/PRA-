"use client";

import * as React from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { finalizeResumeDraft } from "@/actions/resume-builder";

type Format = "pdf" | "docx" | "both";

export function FinalizeDraftDialog({ draftId }: { draftId: string }) {
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState<Format>("pdf");
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<{ pdfUrl?: string; docxUrl?: string } | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await finalizeResumeDraft(draftId, format);
      if (res.success) {
        setResult({ pdfUrl: res.pdfUrl, docxUrl: res.docxUrl });
        toast.success("Resume generated");
      } else {
        toast.error(res.error ?? "Failed to generate your resume.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="gradient">
          <FileText className="h-4 w-4" /> Generate resume
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate your resume</DialogTitle>
          <DialogDescription>Choose a format. You can regenerate anytime as you keep editing.</DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            {(["pdf", "docx", "both"] as Format[]).map((f) => (
              <label key={f} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <input type="radio" name="format" checked={format === f} onChange={() => setFormat(f)} />
                <Label className="cursor-pointer font-normal">
                  {f === "pdf" ? "PDF only" : f === "docx" ? "Word (.docx) only" : "PDF + Word (.docx)"}
                </Label>
              </label>
            ))}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            {result.pdfUrl && (
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Download PDF
              </a>
            )}
            {result.docxUrl && (
              <a
                href={result.docxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" /> Download Word document
              </a>
            )}
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="gradient" disabled={isPending} onClick={handleGenerate}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
