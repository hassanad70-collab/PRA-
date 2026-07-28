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
import { BulkActionsToolbar, type BulkToolbarLabels, type BulkToolbarRecruiter } from "@/components/recruiter/bulk-actions-toolbar";
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
  archived: "outline",
};

export interface ApplicantsPanelLabels {
  list: string;
  board: string;
  viewToggleAria: string;
  noApplications: string;
  compare: string;
  matchLabel: string;
  atsLabel: string;
  screeningLabel: string;
  statusLabels: Record<ApplicationStatus, string>;
  candidateFallback: string;
  statusUpdated: string;
  statusUpdateFailed: string;
  bulk: BulkToolbarLabels;
}

/**
 * List view is the original AI-ranked flat view (kept as-is -- the #1/#2/#3
 * ranking it conveys is lost in a stage-grouped board). Board view is a
 * purely additive visualization added in Unit H: same data, same actions
 * (StatusSelect), no new query. Selection is unified for both Candidate
 * Comparison (Phase 3, gated to 2-4 candidates) and Bulk Actions (Phase 7,
 * any count) -- List-view-only, since Board view's per-column layout has no
 * natural place for a selection checkbox.
 */
export function ApplicantsPanel({
  applications,
  jobId,
  recruiters,
  labels,
}: {
  applications: ApplicationRow[];
  jobId: string;
  recruiters: BulkToolbarRecruiter[];
  labels: ApplicantsPanelLabels;
}) {
  const [view, setView] = React.useState<"list" | "board">("list");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCompare = () => {
    router.push(`/recruiter/jobs/${jobId}/compare?ids=${Array.from(selected).slice(0, 4).join(",")}`);
  };

  const selectedApplications = applications.filter((a) => selected.has(a.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected.size > 0 && selected.size <= 4 && (
            <Button type="button" size="sm" variant="gradient" disabled={selected.size < 2} onClick={handleCompare}>
              <Scale className="h-4 w-4" /> {labels.compare} ({selected.size})
            </Button>
          )}
        </div>
        <div className="flex gap-1" role="group" aria-label={labels.viewToggleAria}>
          <Button
            type="button"
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" /> {labels.list}
          </Button>
          <Button
            type="button"
            variant={view === "board" ? "default" : "outline"}
            size="sm"
            aria-pressed={view === "board"}
            onClick={() => setView("board")}
          >
            <LayoutGrid className="h-4 w-4" /> {labels.board}
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <BulkActionsToolbar
          selectedApplicationIds={Array.from(selected)}
          selectedCandidateIds={Array.from(new Set(selectedApplications.map((a) => a.candidate_id)))}
          recruiters={recruiters}
          exportRows={selectedApplications.map((a) => ({
            name: a.candidate?.profile?.full_name ?? "",
            position: a.candidate?.current_position ?? "",
            status: a.status,
            atsScore: a.ats_score?.[0]?.overall_score ?? "",
            aiScore: a.screening_result?.overall_score ?? "",
          }))}
          labels={labels.bulk}
        />
      )}

      {view === "board" ? (
        <ApplicationKanbanBoard
          applications={applications}
          labels={{
            statusLabels: labels.statusLabels,
            noCandidates: labels.noApplications,
            matchLabel: labels.matchLabel,
            atsLabel: labels.atsLabel,
            screenLabel: labels.screeningLabel,
            statusUpdated: labels.statusUpdated,
            statusUpdateFailed: labels.statusUpdateFailed,
          }}
        />
      ) : (
        <div className="space-y-3">
          {applications.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">{labels.noApplications}</CardContent>
            </Card>
          )}
          {applications.map((app, index) => {
            const screening = app.screening_result;
            const match = app.job_match?.[0];
            const ats = app.ats_score?.[0];
            const candidateProfile = app.candidate?.profile;
            const isSelected = selected.has(app.id);

            return (
              <Card key={app.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 pt-6">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelected(app.id)}
                    aria-label={`${candidateProfile?.full_name ?? labels.candidateFallback}`}
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
                          <p className="text-xs text-muted-foreground">{labels.matchLabel}</p>
                          <p className="font-semibold">{Math.round(match.match_score)}%</p>
                        </div>
                      )}
                      {ats && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">{labels.atsLabel}</p>
                          <p className="font-semibold">{ats.overall_score}</p>
                        </div>
                      )}
                    </div>

                    {screening ? (
                      <ScoreRing score={screening.overall_score ?? 0} size={56} strokeWidth={5} />
                    ) : (
                      <div className="w-14 text-center text-xs text-muted-foreground">{labels.screeningLabel}</div>
                    )}

                    <Badge variant={STATUS_VARIANT[app.status as ApplicationStatus]} className="shrink-0">
                      {labels.statusLabels[app.status as ApplicationStatus]}
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
