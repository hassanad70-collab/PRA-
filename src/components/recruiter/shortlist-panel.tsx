"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Trophy, XCircle } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import { updateApplicationStatus } from "@/actions/applications";
import { suggestNextAction, type SuggestedAction } from "@/lib/recruiter/shortlist";
import { initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

export interface ShortlistItem {
  applicationId: string;
  status: ApplicationStatus;
  fullName: string;
  currentPosition: string | null;
  overallScore: number | null;
  interviewRecommendation: string | null;
  reasoning: string | null;
  pros: string[];
  cons: string[];
  missingSkills: string[];
}

export interface ShortlistLabels {
  reasoning: string;
  pros: string;
  cons: string;
  missingSkills: string;
  suggestedNextAction: string;
  actions: Record<SuggestedAction, string>;
  approve: string;
  reject: string;
  moveToInterview: string;
  succeeded: string;
  failed: string;
}

export function ShortlistPanel({ items, labels }: { items: ShortlistItem[]; labels: ShortlistLabels }) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const handleAction = (applicationId: string, status: ApplicationStatus) => {
    setPendingId(applicationId);
    updateApplicationStatus(applicationId, status)
      .then((result) => {
        if (result.success) {
          toast.success(labels.succeeded);
          router.refresh();
        } else {
          toast.error(result.error ?? labels.failed);
        }
      })
      .catch(() => toast.error(labels.failed))
      .finally(() => setPendingId(null));
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const action = suggestNextAction(item.status, item.interviewRecommendation as never);
        const isPending = pendingId === item.applicationId;

        return (
          <Card key={item.applicationId}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                    {index === 0 ? <Trophy className="h-4 w-4 text-warning" /> : `#${index + 1}`}
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(item.fullName || "?")}
                  </div>
                  <div>
                    <Link href={`/recruiter/applications/${item.applicationId}`} className="font-medium hover:underline">
                      {item.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{item.currentPosition ?? "—"}</p>
                  </div>
                </div>
                <ScoreRing score={item.overallScore ?? 0} size={48} strokeWidth={4} />
              </div>

              {item.reasoning && <p className="text-sm text-muted-foreground">{item.reasoning}</p>}

              <div className="grid gap-3 sm:grid-cols-3">
                {!!item.pros.length && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-success" /> {labels.pros}
                    </p>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {item.pros.slice(0, 3).map((p) => (
                        <li key={p}>• {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!item.cons.length && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
                      <XCircle className="h-3 w-3 text-destructive" /> {labels.cons}
                    </p>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {item.cons.slice(0, 3).map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!!item.missingSkills.length && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{labels.missingSkills}</p>
                    <div className="flex flex-wrap gap-1">
                      {item.missingSkills.slice(0, 5).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  {labels.suggestedNextAction}: <span className="font-medium text-foreground">{labels.actions[action]}</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleAction(item.applicationId, "shortlisted")}
                  >
                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {labels.approve}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleAction(item.applicationId, "interview")}
                  >
                    {labels.moveToInterview}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => handleAction(item.applicationId, "rejected")}
                  >
                    {labels.reject}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
