import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Briefcase, FileText, Sparkles, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/shared/score-ring";
import {
  getCandidateApplications,
  getCandidateFullProfile,
  getCurrentUser,
  getLatestAtsScore,
  getRecommendedJobsForCandidate,
} from "@/lib/queries/candidate";

export default async function CandidateDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ candidate, resumes }, applications, recommendations, atsScore] = await Promise.all([
    getCandidateFullProfile(user.id),
    getCandidateApplications(user.id),
    getRecommendedJobsForCandidate(user.id, 5),
    getLatestAtsScore(user.id),
  ]);

  const activeApplications = applications.filter((a) => !["rejected", "withdrawn"].includes(a.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {user.full_name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening with your job search.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Profile completion</p>
              <p className="mt-1 text-2xl font-bold">{candidate?.profile_completion_percent ?? 0}%</p>
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Progress value={candidate?.profile_completion_percent ?? 0} />
          </div>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active applications</p>
            <p className="mt-1 text-2xl font-bold">{activeApplications.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{applications.length} total submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Resumes uploaded</p>
            <p className="mt-1 text-2xl font-bold">{resumes.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {resumes.find((r) => r.is_primary) ? "Primary resume set" : "No primary resume"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Latest ATS score</p>
              <p className="mt-1 text-2xl font-bold">{atsScore?.overall_score ?? "—"}</p>
            </div>
            {atsScore && <ScoreRing score={atsScore.overall_score} size={56} strokeWidth={5} />}
          </CardContent>
        </Card>
      </div>

      {!candidate?.primary_resume_id && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Upload your resume to get started</p>
                <p className="text-sm text-muted-foreground">
                  Our AI will auto-fill your profile and match you to open jobs instantly.
                </p>
              </div>
            </div>
            <Button variant="gradient" asChild>
              <Link href="/candidate/resume">Upload resume</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> AI recommended jobs
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/candidate/jobs">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recommendations yet — upload a resume so our AI can match you to open roles.
              </p>
            )}
            {recommendations.map((match) => (
              <Link
                key={match.id}
                href={`/candidate/jobs/${match.job_id}`}
                className="flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{match.job?.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {match.job?.company?.name} · {match.job?.location ?? "Remote"}
                  </p>
                </div>
                <Badge variant={match.match_score >= 80 ? "success" : match.match_score >= 60 ? "warning" : "outline"}>
                  {Math.round(match.match_score)}% match
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" /> Recent applications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">You haven&apos;t applied to any jobs yet.</p>
            )}
            {applications.slice(0, 5).map((app) => (
              <div key={app.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{app.job?.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{app.job?.company?.name}</p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {app.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {!resumes.length && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            Complete your profile and upload a resume to unlock AI job matching and ATS scoring.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
