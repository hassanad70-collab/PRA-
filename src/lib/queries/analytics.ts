import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface RecruiterProductivityRow {
  recruiter_id: string;
  recruiter_name: string | null;
  total_applications: number;
  total_hires: number;
}

export interface HiringAnalytics {
  source_breakdown: Record<string, number>;
  time_to_hire_trend: { month: string; avg_days: number }[];
  funnel_drop_off: Record<string, number>;
  interview_conversion_rate: number;
  recruiter_productivity: RecruiterProductivityRow[];
}

export async function getHiringAnalytics(companyId: string): Promise<HiringAnalytics | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_hiring_analytics", { p_company_id: companyId });
  if (error) {
    console.error("getHiringAnalytics failed", error);
    return null;
  }
  return data as HiringAnalytics;
}
