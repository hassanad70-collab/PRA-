"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SearchHistoryEntry } from "@/types/job-discovery";

export interface SearchParams {
  query: string;
  keywords: string;
  location: string;
  experience_level: string;
  filters: string[];
}

function buildQueryKey(params: SearchParams): string {
  // Deterministic key that deduplicates searches with the same intent.
  const parts = [
    params.query.trim().toLowerCase(),
    params.keywords.trim().toLowerCase(),
    params.location.trim().toLowerCase(),
    params.experience_level,
    [...params.filters].sort().join(","),
  ];
  return parts.join("|");
}

export async function saveSearchToHistory(params: SearchParams): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createAdminClient();
  const queryKey = buildQueryKey(params);

  await admin.rpc("upsert_search_history", {
    p_candidate_id: user.id,
    p_query_key: queryKey,
    p_query: params.query,
    p_keywords: params.keywords,
    p_location: params.location,
    p_experience_level: params.experience_level,
    p_filters: params.filters,
    p_search_source: "manual",
  });
}

export async function getSearchHistory(limit = 10): Promise<SearchHistoryEntry[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("candidate_search_history")
    .select("id, query_key, query, keywords, location, experience_level, filters, search_source, search_count, last_used_at, created_at")
    .eq("candidate_id", user.id)
    .order("last_used_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as SearchHistoryEntry[];
}

export async function deleteSearchHistoryEntry(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("candidate_search_history")
    .delete()
    .eq("id", id)
    .eq("candidate_id", user.id);
}

export async function clearSearchHistory(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("candidate_search_history")
    .delete()
    .eq("candidate_id", user.id);
}
