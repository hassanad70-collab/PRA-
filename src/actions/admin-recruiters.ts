"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
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

export async function assignRecruiterCompany(recruiterId: string, companyId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { data: company } = await ctx.supabase.from("companies").select("id").eq("id", companyId).single();
  if (!company) return { success: false, error: "Company not found." };

  const { error } = await ctx.supabase.from("recruiters").update({ company_id: companyId }).eq("id", recruiterId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "recruiter_company_assigned",
    entityType: "recruiter",
    entityId: recruiterId,
    metadata: { company_id: companyId },
  });

  revalidatePath("/admin/recruiters");
  return { success: true };
}
