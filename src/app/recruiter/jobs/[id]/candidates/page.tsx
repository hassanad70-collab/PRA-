import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Sparkles, XCircle } from "lucide-react";

import { getRedirectLocale } from "@/i18n/get-redirect-locale";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicantsPanel } from "@/components/recruiter/applicants-panel";
import { getApplicationsForJob } from "@/lib/queries/applications";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getJobById, getRecruiterContext } from "@/lib/queries/jobs";
import { getRecommendedCandidatesForJob } from "@/lib/queries/matching";
import { initials } from "@/lib/utils";

export default async function JobCandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect(`/${await getRedirectLocale()}/candidate/dashboard`);

  const job = await getJobById(id);
  if (!job || job.company_id !== recruiter.company_id) notFound();

  const [applications, recommended] = await Promise.all([
    getApplicationsForJob(id),
    getRecommendedCandidatesForJob(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{job.title} — Candidates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked automatically by AI screening score. {applications.length} total applicants.
        </p>
      </div>

      <Tabs defaultValue="applicants">
        <TabsList>
          <TabsTrigger value="applicants">Applicants ({applications.length})</TabsTrigger>
          <TabsTrigger value="recommended">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Recommended ({recommended.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applicants">
          <ApplicantsPanel applications={applications} />
        </TabsContent>

        <TabsContent value="recommended" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Candidates our AI matched to this role who haven&apos;t applied. Only candidates who opted into being
            discovered appear here.
          </p>
          {recommended.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No AI-recommended candidates yet.
              </CardContent>
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
                        <Sparkles className="mr-1 h-3 w-3" />
                        {Math.round(rec.match_score)}% match
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
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Top matching skills</p>
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
                            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Missing skills</p>
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
