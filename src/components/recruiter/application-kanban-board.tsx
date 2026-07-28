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
const PIPELINE_COLUMNS: ApplicationStatus[] = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

const COLUMN_LABELS: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  screening: "Screening",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function ApplicationKanbanBoard({ applications }: { applications: ApplicationRow[] }) {
  const hasWithdrawn = applications.some((a) => a.status === "withdrawn");
  const columns = hasWithdrawn ? [...PIPELINE_COLUMNS, "withdrawn" as ApplicationStatus] : PIPELINE_COLUMNS;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2" data-testid="application-kanban-board">
      {columns.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <div key={status} className="w-72 shrink-0" data-testid={`kanban-column-${status}`}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{COLUMN_LABELS[status]}</h3>
              <Badge variant="outline">{items.length}</Badge>
            </div>
            <div className="space-y-3">
              {items.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No candidates
                </p>
              )}
              {items.map((app) => {
                const screening = app.screening_result?.[0];
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
                          {match && <span>Match {Math.round(match.match_score)}%</span>}
                          {ats && <span>ATS {ats.overall_score}</span>}
                          {screening?.overall_score !== undefined && screening.overall_score !== null && (
                            <span>Screen {screening.overall_score}</span>
                          )}
                        </div>
                      )}

                      {status !== "withdrawn" && (
                        <StatusSelect applicationId={app.id} status={app.status as ApplicationStatus} className="w-full" />
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
