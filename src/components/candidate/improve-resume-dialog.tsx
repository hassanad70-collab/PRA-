"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { improveResumeAction, type ImproveResumeResult } from "@/actions/resume";

export function ImproveResumeDialog({ resumeId }: { resumeId: string }) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<ImproveResumeResult | null>(null);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    if (next && !result) {
      startTransition(async () => {
        const res = await improveResumeAction(resumeId);
        if (!res.success) toast.error(res.error ?? "Failed to generate suggestions.");
        setResult(res);
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Sparkles className="h-4 w-4" /> Improve My Resume
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Resume Improvements</DialogTitle>
          <DialogDescription>Suggestions generated from your parsed resume data.</DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing your resume…</p>
          </div>
        )}

        {result?.success && result.improvement && (
          <div className="space-y-6 text-sm">
            <section>
              <h4 className="mb-2 font-semibold">Improved summary</h4>
              <p className="rounded-lg bg-secondary/60 p-3 text-muted-foreground">{result.improvement.improved_summary}</p>
            </section>

            <section>
              <h4 className="mb-2 font-semibold">Improved experience bullets</h4>
              <div className="space-y-3">
                {result.improvement.improved_experience.map((exp) => (
                  <div key={`${exp.company_name}-${exp.job_title}`} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {exp.job_title} · {exp.company_name}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {exp.improved_bullets.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="text-primary">•</span> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <section>
                <h4 className="mb-2 font-semibold">Suggested skills to add</h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.improvement.suggested_missing_skills.map((s) => (
                    <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
              <section>
                <h4 className="mb-2 font-semibold">ATS keywords to add</h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.improvement.ats_keywords_to_add.map((s) => (
                    <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            </div>

            {!!result.improvement.generated_achievement_statements.length && (
              <section>
                <h4 className="mb-2 font-semibold">New achievement statement ideas</h4>
                <ul className="space-y-1">
                  {result.improvement.generated_achievement_statements.map((s) => (
                    <li key={s} className="flex gap-2 text-muted-foreground">
                      <span className="text-primary">•</span> {s}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
