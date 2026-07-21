import "server-only";

import { createClient } from "@/lib/supabase/server";

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
    .eq("job.company_id", companyId);

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
