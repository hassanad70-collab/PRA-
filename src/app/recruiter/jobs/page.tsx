import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobActionsMenu } from "@/components/recruiter/job-actions-menu";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext, getRecruiterJobs } from "@/lib/queries/jobs";
import type { JobStatus } from "@/types/database";

const STATUS_VARIANT: Record<JobStatus, "default" | "secondary" | "success" | "warning" | "outline"> = {
  draft: "outline",
  published: "success",
  closed: "secondary",
  archived: "outline",
};

export default async function RecruiterJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  const jobs = await getRecruiterJobs(recruiter.company_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage every job posting for {recruiter.company?.name}.</p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/recruiter/jobs/new">
            <Plus className="h-4 w-4" /> New job
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {jobs.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No jobs yet. Create your first job posting to start hiring.
            </CardContent>
          </Card>
        )}
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <Link href={`/recruiter/jobs/${job.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{job.title}</h3>
                  <Badge variant={STATUS_VARIANT[job.status as JobStatus]} className="capitalize">
                    {job.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job.department ?? "General"} · {job.location ?? "Remote"}
                </p>
              </Link>
              <Link
                href={`/recruiter/jobs/${job.id}/candidates`}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Users className="h-3.5 w-3.5" />
                {job.applications_count}
              </Link>
              <JobActionsMenu jobId={job.id} status={job.status as JobStatus} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
