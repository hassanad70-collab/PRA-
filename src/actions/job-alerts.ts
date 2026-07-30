"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { JobAlert } from "@/types/job-discovery";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface CreateJobAlertInput {
  name: string;
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
  platforms?: string[];
  frequency?: "instant" | "daily" | "weekly";
  saved_search_id?: string;
}

function nextSendAt(frequency: "instant" | "daily" | "weekly"): Date {
  const now = new Date();
  if (frequency === "instant") return now;
  if (frequency === "daily") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }
  const w = new Date(now);
  w.setDate(w.getDate() + 7);
  return w;
}

export async function getJobAlerts(): Promise<JobAlert[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("candidate_job_alerts")
    .select("id, saved_search_id, name, query, keywords, location, experience_level, filters, platforms, frequency, min_ats_score, salary_min, salary_max, is_active, last_sent_at, next_send_at, created_at, updated_at")
    .eq("candidate_id", user.id)
    .order("created_at", { ascending: false });

  return (data ?? []) as JobAlert[];
}

export async function createJobAlert(input: CreateJobAlertInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const freq = input.frequency ?? "weekly";
  const { data, error } = await supabase
    .from("candidate_job_alerts")
    .insert({
      candidate_id: user.id,
      saved_search_id: input.saved_search_id ?? null,
      name: input.name,
      query: input.query,
      keywords: input.keywords,
      location: input.location,
      experience_level: input.experience_level,
      filters: input.filters,
      platforms: input.platforms ?? ["google", "linkedin", "wuzzuf", "indeed", "bayt"],
      frequency: freq,
      next_send_at: nextSendAt(freq).toISOString(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true, id: data.id };
}

export async function updateJobAlert(
  id: string,
  input: Partial<CreateJobAlertInput>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const patch: Record<string, unknown> = { ...input };
  if (input.frequency) {
    patch.next_send_at = nextSendAt(input.frequency).toISOString();
  }

  const { error } = await supabase
    .from("candidate_job_alerts")
    .update(patch)
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}

export async function deleteJobAlert(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("candidate_job_alerts")
    .delete()
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}

export async function toggleJobAlert(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: current } = await supabase
    .from("candidate_job_alerts")
    .select("is_active, frequency")
    .eq("id", id)
    .eq("candidate_id", user.id)
    .single();

  if (!current) return { success: false, error: "Not found" };

  const patch: Record<string, unknown> = { is_active: !current.is_active };
  if (!current.is_active) {
    // Re-activating: reset next_send_at
    patch.next_send_at = nextSendAt(current.frequency as "instant" | "daily" | "weekly").toISOString();
  }

  const { error } = await supabase
    .from("candidate_job_alerts")
    .update(patch)
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}
