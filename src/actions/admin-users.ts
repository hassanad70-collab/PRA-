"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import type { ActionResult } from "./auth";

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

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

/** Roles moveable from the IAM panel (candidate conversion requires data migration). */
const REASSIGNABLE_ROLES: UserRole[] = ["recruiter", "hr_manager", "super_admin"];

// ---------------------------------------------------------------------------
// Create User
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyId?: string;
  department?: string;
  role: UserRole;
  status: "active" | "disabled";
  temporaryPassword: string;
  sendInvitation: boolean;
}

export async function createUserAction(input: CreateUserInput): Promise<ActionResult<{ userId: string }>> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
  if (!fullName) return { success: false, error: "First and last name are required." };
  if (!input.email.trim()) return { success: false, error: "Email is required." };
  if (input.temporaryPassword.length < 8) return { success: false, error: "Password must be at least 8 characters." };

  const admin = createAdminClient();

  // 1. Create the Supabase Auth user (service role — bypasses email confirmation).
  //    The handle_new_user trigger fires synchronously and creates the profile row.
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: input.role,
      phone: input.phone?.trim() || undefined,
      department: input.department?.trim() || undefined,
    },
  });

  if (authError) return { success: false, error: authError.message };
  const newUserId = authData.user.id;

  // 2. Update the profile with all fields not covered by the trigger.
  //    Also updates role/phone/department in case the trigger ran before
  //    metadata propagated (belt-and-suspenders).
  const profileUpdate: Record<string, unknown> = {
    full_name: fullName,
    role: input.role,
    phone: input.phone?.trim() || null,
    department: input.department?.trim() || null,
    is_active: input.status === "active",
    company_id: input.companyId || null,
  };

  const { error: profileError } = await ctx.supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", newUserId);

  if (profileError) {
    // Clean up: delete the auth user so there's no orphaned account
    await admin.auth.admin.deleteUser(newUserId);
    return { success: false, error: `Profile setup failed: ${profileError.message}` };
  }

  // 3. If the role requires a recruiters row and a company was selected, create it.
  if ((input.role === "recruiter" || input.role === "hr_manager") && input.companyId) {
    const { error: recruiterError } = await ctx.supabase.from("recruiters").upsert(
      {
        id: newUserId,
        company_id: input.companyId,
        department: input.department?.trim() || null,
      },
      { onConflict: "id" }
    );
    if (recruiterError) console.error("createUserAction: recruiters upsert failed", recruiterError);
  }

  // 4. Audit
  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_created",
    entityType: "profile",
    entityId: newUserId,
    metadata: { email: input.email, role: input.role, full_name: fullName },
  });

  // 5. Send invitation email if requested (password-reset link acts as the invite).
  if (input.sendInvitation) {
    await ctx.supabase.auth.resetPasswordForEmail(input.email.trim().toLowerCase(), {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });
    await logAuditEvent(ctx.supabase, {
      actorId: ctx.userId,
      action: "user_invitation_sent",
      entityType: "profile",
      entityId: newUserId,
      metadata: { email: input.email },
    });
  }

  revalidatePath("/admin/users");
  return { success: true, data: { userId: newUserId } };
}

// ---------------------------------------------------------------------------
// Suspend / Activate
// ---------------------------------------------------------------------------

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userId === ctx.userId && !active) return { success: false, error: "You can't suspend your own account." };

  const { error } = await ctx.supabase.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: active ? "user_activated" : "user_suspended",
    entityType: "profile",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Lock / Unlock
// ---------------------------------------------------------------------------

export async function lockUserAccount(userId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userId === ctx.userId) return { success: false, error: "You can't lock your own account." };

  const admin = createAdminClient();

  // Ban at the Supabase Auth level (10 years) so JWTs are rejected immediately.
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "87600h",
  });
  if (banError) return { success: false, error: banError.message };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ is_locked: true, locked_at: new Date().toISOString(), is_active: false })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_locked",
    entityType: "profile",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function unlockUserAccount(userId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const admin = createAdminClient();

  const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (unbanError) return { success: false, error: unbanError.message };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ is_locked: false, locked_at: null, is_active: true })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_unlocked",
    entityType: "profile",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Delete (soft)
// ---------------------------------------------------------------------------

export async function softDeleteUser(userId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userId === ctx.userId) return { success: false, error: "You can't delete your own account." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_deleted",
    entityType: "profile",
    entityId: userId,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Password management
// ---------------------------------------------------------------------------

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

export async function forcePasswordResetAction(userId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const { data: profile } = await ctx.supabase.from("profiles").select("email").eq("id", userId).single();
  if (!profile) return { success: false, error: "User not found." };

  // Mark flag so the app can gate next login, and send reset email immediately.
  await ctx.supabase.from("profiles").update({ force_password_reset: true }).eq("id", userId);

  const { error } = await ctx.supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "user_force_password_reset",
    entityType: "profile",
    entityId: userId,
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function resendInvitationAction(userId: string): Promise<ActionResult> {
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
    action: "user_invitation_sent",
    entityType: "profile",
    entityId: userId,
    metadata: { email: profile.email },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Edit user (profile + optional company)
// ---------------------------------------------------------------------------

export async function updateUserDetails(
  userId: string,
  input: { fullName: string; phone?: string; department?: string; companyId?: string | null }
): Promise<ActionResult> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (!input.fullName.trim()) return { success: false, error: "Full name is required." };

  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      department: input.department?.trim() || null,
      company_id: input.companyId ?? undefined,
    })
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

// ---------------------------------------------------------------------------
// Role change
// ---------------------------------------------------------------------------

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
    return { success: false, error: "Candidate conversion is not supported from this panel." };
  }

  const { error } = await ctx.supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) return { success: false, error: error.message };

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

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

export async function bulkSetUsersActiveAction(userIds: string[], active: boolean): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userIds.length === 0) return { success: false, error: "No users selected." };

  // Prevent the calling admin from being in the bulk disable list.
  const safeIds = active ? userIds : userIds.filter((id) => id !== ctx.userId);

  const { error, count } = await ctx.supabase
    .from("profiles")
    .update({ is_active: active })
    .in("id", safeIds);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: active ? "bulk_users_activated" : "bulk_users_suspended",
    entityType: "profile",
    metadata: { user_ids: safeIds, count: safeIds.length },
  });

  revalidatePath("/admin/users");
  return { success: true, data: { count: count ?? safeIds.length } };
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { success: false, error: "Unauthorized." };
  if (userIds.length === 0) return { success: false, error: "No users selected." };

  const safeIds = userIds.filter((id) => id !== ctx.userId);

  const { error, count } = await ctx.supabase
    .from("profiles")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .in("id", safeIds);
  if (error) return { success: false, error: error.message };

  await logAuditEvent(ctx.supabase, {
    actorId: ctx.userId,
    action: "bulk_users_deleted",
    entityType: "profile",
    metadata: { user_ids: safeIds, count: safeIds.length },
  });

  revalidatePath("/admin/users");
  return { success: true, data: { count: count ?? safeIds.length } };
}
