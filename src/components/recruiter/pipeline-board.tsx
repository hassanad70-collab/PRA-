"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatusSelect } from "@/components/recruiter/status-select";
import { initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

export interface PipelineApplication {
  id: string;
  status: ApplicationStatus;
  candidate: {
    profile: { full_name: string; email: string } | null;
    current_position: string | null;
  } | null;
  job: { id: string; title: string } | null;
}

const PIPELINE_COLUMNS: ApplicationStatus[] = [
  "submitted",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
];

interface PipelineBoardLabels {
  statusLabels: Record<ApplicationStatus, string>;
  noCandidates: string;
  updated: string;
  updateFailed: string;
}

export function PipelineBoard({
  applications,
  labels,
}: {
  applications: PipelineApplication[];
  labels: PipelineBoardLabels;
}) {
  const hasWithdrawn = applications.some((a) => a.status === "withdrawn");
  const hasArchived = applications.some((a) => a.status === "archived");
  const columns: ApplicationStatus[] = [
    ...PIPELINE_COLUMNS,
    ...(hasArchived ? (["archived"] as ApplicationStatus[]) : []),
    ...(hasWithdrawn ? (["withdrawn"] as ApplicationStatus[]) : []),
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <div key={status} className="w-72 shrink-0">
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
              {items.map((app) => (
                <Card key={app.id}>
                  <CardContent className="space-y-3 p-4">
                    <Link href={`/recruiter/applications/${app.id}`} className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(app.candidate?.profile?.full_name ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{app.candidate?.profile?.full_name ?? "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{app.job?.title ?? "—"}</p>
                      </div>
                    </Link>
                    {status !== "withdrawn" && (
                      <StatusSelect
                        applicationId={app.id}
                        status={status}
                        className="w-full"
                        labels={{
                          statusLabels: labels.statusLabels,
                          updated: labels.updated,
                          updateFailed: labels.updateFailed,
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
