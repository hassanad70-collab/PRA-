import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicantsPanel } from "@/components/recruiter/applicants-panel";
import { ShortlistPanel, type ShortlistItem } from "@/components/recruiter/shortlist-panel";
import { getApplicationsForJob } from "@/lib/queries/applications";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import { getRecommendedCandidatesForJob } from "@/lib/queries/matching";
import { getCompanyMembers } from "@/lib/queries/team";
import { initials } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/database";

const SHORTLIST_SIZE = 5;

export default async function JobCandidatesPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const job = await getJobById(id);
  if (!job || job.company_id !== recruiter.company_id) notFound();

  const [applications, recommended, companyMembers, t, tShared, tBulk] = await Promise.all([
    getApplicationsForJob(id),
    getRecommendedCandidatesForJob(id),
    getCompanyMembers(recruiter.company_id),
    getTranslations("Recruiter.Candidates"),
    getTranslations("Recruiter.Shared"),
    getTranslations("Recruiter.Bulk"),
  ]);

  const statusLabels: Record<ApplicationStatus, string> = {
    submitted: tShared("applicationStatus.submitted"),
    screening: tShared("applicationStatus.screening"),
    shortlisted: tShared("applicationStatus.shortlisted"),
    interview: tShared("applicationStatus.interview"),
    offer: tShared("applicationStatus.offer"),
    hired: tShared("applicationStatus.hired"),
    rejected: tShared("applicationStatus.rejected"),
    withdrawn: tShared("applicationStatus.withdrawn"),
    archived: tShared("applicationStatus.archived"),
  };

  const recruitersForAssign = companyMembers.map((m) => ({ id: m.id, name: m.profile?.full_name ?? m.profile?.email ?? "" }));

  const shortlistItems: ShortlistItem[] = applications.slice(0, SHORTLIST_SIZE).map((app) => {
    const match = app.job_match?.[0];
    const screening = app.screening_result;
    return {
      applicationId: app.id,
      status: app.status as ApplicationStatus,
      fullName: app.candidate?.profile?.full_name ?? "",
      currentPosition: app.candidate?.current_position ?? null,
      overallScore: screening?.overall_score ?? null,
      interviewRecommendation: screening?.interview_recommendation ?? null,
      reasoning: match?.ai_summary ?? screening?.ai_summary ?? null,
      pros: match?.strengths ?? [],
      cons: match?.weaknesses ?? [],
      missingSkills: match?.missing_skills ?? [],
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle", { job: job.title })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { count: applications.length })}</p>
      </div>

      <Tabs defaultValue="shortlist">
        <TabsList>
          <TabsTrigger value="shortlist">{t("shortlistTab", { count: shortlistItems.length })}</TabsTrigger>
          <TabsTrigger value="applicants">{t("applicantsTab", { count: applications.length })}</TabsTrigger>
          <TabsTrigger value="recommended">
            <Sparkles className="me-1.5 h-3.5 w-3.5" /> {t("recommendedTab", { count: recommended.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shortlist">
          {shortlistItems.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("shortlistEmpty")}</CardContent>
            </Card>
          ) : (
            <ShortlistPanel
              items={shortlistItems}
              labels={{
                reasoning: t("reasoning"),
                pros: t("pros"),
                cons: t("cons"),
                missingSkills: t("missingSkills"),
                suggestedNextAction: t("suggestedNextAction"),
                actions: {
                  schedule_interview: t("actionScheduleInterview"),
                  await_interview_feedback: t("actionAwaitInterviewFeedback"),
                  awaiting_response: t("actionAwaitingResponse"),
                  review_or_reject: t("actionReviewOrReject"),
                  review_profile: t("actionReviewProfile"),
                  no_action_needed: t("actionNoActionNeeded"),
                },
                approve: t("approve"),
                reject: t("reject"),
                moveToInterview: t("moveToInterview"),
                succeeded: t("actionSucceeded"),
                failed: t("actionFailed"),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="applicants">
          <ApplicantsPanel
            applications={applications}
            jobId={job.id}
            recruiters={recruitersForAssign}
            labels={{
              list: t("listView"),
              board: t("boardView"),
              noApplications: t("noApplicationsYet"),
              compare: t("compareLabel"),
              matchLabel: t("matchLabel"),
              atsLabel: t("atsLabel"),
              screeningLabel: t("screeningLabel"),
              statusLabels,
              candidateFallback: tShared("candidateFallback"),
              bulk: {
                selectedCount: tBulk("selectedCount"),
                moveTo: tBulk("moveTo"),
                reject: tBulk("reject"),
                archive: tBulk("archive"),
                tag: tBulk("tag"),
                tagPlaceholder: tBulk("tagPlaceholder"),
                apply: tBulk("apply"),
                assignRecruiter: tBulk("assignRecruiter"),
                unassigned: tBulk("unassigned"),
                scheduleInterviews: tBulk("scheduleInterviews"),
                email: tBulk("email"),
                export: tBulk("export"),
                scheduleDialogTitle: tBulk("scheduleDialogTitle"),
                scheduledAt: tBulk("scheduledAt"),
                duration: tBulk("duration"),
                interviewType: tBulk("interviewType"),
                locationOrLink: tBulk("locationOrLink"),
                scheduleSubmit: tBulk("scheduleSubmit"),
                emailDialogTitle: tBulk("emailDialogTitle"),
                messageType: tBulk("messageType"),
                rejectionOption: tBulk("rejectionOption"),
                offerOption: tBulk("offerOption"),
                generateDraft: tBulk("generateDraft"),
                copyMessage: tBulk("copyMessage"),
                copyEmails: tBulk("copyEmails"),
                copiedMessage: tBulk("copiedMessage"),
                copiedEmails: tBulk("copiedEmails"),
                subject: tBulk("subject"),
                body: tBulk("body"),
                toastSuccess: tBulk("toastSuccess"),
                toastFailed: tBulk("toastFailed"),
                statusOptions: statusLabels,
              },
            }}
          />
        </TabsContent>

        <TabsContent value="recommended" className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("recommendedIntro")}</p>
          {recommended.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("noRecommended")}</CardContent>
            </Card>
          )}
          {recommended.map((rec) => (
            <Link key={rec.candidate_id} href={`/recruiter/candidates/${rec.candidate_id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-start gap-4 pt-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(rec.candidate?.profile?.full_name ?? "?")}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{rec.candidate?.profile?.full_name}</p>
                      <Badge variant={rec.match_score >= 80 ? "success" : rec.match_score >= 60 ? "warning" : "outline"}>
                        <Sparkles className="me-1 h-3 w-3" />
                        {t("percentMatch", { percent: Math.round(rec.match_score) })}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {rec.candidate?.current_position ?? "—"} · {rec.candidate?.years_of_experience ?? 0} yrs exp
                    </p>
                    {rec.ai_summary && <p className="mt-2 text-sm text-muted-foreground">{rec.ai_summary}</p>}
                    {(!!rec.strengths?.length || !!rec.missing_skills?.length) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {!!rec.strengths?.length && (
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t("topMatchingSkills")}</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {rec.strengths.map((s) => (
                                <li key={s} className="flex gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!!rec.missing_skills?.length && (
                          <div>
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{t("missingSkills")}</p>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {rec.missing_skills.map((s) => (
                                <li key={s} className="flex gap-1.5">
                                  <XCircle className="h-3.5 w-3.5 shrink-0 text-warning" /> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
