"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SavedSearch } from "@/types/job-discovery";

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface SaveSearchInput {
  name: string;
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
  platforms?: string[];
  alert_enabled?: boolean;
  alert_frequency?: "instant" | "daily" | "weekly";
}

export async function getSavedSearches(): Promise<SavedSearch[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("candidate_saved_searches")
    .select("id, name, query, keywords, location, experience_level, filters, platforms, is_active, alert_enabled, alert_frequency, created_at, updated_at")
    .eq("candidate_id", user.id)
    .order("updated_at", { ascending: false });

  return (data ?? []) as SavedSearch[];
}

export async function saveSearch(input: SaveSearchInput): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("candidate_saved_searches")
    .insert({
      candidate_id: user.id,
      name: input.name,
      query: input.query,
      keywords: input.keywords,
      location: input.location,
      experience_level: input.experience_level,
      filters: input.filters,
      platforms: input.platforms ?? ["google", "linkedin", "wuzzuf", "indeed", "bayt"],
      alert_enabled: input.alert_enabled ?? false,
      alert_frequency: input.alert_frequency ?? "weekly",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true, id: data.id };
}

export async function updateSavedSearch(
  id: string,
  input: Partial<SaveSearchInput>
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("candidate_saved_searches")
    .update({ ...input })
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("candidate_saved_searches")
    .delete()
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}

export async function duplicateSavedSearch(id: string): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: original } = await supabase
    .from("candidate_saved_searches")
    .select("*")
    .eq("id", id)
    .eq("candidate_id", user.id)
    .single();

  if (!original) return { success: false, error: "Not found" };

  const { data, error } = await supabase
    .from("candidate_saved_searches")
    .insert({
      candidate_id: user.id,
      name: `${original.name} (copy)`,
      query: original.query,
      keywords: original.keywords,
      location: original.location,
      experience_level: original.experience_level,
      filters: original.filters,
      platforms: original.platforms,
      alert_enabled: false,
      alert_frequency: original.alert_frequency,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true, id: data.id };
}

export async function toggleSavedSearchAlert(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: current } = await supabase
    .from("candidate_saved_searches")
    .select("alert_enabled")
    .eq("id", id)
    .eq("candidate_id", user.id)
    .single();

  if (!current) return { success: false, error: "Not found" };

  const { error } = await supabase
    .from("candidate_saved_searches")
    .update({ alert_enabled: !current.alert_enabled })
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}

export async function updateAlertFrequency(
  id: string,
  frequency: "instant" | "daily" | "weekly"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("candidate_saved_searches")
    .update({ alert_frequency: frequency })
    .eq("id", id)
    .eq("candidate_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/candidate/jobs");
  return { success: true };
}
