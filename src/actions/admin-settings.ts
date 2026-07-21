"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { SystemSettingKey } from "@/types/database";
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

export async function updateSystemSetting(key: SystemSettingKey, value: Record<string, unknown>): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { error } = await ctx.supabase
    .from("system_settings")
    .update({ value, updated_by: ctx.userId })
    .eq("key", key);

  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "system_setting_updated",
    entityType: "system_setting",
    entityId: key,
    metadata: value,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
