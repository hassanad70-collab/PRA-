import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewQuestionsPanel } from "@/components/recruiter/interview-questions-panel";
import { JobActionsMenu } from "@/components/recruiter/job-actions-menu";
import { JobForm } from "@/components/recruiter/job-form";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getInterviewQuestionsForJob } from "@/lib/queries/interviews";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import type { JobStatus } from "@/types/database";

export default async function RecruiterJobDetailPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const job = await getJobById(id);
  if (!job || job.company_id !== recruiter.company_id) notFound();

  const questionGroups = await getInterviewQuestionsForJob(id);
  const [t, tShared] = await Promise.all([
    getTranslations("Recruiter.JobDetail"),
    getTranslations("Recruiter.Shared"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <Badge variant="outline">{tShared(`jobStatus.${job.status as JobStatus}`)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("applicationsAndViews", { applications: job.applications_count, views: job.views_count })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/recruiter/jobs/${job.id}/candidates`}>
              <Users className="h-4 w-4" /> {t("viewCandidates")}
            </Link>
          </Button>
          <JobActionsMenu jobId={job.id} status={job.status as JobStatus} />
        </div>
      </div>

      <Tabs defaultValue="edit">
        <TabsList>
          <TabsTrigger value="edit">{t("editJobTab")}</TabsTrigger>
          <TabsTrigger value="interview-questions">{t("interviewQuestionsTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Card>
            <CardContent className="pt-6">
              <JobForm job={job} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="interview-questions">
          <InterviewQuestionsPanel jobId={job.id} groups={questionGroups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
