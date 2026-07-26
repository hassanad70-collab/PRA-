"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { applyImportedFields, importResumeIntoDraft } from "@/actions/resume-builder";
import { SECTION_LABELS } from "@/lib/resume-builder/section-schemas";
import type { ImportFieldDiff } from "@/types/database";

function describeValue(v: unknown): string {
  if (v == null || v === "") return "(empty)";
  if (Array.isArray(v)) return v.length ? `${v.length} item(s)` : "(empty)";
  return String(v);
}

export function ImportResumeDialog({ draftId }: { draftId: string }) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [diffs, setDiffs] = React.useState<ImportFieldDiff[] | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setDiffs(null);
    setSelected(new Set());
  };

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const res = await importResumeIntoDraft(draftId, formData);
      if (!res.success || !res.diffs) {
        toast.error(res.error ?? "Failed to read that resume.");
        return;
      }
      if (res.diffs.length === 0) {
        toast.info("Nothing new found in that resume.");
        setOpen(false);
        return;
      }
      setDiffs(res.diffs);
      // Non-conflicting fields (nothing to overwrite) default checked;
      // anything that would replace existing content defaults unchecked --
      // imported data is a suggestion, never auto-applied, per the
      // approved merge rules.
      setSelected(new Set(res.diffs.map((d, i) => (d.hasConflict ? -1 : i)).filter((i) => i >= 0)));
    });
  };

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApply = () => {
    if (!diffs) return;
    const accepted = diffs.filter((_, i) => selected.has(i));
    startTransition(async () => {
      const res = await applyImportedFields(draftId, accepted);
      if (res.success) {
        toast.success("Imported fields applied.");
        setOpen(false);
        reset();
      } else {
        toast.error(res.error ?? "Failed to apply imported fields.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Import resume
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from an uploaded resume</DialogTitle>
          <DialogDescription>
            Review each field before it&apos;s added -- nothing here overwrites your profile automatically.
          </DialogDescription>
        </DialogHeader>

        {!diffs && (
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-10 text-center">
            {isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">{isPending ? "Reading your resume…" : "PDF or Word, up to 10MB"}</p>
            <Button variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
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
        )}

        {diffs && (
          <div className="space-y-2">
            {diffs.map((diff, i) => (
              <label
                key={i}
                className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/50"
              >
                <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {SECTION_LABELS[diff.section_type]}
                    {diff.field !== "__whole_section__" ? ` — ${diff.field.replace(/_/g, " ")}` : ""}
                    {diff.hasConflict && <span className="ml-2 text-xs text-warning">replaces existing content</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current: {describeValue(diff.currentValue)} → Imported: {describeValue(diff.importedValue)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {diffs && (
          <DialogFooter>
            <Button variant="gradient" disabled={isPending} onClick={handleApply}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply selected ({selected.size})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
