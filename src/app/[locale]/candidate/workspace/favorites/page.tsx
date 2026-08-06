import { redirect } from "@/i18n/navigation";
import { FileText, Mic, Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getFavorites } from "@/lib/workspace/analytics";
import { formatDate } from "@/lib/utils";

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const { coverLetters, interviewSessions, careerReports } = await getFavorites(user.id);
  const total = coverLetters.length + interviewSessions.length + careerReports.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Favorites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total > 0 ? `${total} item${total !== 1 ? "s" : ""} you've starred.` : "Star items across your workspace to save them here."}
        </p>
      </div>

      {total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Star className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No favorites yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Star a cover letter, interview session, or career report to find it here quickly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {coverLetters.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Cover Letters ({coverLetters.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {coverLetters.map((cl) => (
              <Link key={cl.id} href={`/${locale}/candidate/workspace/cover-letters`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="flex items-center gap-3 pt-5 pb-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{cl.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(cl.created_at)}</p>
                    </div>
                    <Star className="ml-auto h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {interviewSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Interview Sessions ({interviewSessions.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {interviewSessions.map((s) => (
              <Link key={s.id} href={`/${locale}/candidate/workspace/interview-prep`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="flex items-center gap-3 pt-5 pb-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                      <Mic className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.job_title ?? "Interview session"}</p>
                      <p className="text-xs text-muted-foreground">{s.company_name ?? formatDate(s.created_at)}</p>
                    </div>
                    <Star className="ml-auto h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {careerReports.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Career Reports ({careerReports.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {careerReports.map((r) => (
              <Link key={r.id} href={`/${locale}/candidate/workspace/career-advisor`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="flex items-center gap-3 pt-5 pb-5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.target_role ?? r.current_job_role ?? "Career report"}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                    <Star className="ml-auto h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
