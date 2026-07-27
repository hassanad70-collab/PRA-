"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Candidate.FinalizeDraft");
  const [open, setOpen] = React.useState(false);
  const [format, setFormat] = React.useState<Format>("pdf");
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<{ pdfUrl?: string; docxUrl?: string } | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      const res = await finalizeResumeDraft(draftId, format);
      if (res.success) {
        setResult({ pdfUrl: res.pdfUrl, docxUrl: res.docxUrl });
        toast.success(t("generatedToast"));
      } else {
        toast.error(res.error ?? t("failed"));
      }
    });
  };

  const formatLabels: Record<Format, string> = {
    pdf: t("pdfOnly"),
    docx: t("docxOnly"),
    both: t("both"),
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
          <FileText className="h-4 w-4" /> {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-3">
            {(["pdf", "docx", "both"] as Format[]).map((f) => (
              <label key={f} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
                <input type="radio" name="format" checked={format === f} onChange={() => setFormat(f)} />
                <Label className="cursor-pointer font-normal">{formatLabels[f]}</Label>
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
                <Download className="h-4 w-4" /> {t("downloadPdf")}
              </a>
            )}
            {result.docxUrl && (
              <a
                href={result.docxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-accent"
              >
                <Download className="h-4 w-4" /> {t("downloadWord")}
              </a>
            )}
          </div>
        )}

        {!result && (
          <DialogFooter>
            <Button variant="gradient" disabled={isPending} onClick={handleGenerate}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("generate")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
