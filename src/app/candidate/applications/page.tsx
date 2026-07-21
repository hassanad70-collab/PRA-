import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WithdrawButton } from "@/components/candidate/withdraw-button";
import { getCandidateApplications, getCurrentUser } from "@/lib/queries/candidate";
import { formatRelativeTime } from "@/lib/utils";
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

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const applications = await getCandidateApplications(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Applications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track the status of every job you&apos;ve applied to.</p>
      </div>

      <div className="space-y-3">
        {applications.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">You haven&apos;t applied to any jobs yet.</p>
        )}
        {applications.map((app) => (
          <Card key={app.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div className="min-w-0 flex-1">
                <Link href={`/candidate/jobs/${app.job_id}`} className="font-medium hover:underline">
                  {app.job?.title}
                </Link>
                <p className="text-sm text-muted-foreground">{app.job?.company?.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Applied {formatRelativeTime(app.applied_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                {app.job_match?.[0]?.match_score !== undefined && (
                  <Badge variant="outline">{Math.round(app.job_match[0].match_score)}% match</Badge>
                )}
                <Badge variant={STATUS_VARIANT[app.status as ApplicationStatus]} className="capitalize">
                  {app.status.replace("_", " ")}
                </Badge>
                {!["hired", "rejected", "withdrawn"].includes(app.status) && (
                  <WithdrawButton applicationId={app.id} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
