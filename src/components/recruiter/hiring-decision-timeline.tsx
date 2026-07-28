import { getTranslations } from "next-intl/server";
import { CheckCircle2, Circle, FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEvent } from "@/lib/queries/interview-timeline";
import { formatDate } from "@/lib/utils";

/** Hiring Decision Timeline (Recruiter Intelligence v2.0, Phase 8) -- purely
 * derived from existing data (applied_at, audit_logs, interviews), see
 * getHiringDecisionTimeline. */
export async function HiringDecisionTimeline({ events }: { events: TimelineEvent[] }) {
  const [t, tShared] = await Promise.all([
    getTranslations("Recruiter.InterviewIntelligence"),
    getTranslations("Recruiter.Shared"),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("timelineTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {events.map((event, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              {index === events.length - 1 ? (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p>
                  {event.type === "applied" && t("timelineApplied")}
                  {event.type === "status_change" &&
                    t("timelineStatusChange", { status: tShared(`applicationStatus.${event.status}` as Parameters<typeof tShared>[0]) })}
                  {event.type === "interview" &&
                    t("timelineInterview", {
                      type: event.interviewType ?? "",
                      status: tShared(`interviewStatus.${event.status}` as Parameters<typeof tShared>[0]),
                    })}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" /> {formatDate(event.timestamp)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
