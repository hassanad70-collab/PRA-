import { Link } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusSelect } from "@/components/recruiter/status-select";
import type { getApplicationsForJob } from "@/lib/queries/applications";
import { initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

type ApplicationRow = Awaited<ReturnType<typeof getApplicationsForJob>>[number];

// "withdrawn" only appears as a column when at least one application is in
// that state -- it's a candidate-initiated terminal status a recruiter can't
// move an application back out of via StatusSelect, so its card omits the
// move-to control rather than showing a select with no valid target.
// "archived" (Phase 7 bulk action) is recruiter-initiated, so it keeps its
// StatusSelect -- a recruiter can un-archive the same way they archived it.
const PIPELINE_COLUMNS: ApplicationStatus[] = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

export interface KanbanLabels {
  statusLabels: Record<ApplicationStatus, string>;
  noCandidates: string;
  matchLabel: string;
  atsLabel: string;
  screenLabel: string;
  statusUpdated: string;
  statusUpdateFailed: string;
}

export function ApplicationKanbanBoard({ applications, labels }: { applications: ApplicationRow[]; labels: KanbanLabels }) {
  const hasWithdrawn = applications.some((a) => a.status === "withdrawn");
  const hasArchived = applications.some((a) => a.status === "archived");
  const columns = [
    ...PIPELINE_COLUMNS,
    ...(hasArchived ? (["archived"] as ApplicationStatus[]) : []),
    ...(hasWithdrawn ? (["withdrawn"] as ApplicationStatus[]) : []),
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" data-testid="application-kanban-board">
      {columns.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <div key={status} className="w-72 shrink-0" data-testid={`kanban-column-${status}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{labels.statusLabels[status]}</h3>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div className="space-y-3">
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  {labels.noCandidates}
                </p>
              )}
              {items.map((app) => {
                const screening = app.screening_result;
                const match = app.job_match?.[0];
                const ats = app.ats_score?.[0];
                const candidateProfile = app.candidate?.profile;

                return (
                  <Card key={app.id}>
                    <CardContent className="space-y-3 p-4">
                      <Link href={`/recruiter/applications/${app.id}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(candidateProfile?.full_name ?? "?")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{candidateProfile?.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {app.candidate?.current_position ?? "—"}
                          </p>
                        </div>
                      </Link>

                      {(match || ats || screening) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {match && (
                            <span>
                              {labels.matchLabel} {Math.round(match.match_score)}%
                            </span>
                          )}
                          {ats && (
                            <span>
                              {labels.atsLabel} {ats.overall_score}
                            </span>
                          )}
                          {screening?.overall_score !== undefined && screening.overall_score !== null && (
                            <span>
                              {labels.screenLabel} {screening.overall_score}
                            </span>
                          )}
                        </div>
                      )}

                      {status !== "withdrawn" && (
                        <StatusSelect
                          applicationId={app.id}
                          status={app.status as ApplicationStatus}
                          className="w-full"
                          labels={{
                            statusLabels: labels.statusLabels,
                            updated: labels.statusUpdated,
                            updateFailed: labels.statusUpdateFailed,
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
