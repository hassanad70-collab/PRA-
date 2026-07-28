import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { RecruiterInterviewListItem } from "@/lib/queries/interviews";

export interface RecruiterWorkloadRow {
  recruiter_id: string;
  recruiter_name: string | null;
  open_jobs: number;
  active_applications: number;
}

export interface CompanyDashboardStats {
  total_jobs: number;
  open_jobs: number;
  closed_jobs: number;
  total_candidates: number;
  applications_today: number;
  applications_this_month: number;
  average_ats_score: number | null;
  hiring_funnel: Record<string, number>;
  offer_acceptance_rate: number;
  /** Recruiter Intelligence v2.0 (Phase 1) additions -- see migration 0021. */
  offers_pending: number;
  interviews_scheduled: number;
  hires_this_month: number;
  hires_last_30_days: number;
  avg_time_to_hire_days: number | null;
  department_breakdown: Record<string, number>;
  recruiter_workload: RecruiterWorkloadRow[];
}

export async function getCompanyDashboardStats(companyId: string): Promise<CompanyDashboardStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_company_dashboard_stats", { p_company_id: companyId });
  if (error) {
    console.error("getCompanyDashboardStats failed", error);
    return null;
  }
  return data as CompanyDashboardStats;
}

export async function getTopSkills(companyId: string, limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("candidate:candidates(id), job:jobs!inner(company_id)")
    .eq("job.company_id", companyId)
    // Scalability guard-rail, not a UX change -- see getPublishedJobs.
    .limit(2000);

  if (!data?.length) return [];

  const candidateIds = Array.from(
    new Set(
      data
        .map((d) => {
          const candidate = d.candidate as unknown;
          if (Array.isArray(candidate)) return (candidate[0] as { id?: string } | undefined)?.id;
          return (candidate as { id?: string } | null)?.id;
        })
        .filter((id): id is string => Boolean(id))
    )
  );
  if (!candidateIds.length) return [];

  const { data: skills } = await supabase
    .from("candidate_skills")
    .select("skill_name")
    .in("candidate_id", candidateIds as string[]);

  const counts = new Map<string, number>();
  (skills ?? []).forEach((s) => counts.set(s.skill_name, (counts.get(s.skill_name) ?? 0) + 1));

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

/** Next N scheduled interviews across the company, soonest first -- reuses the same embed shape as getInterviewsForCompany (Unit H). */
export async function getUpcomingInterviews(companyId: string, limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interviews")
    .select(
      `id, scheduled_at, duration_minutes, interview_type, location_or_link, status, application_id,
      application:applications!inner(
        job:jobs!inner(id, title, company_id),
        candidate:candidates(profile:profiles(full_name))
      )`
    )
    .eq("application.job.company_id", companyId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit)
    .returns<RecruiterInterviewListItem[]>();

  if (error) {
    console.error("getUpcomingInterviews failed", error);
    return [];
  }
  return data ?? [];
}

export interface RecentHireItem {
  id: string;
  updated_at: string;
  job: { id: string; title: string } | null;
  candidate: { profile: { full_name: string } | null } | null;
}

/** Most recently hired candidates across the company. `updated_at` doubles as
 * the hire timestamp here -- applications have no dedicated hired_at column,
 * and updated_at is bumped on every status change including the transition
 * to 'hired', so it's an accurate proxy for "most recently hired" ordering. */
export async function getRecentHires(companyId: string, limit = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      `id, updated_at,
      job:jobs!inner(id, title, company_id),
      candidate:candidates(profile:profiles(full_name))`
    )
    .eq("job.company_id", companyId)
    .eq("status", "hired")
    .order("updated_at", { ascending: false })
    .limit(limit)
    .returns<RecentHireItem[]>();

  if (error) {
    console.error("getRecentHires failed", error);
    return [];
  }
  return data ?? [];
}

export async function getMonthlyApplicationTrend(companyId: string, months = 6) {
  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data } = await supabase
    .from("applications")
    .select("applied_at, job:jobs!inner(company_id)")
    .eq("job.company_id", companyId)
    .gte("applied_at", since.toISOString());

  const buckets = new Map<string, number>();
  (data ?? []).forEach((row) => {
    const d = new Date(row.applied_at as string);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, applications: count }));
}
