"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
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

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Roles a super_admin is allowed to move a user between. Changing to/from
 * "candidate" is refused: it would require migrating candidate profile data
 * (resumes, applications, etc.) to/from the recruiters table, which this
 * action does not attempt. */
const REASSIGNABLE_ROLES: UserRole[] = ["recruiter", "hr_manager", "super_admin"];

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userId === ctx.userId && !active) return { success: false, error: "You can't disable your own account." };

  const { error } = await ctx.supabase.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: active ? "user_enabled" : "user_disabled",
    entityType: "profile",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function softDeleteUser(userId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userId === ctx.userId) return { success: false, error: "You can't delete your own account." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, { actorId: ctx.userId, action: "user_deleted", entityType: "profile", entityId: userId });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function updateUserDetails(
  userId: string,
  input: { fullName: string; phone?: string }
): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (!input.fullName.trim()) return { success: false, error: "Full name is required." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ full_name: input.fullName.trim(), phone: input.phone?.trim() || null })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_updated",
    entityType: "profile",
    entityId: userId,
    metadata: { full_name: input.fullName.trim() },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function changeUserRole(userId: string, newRole: UserRole): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userId === ctx.userId) return { success: false, error: "You can't change your own role." };
  if (!REASSIGNABLE_ROLES.includes(newRole)) {
    return { success: false, error: "Only recruiter, hr_manager, and super_admin roles can be assigned here." };
  }

  const { data: current } = await ctx.supabase.from("profiles").select("role").eq("id", userId).single();
  if (!current) return { success: false, error: "User not found." };
  if (!REASSIGNABLE_ROLES.includes(current.role as UserRole)) {
    return {
      success: false,
      error: "This user is a candidate. Converting a candidate to staff isn't supported from this panel.",
    };
  }

  const { error } = await ctx.supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) return { success: false, error: error.message };

  // If moving into a staff role and no recruiters row exists yet (e.g. a
  // hr_manager being promoted to super_admin keeps their row; this only
  // matters for the recruiter <-> hr_manager case, which reuses the same row).
  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_role_changed",
    entityType: "profile",
    entityId: userId,
    metadata: { from: current.role, to: newRole },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function adminResetUserPassword(userId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { data: profile } = await ctx.supabase.from("profiles").select("email").eq("id", userId).single();
  if (!profile) return { success: false, error: "User not found." };

  const { error } = await ctx.supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_password_reset_requested",
    entityType: "profile",
    entityId: userId,
  });

  return { success: true };
}
