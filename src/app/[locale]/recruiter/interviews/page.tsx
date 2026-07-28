import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { Calendar, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getInterviewsForCompany } from "@/lib/queries/interviews";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { formatDate } from "@/lib/utils";
import type { InterviewStatus } from "@/types/database";

type InterviewRow = Awaited<ReturnType<typeof getInterviewsForCompany>>[number];

const STATUS_VARIANT: Record<InterviewStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  scheduled: "warning",
  completed: "success",
  cancelled: "destructive",
  no_show: "destructive",
  rescheduled: "outline",
};

export default async function RecruiterInterviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const interviews = await getInterviewsForCompany(recruiter.company_id);
  const [t, tShared] = await Promise.all([
    getTranslations("Recruiter.Interviews"),
    getTranslations("Recruiter.Shared"),
  ]);

  const now = Date.now();
  const isUpcoming = (iv: InterviewRow) => iv.status === "scheduled" && new Date(iv.scheduled_at).getTime() >= now;
  const upcoming = interviews
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const past = interviews
    .filter((iv) => !isUpcoming(iv))
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("upcoming", { count: upcoming.length })}</h2>
        {upcoming.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("noUpcoming")}</CardContent>
          </Card>
        )}
        {upcoming.map((iv) => (
          <InterviewCard
            key={iv.id}
            interview={iv}
            candidateFallback={tShared("candidateFallback")}
            statusLabel={tShared(`interviewStatus.${iv.status}`)}
            minutesLabel={tShared("minutesShort", { count: iv.duration_minutes })}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">{t("past", { count: past.length })}</h2>
        {past.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("noPast")}</CardContent>
          </Card>
        )}
        {past.map((iv) => (
          <InterviewCard
            key={iv.id}
            interview={iv}
            candidateFallback={tShared("candidateFallback")}
            statusLabel={tShared(`interviewStatus.${iv.status}`)}
            minutesLabel={tShared("minutesShort", { count: iv.duration_minutes })}
          />
        ))}
      </section>
    </div>
  );
}

function InterviewCard({
  interview,
  candidateFallback,
  statusLabel,
  minutesLabel,
}: {
  interview: InterviewRow;
  candidateFallback: string;
  statusLabel: string;
  minutesLabel: string;
}) {
  return (
    <Link href={`/recruiter/applications/${interview.application_id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="min-w-0">
            <p className="truncate font-medium">{interview.application?.candidate?.profile?.full_name ?? candidateFallback}</p>
            <p className="truncate text-sm text-muted-foreground">{interview.application?.job?.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(interview.scheduled_at)} · {minutesLabel} ·{" "}
              <span className="capitalize">{interview.interview_type}</span>
            </p>
            {interview.location_or_link && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {interview.location_or_link}
              </p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[interview.status]} className="shrink-0">
            {statusLabel}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
