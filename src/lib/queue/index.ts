import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  context: Record<string, unknown>;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueueOptions {
  priority?: number;
  maxAttempts?: number;
  scheduledAt?: Date;
  context?: Record<string, unknown>;
}

/** Add a job to the queue. Returns the new job id. */
export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {}
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_queue")
    .insert({
      type,
      payload,
      priority: opts.priority ?? 0,
      max_attempts: opts.maxAttempts ?? 3,
      scheduled_at: opts.scheduledAt?.toISOString() ?? new Date().toISOString(),
      context: opts.context ?? {},
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`enqueue failed: ${error?.message}`);
  return data.id;
}

/** Claim the next pending job of the given types. Returns null if queue is empty. */
export async function claimNextJob(types?: string[]): Promise<JobRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_next_job", {
    p_types: types ?? null,
  });
  if (error) throw new Error(`claimNextJob failed: ${error.message}`);
  return (data as JobRecord | null) ?? null;
}

/** Mark a job as completed. */
export async function markComplete(jobId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("job_queue")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", jobId);
}

/**
 * Mark a running job as failed.
 * If attempts < max_attempts the job goes back to 'pending' for retry.
 * If attempts >= max_attempts it moves permanently to 'failed'.
 * claim_next_job() already incremented attempts before we started, so we
 * read the current value and compare against max_attempts.
 */
export async function markFailed(jobId: string, errorMessage: string): Promise<void> {
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("job_queue")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const exhausted = job ? job.attempts >= job.max_attempts : true;

  await admin
    .from("job_queue")
    .update({ status: exhausted ? "failed" : "pending", last_error: errorMessage })
    .eq("id", jobId);
}

/** Cancel a pending job. */
export async function cancelJob(jobId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("job_queue")
    .update({ status: "cancelled" })
    .eq("id", jobId)
    .eq("status", "pending");
}

/**
 * Fetch queue stats using parallel indexed COUNT queries.
 * Avoids a full table scan compared to SELECT status FROM job_queue.
 */
export async function getQueueStats(): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}> {
  const admin = createAdminClient();

  const [pending, running, completed, failed, cancelled] = await Promise.all(
    (["pending", "running", "completed", "failed", "cancelled"] as const).map((s) =>
      admin.from("job_queue").select("id", { count: "exact", head: true }).eq("status", s)
    )
  );

  return {
    pending: pending.count ?? 0,
    running: running.count ?? 0,
    completed: completed.count ?? 0,
    failed: failed.count ?? 0,
    cancelled: cancelled.count ?? 0,
  };
}
