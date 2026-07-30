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

/** Mark a job as failed with an error message. */
export async function markFailed(jobId: string, error: string): Promise<void> {
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("job_queue")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const nextStatus =
    job && job.attempts >= job.max_attempts ? "failed" : "pending";

  await admin
    .from("job_queue")
    .update({ status: nextStatus, last_error: error })
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

/** Fetch queue stats for the dashboard. */
export async function getQueueStats(): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("job_queue").select("status");
  if (error || !data) return { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };

  return data.reduce(
    (acc, row) => {
      const s = row.status as JobStatus;
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    { pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 }
  );
}
