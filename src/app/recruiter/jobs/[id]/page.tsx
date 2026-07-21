import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobActionsMenu } from "@/components/recruiter/job-actions-menu";
import { JobForm } from "@/components/recruiter/job-form";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import type { JobStatus } from "@/types/database";

export default async function RecruiterJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  const job = await getJobById(id);
  if (!job || job.company_id !== recruiter.company_id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <Badge variant="outline" className="capitalize">
              {job.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {job.applications_count} applications · {job.views_count} views
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/recruiter/jobs/${job.id}/candidates`}>
              <Users className="h-4 w-4" /> View candidates
            </Link>
          </Button>
          <JobActionsMenu jobId={job.id} status={job.status as JobStatus} />
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">Edit job</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Card>
            <CardContent className="pt-6">
              <JobForm job={job} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
