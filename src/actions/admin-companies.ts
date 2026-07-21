"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import { companyFormSchema } from "@/lib/validations/company";
import type { ActionResult } from "./auth";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return null;

  return { supabase, userId: user.id };
}

export interface CompanyActionResult extends ActionResult {
  companyId?: string;
}

export async function createCompany(formData: FormData): Promise<CompanyActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const parsed = companyFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const data = parsed.data;
  let slug = slugify(data.name);
  const { data: existing } = await ctx.supabase.from("companies").select("id").eq("slug", slug).maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: company, error } = await ctx.supabase
    .from("companies")
    .insert({
      name: data.name,
      slug,
      website: data.website || null,
      industry: data.industry || null,
      company_size: data.companySize || null,
      headquarters: data.headquarters || null,
      founded_year: data.foundedYear ?? null,
      description: data.description || null,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error || !company) return { success: false, error: error?.message ?? "Failed to create company." };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "company_created",
    entityType: "company",
    entityId: company.id,
    metadata: { name: data.name },
  });

  revalidatePath("/admin/companies");
  return { success: true, companyId: company.id };
}

export async function updateCompany(companyId: string, formData: FormData): Promise<CompanyActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const parsed = companyFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const data = parsed.data;
  const { error } = await ctx.supabase
    .from("companies")
    .update({
      name: data.name,
      website: data.website || null,
      industry: data.industry || null,
      company_size: data.companySize || null,
      headquarters: data.headquarters || null,
      founded_year: data.foundedYear ?? null,
      description: data.description || null,
    })
    .eq("id", companyId);

  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, { actorId: ctx.userId, action: "company_updated", entityType: "company", entityId: companyId });

  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
  return { success: true, companyId };
}

export async function setCompanyActive(companyId: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { error } = await ctx.supabase.from("companies").update({ is_active: active }).eq("id", companyId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: active ? "company_enabled" : "company_disabled",
    entityType: "company",
    entityId: companyId,
  });

  revalidatePath("/admin/companies");
  revalidatePath(`/admin/companies/${companyId}`);
  return { success: true };
}

export async function softDeleteCompany(companyId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { error } = await ctx.supabase
    .from("companies")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, { actorId: ctx.userId, action: "company_deleted", entityType: "company", entityId: companyId });

  revalidatePath("/admin/companies");
  return { success: true };
}
