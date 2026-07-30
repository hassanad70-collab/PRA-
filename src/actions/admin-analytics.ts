"use server";

import { forbidden } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

export interface PlatformAnalytics {
  total_companies: number;
  total_users: number;
  total_candidates: number;
  total_recruiters: number;
  total_jobs: number;
  active_jobs: number;
  closed_jobs: number;
  draft_jobs: number;
  total_applications: number;
  total_resumes: number;
  total_interviews: number;
  new_applications_in_range: number;
  new_applications_today: number;
  new_applications_this_week: number;
  new_applications_this_month: number;
  parse_success_count: number;
  parse_partial_count: number;
  parse_failed_count: number;
  parse_pending_count: number;
  avg_ats_score: number | null;
  interview_conversion_rate: number;
  offer_acceptance_rate: number;
  avg_days_to_hire: number | null;
  hiring_funnel: Record<string, number> | null;
  applications_by_status: Record<string, number> | null;
  storage_bytes: number;
}

export interface MonthlyGrowth {
  month: string;
  applications: number;
  new_candidates: number;
  new_jobs: number;
}

export interface AtsDistribution {
  bucket: string;
  count: number;
}

export interface DailyActivity {
  day: string;
  count: number;
}

export async function getPlatformAnalytics(
  from?: string,
  to?: string,
  companyId?: string
): Promise<PlatformAnalytics | null> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_platform_analytics", {
    p_from: from ?? null,
    p_to: to ?? null,
    p_company_id: companyId ?? null,
  });
  if (error) { console.error("get_platform_analytics", error); return null; }
  return data as PlatformAnalytics;
}

export async function getMonthlyGrowthMetrics(
  months = 12,
  companyId?: string
): Promise<MonthlyGrowth[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_monthly_growth_metrics", {
    p_months: months,
    p_company_id: companyId ?? null,
  });
  if (error) { console.error("get_monthly_growth_metrics", error); return []; }
  return (data ?? []) as MonthlyGrowth[];
}

export async function getAtsScoreDistribution(companyId?: string): Promise<AtsDistribution[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_ats_score_distribution", {
    p_company_id: companyId ?? null,
  });
  if (error) { console.error("get_ats_score_distribution", error); return []; }
  return (data ?? []) as AtsDistribution[];
}

export async function getDailyActivity(days = 30, companyId?: string): Promise<DailyActivity[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_daily_activity", {
    p_days: days,
    p_company_id: companyId ?? null,
  });
  if (error) { console.error("get_daily_activity", error); return []; }
  return (data ?? []) as DailyActivity[];
}

export interface SearchAnalytics {
  total_searches: number;
  unique_searches: number;
  unique_searchers: number;
  total_saved_searches: number;
  total_active_alerts: number;
  total_alerts: number;
  ai_recs_cached: number;
  searches_today: number;
  searches_this_week: number;
  top_queries: Array<{ term: string; count: number }>;
  top_keywords: Array<{ term: string; count: number }>;
  top_locations: Array<{ term: string; count: number }>;
  experience_distribution: Record<string, number>;
  alert_frequency_distribution: Record<string, number>;
}

export async function getSearchAnalytics(): Promise<SearchAnalytics | null> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_search_analytics");
  if (error) { console.error("get_search_analytics", error); return null; }
  return data as SearchAnalytics;
}

export async function getCompaniesForFilter(): Promise<{ id: string; name: string }[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as { id: string; name: string }[];
}
