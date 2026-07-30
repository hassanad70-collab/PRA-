import { NextResponse } from "next/server";

import { claimNextJob, markComplete, markFailed } from "@/lib/queue";

const MAX_JOBS_PER_INVOCATION = 5;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  // In production, CRON_SECRET is mandatory. Vercel injects it automatically
  // on cron invocations (Pro+). Without it, anyone could trigger job processing.
  if (process.env.VERCEL_ENV === "production" && !CRON_SECRET) {
    console.error("CRON_SECRET is not set in production — cron endpoint disabled for safety");
    return NextResponse.json({ error: "Cron secret not configured" }, { status: 503 });
  }

  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const processed: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (let i = 0; i < MAX_JOBS_PER_INVOCATION; i++) {
    const job = await claimNextJob();
    if (!job) break;

    try {
      await processJob(job.type, job.payload);
      await markComplete(job.id);
      processed.push(job.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await markFailed(job.id, msg);
      errors.push({ id: job.id, error: msg });
    }
  }

  return NextResponse.json({ processed, errors });
}

async function processJob(
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  switch (type) {
    case "email_send": {
      const { sendQueuedEmail } = await import("@/lib/email");
      const emailId = payload.email_id as string;
      if (!emailId) throw new Error("email_send job missing email_id in payload");
      const result = await sendQueuedEmail(emailId);
      if (!result.success) throw new Error(result.error ?? "Send failed");
      break;
    }
    case "job_alert_send": {
      const { queueTemplateEmail } = await import("@/lib/email");
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const alertId = payload.alert_id as string;
      if (!alertId) throw new Error("job_alert_send job missing alert_id in payload");
      const admin = createAdminClient();
      const { data: alert } = await admin
        .from("candidate_job_alerts")
        .select("id, name, candidate_id")
        .eq("id", alertId)
        .eq("is_active", true)
        .maybeSingle();
      if (!alert) throw new Error(`Alert ${alertId} not found or inactive`);
      const [{ data: profile }, { data: { user: authUser } }] = await Promise.all([
        admin.from("profiles").select("full_name").eq("id", alert.candidate_id).maybeSingle(),
        admin.auth.admin.getUserById(alert.candidate_id),
      ]);
      const email = authUser?.email;
      if (!email) throw new Error(`No email for candidate ${alert.candidate_id}`);
      const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pratalent.com";
      await queueTemplateEmail("job_alert", { email, name: profile?.full_name }, {
        candidate_name: profile?.full_name ?? "Candidate",
        search_name: alert.name,
        platform_url: platformUrl,
      });
      await Promise.all([
        admin
          .from("candidate_job_alerts")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("id", alertId),
        admin.from("notifications").insert({
          user_id: alert.candidate_id,
          type: "job_alert",
          title: `New jobs matching "${alert.name}"`,
          message: "New opportunities are available for your saved search. Search now to see them.",
          link: "/candidate/jobs?tab=saved",
          data: { alert_id: alertId, alert_name: alert.name },
        }),
      ]);
      break;
    }
    case "weekly_digest_send": {
      const { queueTemplateEmail } = await import("@/lib/email");
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const candidateId = payload.candidate_id as string;
      if (!candidateId) throw new Error("weekly_digest_send job missing candidate_id");
      const admin = createAdminClient();
      const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pratalent.com";
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [
        { data: profile },
        { data: { user: authUser } },
        { count: newJobs },
        { data: atsRow },
        { count: activeAlerts },
      ] = await Promise.all([
        admin.from("profiles").select("full_name").eq("id", candidateId).maybeSingle(),
        admin.auth.admin.getUserById(candidateId),
        admin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published").gte("created_at", weekAgo),
        admin.from("ats_scores").select("overall_score").eq("candidate_id", candidateId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("candidate_job_alerts").select("id", { count: "exact", head: true }).eq("candidate_id", candidateId).eq("is_active", true),
      ]);
      const email = authUser?.email;
      if (!email) throw new Error(`No email for candidate ${candidateId}`);
      await queueTemplateEmail("weekly_career_digest", { email, name: profile?.full_name }, {
        candidate_name: profile?.full_name ?? "Candidate",
        new_matches: String(newJobs ?? 0),
        ats_score: atsRow?.overall_score != null ? String(atsRow.overall_score) : "N/A",
        active_alerts: String(activeAlerts ?? 0),
        platform_url: platformUrl,
      });
      break;
    }
    default:
      // Permanently fail unknown job types so they don't occupy the queue.
      throw new Error(`Unknown job type: ${type}`);
  }
}
