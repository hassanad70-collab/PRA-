import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Briefcase, CheckCircle2, MapPin, Sparkles, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ApplyDialog } from "@/components/candidate/apply-dialog";
import { createClient } from "@/lib/supabase/server";
import { getCandidateFullProfile, getCurrentUser } from "@/lib/queries/candidate";
import { getJobById } from "@/lib/queries/jobs";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const job = await getJobById(id);
  if (!job) notFound();

  const supabase = await createClient();
  const [{ resumes }, { data: existingApplication }, { data: match }] = await Promise.all([
    getCandidateFullProfile(user.id),
    supabase.from("applications").select("id, status").eq("job_id", id).eq("candidate_id", user.id).maybeSingle(),
    supabase.from("job_matches").select("*").eq("job_id", id).eq("candidate_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              <p className="mt-1 text-muted-foreground">{job.company?.name}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">
                  <MapPin className="mr-1 h-3 w-3" /> {job.location ?? "Remote"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {job.employment_type.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  <Briefcase className="mr-1 h-3 w-3" /> {job.experience_level}
                </Badge>
                {job.salary_min && (
                  <Badge variant="outline">
                    {job.salary_currency} {job.salary_min.toLocaleString()}
                    {job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : "+"}
                  </Badge>
                )}
              </div>
            </div>
            {existingApplication ? (
              <Badge variant="secondary" className="h-fit px-4 py-2 text-sm capitalize">
                Applied — {existingApplication.status.replace("_", " ")}
              </Badge>
            ) : (
              <ApplyDialog jobId={job.id} resumes={resumes} />
            )}
          </div>
        </CardContent>
      </Card>

      {match && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">
                {Math.round(match.match_score)}% AI Match — {match.ai_summary}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {!!match.strengths?.length && (
                <div>
                  <p className="mb-2 text-sm font-medium">Your strengths</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {match.strengths.map((s: string) => (
                      <li key={s} className="flex gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!!match.missing_skills?.length && (
                <div>
                  <p className="mb-2 text-sm font-medium">Skills to highlight or learn</p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {match.missing_skills.map((s: string) => (
                      <li key={s} className="flex gap-2">
                        <XCircle className="h-4 w-4 shrink-0 text-warning" /> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="prose prose-sm max-w-none space-y-6 pt-6 dark:prose-invert">
          <div>
            <h3 className="mb-2 text-base font-semibold">About this role</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
          </div>

          {!!job.responsibilities?.length && (
            <div>
              <h3 className="mb-2 text-base font-semibold">Responsibilities</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {job.responsibilities.map((r: string) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-primary">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!job.requirements?.length && (
            <div>
              <h3 className="mb-2 text-base font-semibold">Requirements</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {job.requirements.map((r: string) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-primary">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-base font-semibold">Required skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((s: string) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {!!job.benefits?.length && (
            <div>
              <h3 className="mb-2 text-base font-semibold">Benefits</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {job.benefits.map((b: string) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-primary">•</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/candidate/jobs" className="text-sm text-muted-foreground hover:underline">
          ← Back to all jobs
        </Link>
      </div>
    </div>
  );
}
