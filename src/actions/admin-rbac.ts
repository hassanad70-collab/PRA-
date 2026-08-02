"use server";

import { revalidatePath } from "next/cache";

import { logAuditEvent } from "@/lib/audit";
import { requireSuperAdminContext } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

// ─────────────────────────────────────────────────────────────
// ROLE CRUD
// ─────────────────────────────────────────────────────────────

export async function createRole(formData: FormData): Promise<ActionResult & { roleId?: string }> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const raw = (formData.get("name") as string | null)?.trim() ?? "";
  const name = raw.toLowerCase().replace(/\s+/g, "_");
  const displayName = (formData.get("displayName") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const color = (formData.get("color") as string | null)?.trim() || "#6366f1";
  const icon = (formData.get("icon") as string | null)?.trim() || "Shield";

  if (!name || !displayName)
    return { success: false, error: "Name and display name are required." };
  if (!/^[a-z][a-z0-9_]*$/.test(name))
    return { success: false, error: "Role name must start with a letter and contain only lowercase letters, numbers, and underscores." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roles")
    .insert({ name, display_name: displayName, description, color, icon })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { success: false, error: `A role named "${name}" already exists.` };
    return { success: false, error: error.message };
  }

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: "role_created",
    entityType: "role",
    entityId: data.id,
    metadata: { name, display_name: displayName },
  });

  revalidatePath("/admin/roles");
  return { success: true, roleId: data.id };
}

export async function updateRole(roleId: string, formData: FormData): Promise<ActionResult> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("roles")
    .select("is_system")
    .eq("id", roleId)
    .single();
  if (!existing) return { success: false, error: "Role not found." };

  const displayName = (formData.get("displayName") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  const color = (formData.get("color") as string | null)?.trim() || "#6366f1";
  const icon = (formData.get("icon") as string | null)?.trim() || "Shield";

  if (!displayName) return { success: false, error: "Display name is required." };

  const patch: Record<string, unknown> = { display_name: displayName, description, color, icon };
  // system roles stay active regardless of the form value
  if (!existing.is_system) {
    patch.is_active = formData.get("isActive") !== "false";
  }

  const { error } = await admin.from("roles").update(patch).eq("id", roleId);
  if (error) return { success: false, error: error.message };

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: "role_updated",
    entityType: "role",
    entityId: roleId,
    metadata: { display_name: displayName },
  });

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}`);
  return { success: true };
}

export async function deleteRole(roleId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const admin = createAdminClient();
  const { data: role } = await admin
    .from("roles")
    .select("is_system, name, display_name")
    .eq("id", roleId)
    .single();
  if (!role) return { success: false, error: "Role not found." };
  if (role.is_system) return { success: false, error: "System roles cannot be deleted." };

  const { count } = await admin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);
  if (count && count > 0) {
    return {
      success: false,
      error: `This role is assigned to ${count} user${count === 1 ? "" : "s"}. Remove those assignments before deleting.`,
    };
  }

  const { error } = await admin.from("roles").delete().eq("id", roleId);
  if (error) return { success: false, error: error.message };

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: "role_deleted",
    entityType: "role",
    entityId: roleId,
    metadata: { name: role.name, display_name: role.display_name },
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function duplicateRole(
  sourceRoleId: string,
  formData: FormData
): Promise<ActionResult & { roleId?: string }> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const raw = (formData.get("name") as string | null)?.trim() ?? "";
  const name = raw.toLowerCase().replace(/\s+/g, "_");
  const displayName = (formData.get("displayName") as string | null)?.trim() ?? "";

  if (!name || !displayName)
    return { success: false, error: "Name and display name are required." };
  if (!/^[a-z][a-z0-9_]*$/.test(name))
    return { success: false, error: "Role name must be lowercase letters, numbers, and underscores." };

  const admin = createAdminClient();
  const { data: source } = await admin
    .from("roles")
    .select("color, icon, description, display_name")
    .eq("id", sourceRoleId)
    .single();
  if (!source) return { success: false, error: "Source role not found." };

  const { data: newRole, error: createErr } = await admin
    .from("roles")
    .insert({
      name,
      display_name: displayName,
      description: source.description
        ? `Copy of ${source.display_name}: ${source.description}`
        : `Copy of ${source.display_name}`,
      is_system: false,
      color: source.color,
      icon: source.icon,
    })
    .select("id")
    .single();

  if (createErr) {
    if (createErr.code === "23505") return { success: false, error: `A role named "${name}" already exists.` };
    return { success: false, error: createErr.message };
  }

  const { data: sourcePerms } = await admin
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", sourceRoleId);

  if (sourcePerms && sourcePerms.length > 0) {
    await admin.from("role_permissions").insert(
      sourcePerms.map((sp) => ({
        role_id: newRole.id,
        permission_id: sp.permission_id as string,
        granted_by: ctx.userId,
      }))
    );
  }

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: "role_duplicated",
    entityType: "role",
    entityId: newRole.id,
    metadata: { source_role_id: sourceRoleId, name, display_name: displayName },
  });

  revalidatePath("/admin/roles");
  return { success: true, roleId: newRole.id };
}

// ─────────────────────────────────────────────────────────────
// PERMISSION ASSIGNMENT
// ─────────────────────────────────────────────────────────────

export async function setRolePermission(
  roleId: string,
  permissionId: string,
  enabled: boolean
): Promise<ActionResult> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const admin = createAdminClient();

  if (enabled) {
    const { error } = await admin.from("role_permissions").upsert({
      role_id: roleId,
      permission_id: permissionId,
      granted_by: ctx.userId,
    });
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await admin
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) return { success: false, error: error.message };
  }

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: enabled ? "permission_granted" : "permission_revoked",
    entityType: "role",
    entityId: roleId,
    metadata: { permission_id: permissionId },
  });

  revalidatePath(`/admin/roles/${roleId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────
// USER ROLE ASSIGNMENTS
// ─────────────────────────────────────────────────────────────

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  companyId?: string
): Promise<ActionResult> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const admin = createAdminClient();
  const { error } = await admin.from("user_roles").insert({
    user_id: userId,
    role_id: roleId,
    company_id: companyId ?? null,
    assigned_by: ctx.userId,
  });

  if (error) {
    if (error.code === "23505")
      return { success: false, error: "This role is already assigned to the user." };
    return { success: false, error: error.message };
  }

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: "role_assigned",
    entityType: "profile",
    entityId: userId,
    metadata: { role_id: roleId, company_id: companyId ?? null },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function removeRoleFromUser(assignmentId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdminContext();
  if (!ctx) return { success: false, error: "Unauthorized." };

  const admin = createAdminClient();
  const { data: assignment } = await admin
    .from("user_roles")
    .select("user_id, role:roles(name)")
    .eq("id", assignmentId)
    .single();

  if (!assignment) return { success: false, error: "Assignment not found." };

  const roleName = (assignment.role as unknown as { name: string } | null)?.name;
  if (assignment.user_id === ctx.userId && roleName === "super_admin") {
    return { success: false, error: "You cannot remove your own super_admin role." };
  }

  const { error } = await admin.from("user_roles").delete().eq("id", assignmentId);
  if (error) return { success: false, error: error.message };

  const supabase = await createClient();
  await logAuditEvent(supabase, {
    actorId: ctx.userId,
    action: "role_removed",
    entityType: "profile",
    entityId: assignment.user_id,
    metadata: { assignment_id: assignmentId },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${assignment.user_id}`);
  return { success: true };
}
