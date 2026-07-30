"use server";

import { forbidden } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getQueueStats, cancelJob, type JobRecord } from "@/lib/queue";
import type { ActionResult } from "./auth";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) forbidden();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  if (profile?.role !== "super_admin") forbidden();
}

export async function getQueueDashboardData(): Promise<{
  stats: { pending: number; running: number; completed: number; failed: number; cancelled: number };
  recent: JobRecord[];
}> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const [stats, { data: recent }] = await Promise.all([
    getQueueStats(),
    admin
      .from("job_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return { stats, recent: (recent ?? []) as JobRecord[] };
}

export async function cancelQueuedJob(jobId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  try {
    await cancelJob(jobId);
    revalidatePath("/admin/queue");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function retryFailedJob(jobId: string): Promise<ActionResult> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("job_queue")
    .update({ status: "pending", last_error: null })
    .eq("id", jobId)
    .eq("status", "failed");
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/queue");
  return { success: true };
}
