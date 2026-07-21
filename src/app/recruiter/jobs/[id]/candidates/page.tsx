import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/shared/score-ring";
import { getApplicationsForJob } from "@/lib/queries/applications";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import { initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

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

export default async function JobCandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  const job = await getJobById(id);
  if (!job || job.company_id !== recruiter.company_id) notFound();

  const applications = await getApplicationsForJob(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{job.title} — Candidates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked automatically by AI screening score. {applications.length} total applicants.
        </p>
      </div>

      <div className="space-y-3">
        {applications.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No applications yet for this job.
            </CardContent>
          </Card>
        )}
        {applications.map((app, index) => {
          const screening = app.screening_result?.[0];
          const match = app.job_match?.[0];
          const ats = app.ats_score?.[0];
          const candidateProfile = app.candidate?.profile;

          return (
            <Link key={app.id} href={`/recruiter/applications/${app.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 pt-6">
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
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
