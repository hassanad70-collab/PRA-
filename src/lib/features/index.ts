import "server-only";

import { unstable_cache } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const FEATURES = [
  "ai_resume_parsing",
  "ats_scoring",
  "resume_health",
  "interview_copilot",
  "candidate_insights",
  "job_description_ai",
  "recruiter_copilot",
  "talent_pool",
  "job_matching",
  "analytics",
  "bulk_actions",
  "interview_scheduling",
  "csv_export",
  "team_members",
  "role_management",
  "api_access",
  "sso",
  "white_label",
  "custom_branding",
  "email_automation",
  "audit_logs",
  "webhooks",
  "jobs_limit",
  "team_members_limit",
  "candidates_limit",
] as const;

export type FeatureKey = (typeof FEATURES)[number];

export interface FeatureState {
  enabled: boolean;
  numeric_limit: number | null;
}

export type CompanyFeatureMap = Record<FeatureKey, FeatureState>;

/** Fetch effective features for a company (plan defaults merged with overrides). Cached for 60 s. */
export const getCompanyFeatures = unstable_cache(
  async (companyId: string): Promise<CompanyFeatureMap> => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_company_features", { p_company_id: companyId });
    if (error || !data) {
      console.error("getCompanyFeatures failed", error);
      return {} as CompanyFeatureMap;
    }
    return Object.fromEntries(
      (data as { feature_key: string; enabled: boolean; numeric_limit: number | null }[]).map((r) => [
        r.feature_key,
        { enabled: r.enabled, numeric_limit: r.numeric_limit },
      ])
    ) as CompanyFeatureMap;
  },
  ["company_features"],
  { revalidate: 60 }
);

/**
 * Returns true if the company's effective feature set includes this feature enabled.
 * Safe to call from server components and server actions.
 */
export async function hasFeature(companyId: string, featureKey: FeatureKey): Promise<boolean> {
  const features = await getCompanyFeatures(companyId);
  return features[featureKey]?.enabled === true;
}

/**
 * Returns the numeric limit for a feature (e.g. max_jobs), or null if unlimited.
 */
export async function getFeatureLimit(companyId: string, featureKey: FeatureKey): Promise<number | null> {
  const features = await getCompanyFeatures(companyId);
  return features[featureKey]?.numeric_limit ?? null;
}

/**
 * Throws an Error if the feature is not enabled for this company.
 * Use inside server actions as a guard.
 */
export async function requireFeature(companyId: string, featureKey: FeatureKey): Promise<void> {
  const enabled = await hasFeature(companyId, featureKey);
  if (!enabled) {
    throw new Error(`Feature '${featureKey}' is not enabled for this company.`);
  }
}

/**
 * Fetch the company_id for the currently authenticated recruiter.
 * Returns null if not authenticated or not a recruiter.
 */
export async function getCurrentCompanyId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("recruiters").select("company_id").eq("id", user.id).maybeSingle();
  return data?.company_id ?? null;
}

/**
 * canUseFeature(featureKey): check whether the current recruiter's company
 * has this feature. Returns false for non-recruiter callers.
 */
export async function canUseFeature(featureKey: FeatureKey): Promise<boolean> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return false;
  return hasFeature(companyId, featureKey);
}
