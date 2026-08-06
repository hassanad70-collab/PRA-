import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/shared/score-ring";
import { JobDiscoveryWidget } from "@/components/candidate/job-discovery-widget";
import {
  getCandidateApplications,
  getCandidateFullProfile,
  getCurrentUser,
  getLatestAtsScore,
  getRecommendedJobsForCandidate,
} from "@/lib/queries/candidate";
import { getCandidateInterviews } from "@/lib/queries/interviews";
import { getWorkspaceSummary } from "@/lib/workspace/queries";
import { getSearchHistory } from "@/actions/search-history";
import { getSavedSearches } from "@/actions/saved-searches";
import { getJobAlerts } from "@/actions/job-alerts";

export default async function CandidateDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [
    { candidate, resumes },
    applications,
    recommendations,
    atsScore,
    interviews,
    workspaceSummary,
    recentSearches,
    savedSearches,
    alerts,
    t,
    tShared,
    tCommon,
  ] = await Promise.all([
    getCandidateFullProfile(user.id),
    getCandidateApplications(user.id),
    getRecommendedJobsForCandidate(user.id, 5),
    getLatestAtsScore(user.id),
    getCandidateInterviews(user.id),
    getWorkspaceSummary(user.id),
    getSearchHistory(5),
    getSavedSearches(),
    getJobAlerts(),
    getTranslations("Candidate.Dashboard"),
    getTranslations("Candidate.Shared"),
    getTranslations("Common"),
  ]);

  const now = Date.now();
  const activeApplications = applications.filter((a) => !["rejected", "withdrawn"].includes(a.status));
  const upcomingInterviews = interviews
    .filter((iv) => iv.status === "scheduled" && new Date(iv.scheduled_at).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3);
  const activeAlerts = alerts.filter((a) => a.is_active).length;

  const totalAiActivity = workspaceSummary.coverLetters + workspaceSummary.interviewSessions + workspaceSummary.careerReports;

  const profilePct = candidate?.profile_completion_percent ?? 0;
  const quickTasks: { label: string; done: boolean; href: string }[] = [
    { label: "Upload a resume", done: resumes.length > 0, href: "/candidate/workspace/resumes" },
    { label: "Complete your profile", done: profilePct >= 80, href: "/candidate/settings" },
    { label: "Run ATS check", done: !!atsScore, href: "/candidate/workspace/ats-checker" },
    { label: "Generate a cover letter", done: workspaceSummary.coverLetters > 0, href: "/candidate/workspace/cover-letters" },
    { label: "Apply to a job", done: applications.length > 0, href: "/candidate/jobs" },
  ];

  const pendingTasks = quickTasks.filter((t) => !t.done);

  const firstName = user.full_name.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("welcomeBack", { name: firstName })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">{tShared("profileCompletion")}</p>
              <p className="mt-1 text-2xl font-bold">{profilePct}%</p>
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Progress value={profilePct} />
          </div>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("activeApplications")}</p>
            <p className="mt-1 text-2xl font-bold">{activeApplications.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("totalSubmitted", { count: applications.length })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Upcoming Interviews</p>
            <p className="mt-1 text-2xl font-bold">{upcomingInterviews.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {upcomingInterviews.length > 0
                ? `Next: ${new Date(upcomingInterviews[0].scheduled_at).toLocaleDateString()}`
                : "None scheduled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("latestAtsScore")}</p>
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
                <p className="font-medium">{t("uploadResumeTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("uploadResumeSubtitle")}</p>
              </div>
            </div>
            <Button variant="gradient" asChild>
              <Link href="/candidate/workspace/resumes">
                <Upload className="mr-2 h-4 w-4" /> {t("uploadResume")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> {t("aiRecommendedJobs")}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/candidate/jobs">
                {t("viewAll")} <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noRecommendations")}</p>
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
                    {match.job?.company?.name} · {match.job?.location ?? tCommon("remote")}
                  </p>
                </div>
                <Badge variant={match.match_score >= 80 ? "success" : match.match_score >= 60 ? "warning" : "outline"}>
                  {tShared("matchPercent", { percent: Math.round(match.match_score) })}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {upcomingInterviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" /> Upcoming Interviews
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingInterviews.map((iv) => (
                  <Link
                    key={iv.id}
                    href={`/candidate/interviews`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{iv.application?.job?.title}</p>
                    <p className="text-xs text-muted-foreground">{iv.application?.job?.company?.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(iv.scheduled_at).toLocaleDateString()} · {iv.duration_minutes} min
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" /> {t("recentApplications")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {applications.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("noApplications")}</p>
              )}
              {applications.slice(0, 4).map((app) => (
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
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" /> Recent AI Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalAiActivity === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No AI tools used yet.{" "}
                <Link href="/candidate/workspace/assistant" className="underline">
                  Start with the AI assistant.
                </Link>{" "}
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-500" />
                    Cover letters
                  </div>
                  <Badge variant="secondary">{workspaceSummary.coverLetters}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-purple-500" />
                    Interview sessions
                  </div>
                  <Badge variant="secondary">{workspaceSummary.interviewSessions}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Career reports
                  </div>
                  <Badge variant="secondary">{workspaceSummary.careerReports}</Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {pendingTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4" /> {"Today's Tasks"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingTasks.slice(0, 4).map((task) => (
                <Link
                  key={task.label}
                  href={task.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/30" />
                  <span className="text-sm">{task.label}</span>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        <JobDiscoveryWidget
          recentSearches={recentSearches}
          savedSearches={savedSearches}
          activeAlerts={activeAlerts}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/candidate/workspace/assistant", icon: Bot, label: "Ask AI Advisor", color: "text-primary bg-primary/10" },
              { href: "/candidate/workspace/cover-letters", icon: FileText, label: "Write Cover Letter", color: "text-blue-500 bg-blue-500/10" },
              { href: "/candidate/workspace/ats-checker", icon: Target, label: "Check ATS Score", color: "text-purple-500 bg-purple-500/10" },
              { href: "/candidate/workspace/interview-prep", icon: Calendar, label: "Practice Interview", color: "text-emerald-500 bg-emerald-500/10" },
            ].map(({ href, icon: Icon, label, color }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:bg-accent hover:shadow-sm"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
