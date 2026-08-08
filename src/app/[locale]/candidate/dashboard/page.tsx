import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import {
  ArrowUpRight,
  BarChart2,
  Bot,
  Brain,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Mic,
  PenLine,
  Search,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Upload,
  Activity,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/shared/score-ring";
import { JobDiscoveryWidget } from "@/components/candidate/job-discovery-widget";
import { ContinueWidget } from "@/components/candidate/continue-widget";
import {
  getCandidateApplications,
  getCandidateFullProfile,
  getCurrentUser,
  getLatestAtsScore,
  getRecommendedJobsForCandidate,
} from "@/lib/queries/candidate";
import { getCandidateInterviews } from "@/lib/queries/interviews";
import { getWorkspaceSummary } from "@/lib/workspace/queries";
import { getRecentActivity } from "@/lib/workspace/activity";
import { getSearchHistory } from "@/actions/search-history";
import { getSavedSearches } from "@/actions/saved-searches";
import { getJobAlerts } from "@/actions/job-alerts";

const ACTIVITY_ICONS: Record<string, typeof Bot> = {
  cover_letter: FileText,
  interview: Bot,
  career_report: Sparkles,
  ats_score: Target,
  application: Briefcase,
};

const ACTIVITY_COLORS: Record<string, string> = {
  cover_letter: "text-blue-500 bg-blue-500/10",
  interview: "text-violet-500 bg-violet-500/10",
  career_report: "text-emerald-500 bg-emerald-500/10",
  ats_score: "text-orange-500 bg-orange-500/10",
  application: "text-primary bg-primary/10",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

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
    recentActivity,
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
    getRecentActivity(user.id),
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

  const totalAiUsage = workspaceSummary.coverLetters + workspaceSummary.interviewSessions + workspaceSummary.careerReports;

  const profilePct = candidate?.profile_completion_percent ?? 0;

  // Resume Score: holistic metric (0-100)
  const hasResume = resumes.length > 0;
  const resumeScore = Math.round(
    (hasResume ? 30 : 0) +
    profilePct * 0.3 +
    (atsScore?.overall_score ?? 0) * 0.4
  );

  const quickTasks: { label: string; done: boolean; href: string }[] = [
    { label: "Upload a resume", done: hasResume, href: "/candidate/workspace/resumes" },
    { label: "Complete your profile", done: profilePct >= 80, href: "/candidate/settings" },
    { label: "Run ATS check", done: !!atsScore, href: "/candidate/workspace/ats-checker" },
    { label: "Generate a cover letter", done: workspaceSummary.coverLetters > 0, href: "/candidate/workspace/cover-letters" },
    { label: "Apply to a job", done: applications.length > 0, href: "/candidate/jobs" },
  ];

  const todayGoal = quickTasks.find((t) => !t.done);
  const pendingTasks = quickTasks.filter((t) => !t.done);

  const firstName = user.full_name.split(" ")[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("welcomeBack", { name: firstName })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ContinueWidget />

      {/* Today's Goal */}
      {todayGoal && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Today&apos;s Goal</p>
                <p className="mt-0.5 font-medium">{todayGoal.label}</p>
                <p className="text-sm text-muted-foreground">
                  {pendingTasks.length === 1
                    ? "Last step to a complete profile"
                    : `${pendingTasks.length} tasks remaining`}
                </p>
              </div>
            </div>
            <Button variant="gradient" asChild>
              <Link href={todayGoal.href}>
                Get started <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload prompt (only when no resume AND no today goal shown) */}
      {!candidate?.primary_resume_id && !todayGoal && (
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

      {/* Stats grid */}
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
          <CardContent className="flex items-center justify-between pt-6 pb-6">
            <div>
              <p className="text-sm text-muted-foreground">Resume Score</p>
              <p className="mt-1 text-2xl font-bold">{resumeScore}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {resumeScore >= 80 ? "Excellent" : resumeScore >= 60 ? "Good" : resumeScore >= 40 ? "Fair" : "Needs work"}
              </p>
            </div>
            <ScoreRing score={resumeScore} size={56} strokeWidth={5} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6 pb-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("latestAtsScore")}</p>
              <p className="mt-1 text-2xl font-bold">{atsScore?.overall_score ?? "—"}</p>
              {atsScore && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {atsScore.overall_score >= 75 ? "ATS-ready" : "Needs improvement"}
                </p>
              )}
            </div>
            {atsScore && <ScoreRing score={atsScore.overall_score} size={56} strokeWidth={5} />}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">AI Usage</p>
            <p className="mt-1 text-2xl font-bold">{totalAiUsage}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalAiUsage === 0
                ? "No AI tools used yet"
                : `${workspaceSummary.coverLetters} letters · ${workspaceSummary.interviewSessions} interviews · ${workspaceSummary.careerReports} reports`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Applications + Interviews row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">{t("activeApplications")}</p>
            <p className="mt-1 text-2xl font-bold">{activeApplications.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("totalSubmitted", { count: applications.length })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <p className="text-sm text-muted-foreground">Upcoming Interviews</p>
            <p className="mt-1 text-2xl font-bold">{upcomingInterviews.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {upcomingInterviews.length > 0
                ? `Next: ${new Date(upcomingInterviews[0].scheduled_at).toLocaleDateString()}`
                : "None scheduled"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Jobs + Upcoming Interviews detail */}
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
                    href="/candidate/interviews"
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

      {/* Bottom row: Tasks + Recent Activity + Job Discovery */}
      <div className="grid gap-6 lg:grid-cols-3">
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

        {/* Recent Activity */}
        <Card className={pendingTasks.length === 0 ? "lg:col-span-2" : ""}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No activity yet. Start using the AI tools to see your history here.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((entry) => {
                  const Icon = ACTIVITY_ICONS[entry.type] ?? Bot;
                  const colorClass = ACTIVITY_COLORS[entry.type] ?? "text-primary bg-primary/10";
                  return (
                    <Link
                      key={`${entry.type}-${entry.id}`}
                      href={entry.href}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent transition-colors"
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{entry.label}</p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.created_at)}</p>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <JobDiscoveryWidget
          recentSearches={recentSearches}
          savedSearches={savedSearches}
          activeAlerts={activeAlerts}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/candidate/workspace/assistant",       icon: Bot,        label: "AI Assistant",            color: "text-primary bg-primary/10" },
              { href: "/candidate/workspace/studio",          icon: PenLine,    label: "Resume Studio",           color: "text-violet-500 bg-violet-500/10" },
              { href: "/candidate/workspace/ats-checker",     icon: Target,     label: "ATS Resume Check",        color: "text-orange-500 bg-orange-500/10" },
              { href: "/candidate/workspace/cover-letters",   icon: FileText,   label: "Cover Letters",           color: "text-blue-500 bg-blue-500/10" },
              { href: "/candidate/workspace/interview-prep",  icon: Mic,        label: "Interview Prep",          color: "text-emerald-500 bg-emerald-500/10" },
              { href: "/candidate/workspace/interview-center",icon: Brain,      label: "Interview Intelligence",  color: "text-indigo-500 bg-indigo-500/10" },
              { href: "/candidate/workspace/app-intelligence",icon: BarChart2,  label: "Application Intelligence",color: "text-teal-500 bg-teal-500/10" },
              { href: "/candidate/jobs",                      icon: Search,     label: "Browse Jobs",             color: "text-green-500 bg-green-500/10" },
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
