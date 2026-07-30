"use server";

import { forbidden } from "next/navigation";
import { revalidatePath as nextRevalidate } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  return user!;
}

export interface FeatureFlag {
  key: string;
  name: string;
  description: string | null;
  category: string;
  default_enabled: boolean;
}

export interface PlanFeature {
  plan: string;
  feature_key: string;
  enabled: boolean;
  numeric_limit: number | null;
}

export interface CompanyFeature {
  company_id: string;
  feature_key: string;
  enabled: boolean;
  numeric_limit: number | null;
  override_note: string | null;
  updated_at: string;
}

export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("feature_flags")
    .select("*")
    .order("category")
    .order("key");
  return (data ?? []) as FeatureFlag[];
}

export async function getPlanFeatures(): Promise<PlanFeature[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin.from("plan_features").select("*").order("plan").order("feature_key");
  return (data ?? []) as PlanFeature[];
}

export async function getCompanyFeatureOverrides(companyId: string): Promise<CompanyFeature[]> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("company_features")
    .select("*")
    .eq("company_id", companyId)
    .order("feature_key");
  return (data ?? []) as CompanyFeature[];
}

export async function upsertCompanyFeatureOverride(
  companyId: string,
  featureKey: string,
  enabled: boolean,
  numericLimit?: number | null,
  note?: string
): Promise<ActionResult> {
  const user = await requireSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("company_features").upsert(
    {
      company_id: companyId,
      feature_key: featureKey,
      enabled,
      numeric_limit: numericLimit ?? null,
      overridden_by: user.id,
      override_note: note ?? null,
    },
    { onConflict: "company_id,feature_key" }
  );

  if (error) return { success: false, error: error.message };
  nextRevalidate("/admin/feature-flags");
  return { success: true };
}

export async function deleteCompanyFeatureOverride(
  companyId: string,
  featureKey: string
): Promise<ActionResult> {
  await requireSuperAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("company_features")
    .delete()
    .eq("company_id", companyId)
    .eq("feature_key", featureKey);
  if (error) return { success: false, error: error.message };
  nextRevalidate("/admin/feature-flags");
  return { success: true };
}
