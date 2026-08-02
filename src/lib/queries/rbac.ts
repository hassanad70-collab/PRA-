import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface PlatformRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformPermission {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
}

export type PermissionsByCategory = Record<string, PlatformPermission[]>;

export async function getPlatformRoles(): Promise<PlatformRole[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roles")
    .select("*")
    .order("sort_order")
    .order("display_name");
  return (data ?? []) as PlatformRole[];
}

export async function getPlatformRole(roleId: string): Promise<PlatformRole | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("roles").select("*").eq("id", roleId).single();
  return (data as PlatformRole | null) ?? null;
}

export async function getPlatformPermissions(): Promise<PlatformPermission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("permissions")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");
  return (data ?? []) as PlatformPermission[];
}

export async function getRolePermissionIds(roleId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("permission_id")
    .eq("role_id", roleId);
  return new Set((data ?? []).map((r) => r.permission_id as string));
}

export interface UserRoleAssignment {
  id: string;
  user_id: string;
  role_id: string;
  company_id: string | null;
  assigned_at: string;
  expires_at: string | null;
  role: PlatformRole;
  company: { id: string; name: string } | null;
}

export async function getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("*, role:roles(*), company:companies(id, name)")
    .eq("user_id", userId)
    .order("assigned_at", { ascending: false });
  return (data ?? []) as unknown as UserRoleAssignment[];
}

export async function getRoleUserCount(roleId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);
  return count ?? 0;
}

export async function getRolePermissionCount(roleId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("role_permissions")
    .select("permission_id", { count: "exact", head: true })
    .eq("role_id", roleId);
  return count ?? 0;
}

export function groupPermissionsByCategory(permissions: PlatformPermission[]): PermissionsByCategory {
  return permissions.reduce<PermissionsByCategory>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});
}

export interface RoleWithCounts extends PlatformRole {
  permission_count: number;
  user_count: number;
}

export async function getPlatformRolesWithCounts(): Promise<RoleWithCounts[]> {
  const supabase = await createClient();

  const [rolesResult, permCountResult, userCountResult] = await Promise.all([
    supabase.from("roles").select("*").order("sort_order").order("display_name"),
    supabase.from("role_permissions").select("role_id"),
    supabase.from("user_roles").select("role_id"),
  ]);

  const roles = (rolesResult.data ?? []) as PlatformRole[];

  const permCounts = new Map<string, number>();
  for (const row of permCountResult.data ?? []) {
    permCounts.set(row.role_id as string, (permCounts.get(row.role_id as string) ?? 0) + 1);
  }

  const userCounts = new Map<string, number>();
  for (const row of userCountResult.data ?? []) {
    userCounts.set(row.role_id as string, (userCounts.get(row.role_id as string) ?? 0) + 1);
  }

  return roles.map((r) => ({
    ...r,
    permission_count: permCounts.get(r.id) ?? 0,
    user_count: userCounts.get(r.id) ?? 0,
  }));
}
