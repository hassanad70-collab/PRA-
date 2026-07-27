import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";

import { getRedirectLocale } from "@/i18n/get-redirect-locale";

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

export default async function RecruiterInterviewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect(`/${await getRedirectLocale()}/candidate/dashboard`);

  const interviews = await getInterviewsForCompany(recruiter.company_id);

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
        <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every interview scheduled across your company&apos;s open roles.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">No upcoming interviews.</CardContent>
          </Card>
        )}
        {upcoming.map((iv) => (
          <InterviewCard key={iv.id} interview={iv} />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Past ({past.length})</h2>
        {past.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">No past interviews yet.</CardContent>
          </Card>
        )}
        {past.map((iv) => (
          <InterviewCard key={iv.id} interview={iv} />
        ))}
      </section>
    </div>
  );
}

function InterviewCard({ interview }: { interview: InterviewRow }) {
  return (
    <Link href={`/recruiter/applications/${interview.application_id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="min-w-0">
            <p className="truncate font-medium">{interview.application?.candidate?.profile?.full_name ?? "Candidate"}</p>
            <p className="truncate text-sm text-muted-foreground">{interview.application?.job?.title}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> {formatDate(interview.scheduled_at)} · {interview.duration_minutes} min ·{" "}
              <span className="capitalize">{interview.interview_type}</span>
            </p>
            {interview.location_or_link && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> {interview.location_or_link}
              </p>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[interview.status]} className="shrink-0 capitalize">
            {interview.status.replace("_", " ")}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
