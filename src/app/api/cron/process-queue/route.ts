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
    default:
      // Permanently fail unknown job types so they don't occupy the queue.
      throw new Error(`Unknown job type: ${type}`);
  }
}
