"use client";

import * as React from "react";

import { Link, useRouter } from "@/i18n/navigation";
import { LayoutGrid, List, Scale, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreRing } from "@/components/shared/score-ring";
import { ApplicationKanbanBoard } from "@/components/recruiter/application-kanban-board";
import type { getApplicationsForJob } from "@/lib/queries/applications";
import { initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

type ApplicationRow = Awaited<ReturnType<typeof getApplicationsForJob>>[number];

const STATUS_VARIANT: Record<ApplicationStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  submitted: "outline",
  screening: "secondary",
  shortlisted: "warning",
  interview: "warning",
  offer: "success",
  hired: "success",
  rejected: "destructive",
  withdrawn: "outline",
};

const MAX_COMPARE = 4;

/**
 * List view is the original AI-ranked flat view (kept as-is -- the #1/#2/#3
 * ranking it conveys is lost in a stage-grouped board). Board view is a
 * purely additive visualization added in Unit H: same data, same actions
 * (StatusSelect), no new query. Candidate Comparison selection (Recruiter
 * Intelligence v2.0, Phase 3) is List-view-only -- Board view's per-column
 * layout doesn't have a natural place for a selection checkbox, and bulk
 * selection across the whole pipeline is Phase 7's dedicated toolbar, a
 * separate concern from "pick 2-4 finalists to compare side by side".
 */
export function ApplicantsPanel({ applications, jobId }: { applications: ApplicationRow[]; jobId: string }) {
  const [view, setView] = React.useState<"list" | "board">("list");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return next;
    });
  };

  const handleCompare = () => {
    router.push(`/recruiter/jobs/${jobId}/compare?ids=${Array.from(selected).join(",")}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button type="button" size="sm" variant="gradient" disabled={selected.size < 2} onClick={handleCompare}>
                <Scale className="h-4 w-4" /> Compare ({selected.size})
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-1" role="group" aria-label="View">
          <Button
            type="button"
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" /> List
          </Button>
          <Button
            type="button"
            variant={view === "board" ? "default" : "outline"}
            size="sm"
            aria-pressed={view === "board"}
            onClick={() => setView("board")}
          >
            <LayoutGrid className="h-4 w-4" /> Board
          </Button>
        </div>
      </div>

      {view === "board" ? (
        <ApplicationKanbanBoard applications={applications} />
      ) : (
        <div className="space-y-3">
          {applications.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No applications yet for this job.
              </CardContent>
            </Card>
          )}
          {applications.map((app, index) => {
            const screening = app.screening_result;
            const match = app.job_match?.[0];
            const ats = app.ats_score?.[0];
            const candidateProfile = app.candidate?.profile;
            const isSelected = selected.has(app.id);
            const disableCheckbox = !isSelected && selected.size >= MAX_COMPARE;

            return (
              <Card key={app.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 pt-6">
                  <Checkbox
                    checked={isSelected}
                    disabled={disableCheckbox}
                    onCheckedChange={() => toggleSelected(app.id)}
                    aria-label={`Select ${candidateProfile?.full_name ?? "candidate"} for comparison`}
                  />
                  <Link href={`/recruiter/applications/${app.id}`} className="flex flex-1 items-center gap-4 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {index === 0 ? <Trophy className="h-4 w-4 text-warning" /> : `#${index + 1}`}
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {initials(candidateProfile?.full_name ?? "?")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{candidateProfile?.full_name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {app.candidate?.current_position ?? "—"} · {app.candidate?.years_of_experience ?? 0} yrs exp
                      </p>
                    </div>

                    <div className="hidden gap-6 sm:flex">
                      {match && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Match</p>
                          <p className="font-semibold">{Math.round(match.match_score)}%</p>
                        </div>
                      )}
                      {ats && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">ATS</p>
                          <p className="font-semibold">{ats.overall_score}</p>
                        </div>
                      )}
                    </div>

                    {screening ? (
                      <ScoreRing score={screening.overall_score ?? 0} size={56} strokeWidth={5} />
                    ) : (
                      <div className="w-14 text-center text-xs text-muted-foreground">Screening…</div>
                    )}

                    <Badge variant={STATUS_VARIANT[app.status as ApplicationStatus]} className="shrink-0 capitalize">
                      {app.status.replace("_", " ")}
                    </Badge>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
