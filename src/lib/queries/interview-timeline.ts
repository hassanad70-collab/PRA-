import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TimelineEventType = "applied" | "status_change" | "interview";

export interface TimelineEvent {
  type: TimelineEventType;
  timestamp: string;
  status?: string;
  fromStatus?: string;
  interviewType?: string;
}

/**
 * Hiring Decision Timeline (Recruiter Intelligence v2.0, Phase 8) -- a
 * chronological merge of three things that already exist: the application's
 * applied_at, every status-change audit_logs row the existing
 * on_application_status_change trigger (migration 0011) already writes, and
 * this application's interviews. No new schema.
 */
export async function getHiringDecisionTimeline(applicationId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient();

  const [{ data: app }, { data: auditLogs }, { data: interviews }] = await Promise.all([
    supabase.from("applications").select("applied_at").eq("id", applicationId).single(),
    supabase
      .from("audit_logs")
      .select("action, metadata, created_at")
      .eq("entity_type", "application")
      .eq("entity_id", applicationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("interviews")
      .select("scheduled_at, status, interview_type")
      .eq("application_id", applicationId)
      .order("scheduled_at", { ascending: true }),
  ]);

  const events: TimelineEvent[] = [];

  if (app) {
    events.push({ type: "applied", timestamp: app.applied_at });
  }

  (auditLogs ?? []).forEach((log) => {
    if (log.action === "application_status_changed") {
      const metadata = log.metadata as { from?: string; to?: string } | null;
      events.push({ type: "status_change", timestamp: log.created_at, status: metadata?.to, fromStatus: metadata?.from });
    }
  });

  (interviews ?? []).forEach((iv) => {
    events.push({ type: "interview", timestamp: iv.scheduled_at, status: iv.status, interviewType: iv.interview_type });
  });

  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
