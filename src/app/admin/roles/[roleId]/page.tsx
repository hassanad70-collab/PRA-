import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Award, Briefcase, Building2, ClipboardList, Eye, GraduationCap,
  Globe, Key, Lock, MessageSquare, Network, Pencil, Settings, Shield, ShieldAlert,
  ShieldCheck, Star, Target, UserCog, Users, Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RolePermissionMatrix } from "@/components/admin/role-permission-matrix";
import {
  getPlatformPermissions,
  getPlatformRole,
  getRolePermissionCount,
  getRolePermissionIds,
  getRoleUserCount,
  groupPermissionsByCategory,
} from "@/lib/queries/rbac";

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, ShieldCheck, ShieldAlert,
  Building2, UserCog, Users, Briefcase, MessageSquare,
  Network, GraduationCap, Award, Star, Settings, Globe, Lock, Key,
  Zap, Target, Eye, ClipboardList, Pencil,
};

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;

  const [role, allPermissions, grantedIds, userCount, permCount] = await Promise.all([
    getPlatformRole(roleId),
    getPlatformPermissions(),
    getRolePermissionIds(roleId),
    getRoleUserCount(roleId),
    getRolePermissionCount(roleId),
  ]);

  if (!role) notFound();

  const grouped = groupPermissionsByCategory(allPermissions);
  const Icon = ICON_MAP[role.icon] ?? Shield;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/admin/roles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roles
      </Link>

      {/* Role header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${role.color}20`, color: role.color }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{role.display_name}</h1>
              {role.is_system && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">System</Badge>
              )}
              {!role.is_active && (
                <Badge variant="outline" className="h-5 px-2 text-xs text-muted-foreground">
                  Inactive
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <code className="text-xs">{role.name}</code>
              {role.description && (
                <>
                  <span>·</span>
                  <span className="text-xs">{role.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 rounded-lg border border-border bg-card px-5 py-3">
          <div className="text-center">
            <p className="text-xl font-bold tabular-nums">{permCount}</p>
            <p className="text-[11px] text-muted-foreground">Permissions</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-xl font-bold tabular-nums">{userCount}</p>
            <p className="text-[11px] text-muted-foreground">Users assigned</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-center">
            <p className="text-xl font-bold tabular-nums">{allPermissions.length}</p>
            <p className="text-[11px] text-muted-foreground">Total available</p>
          </div>
        </div>
      </div>

      {/* Two-column layout: permission matrix + info sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Permission matrix */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Permission Matrix
            </h2>
            {!role.is_system && (
              <p className="text-xs text-muted-foreground">
                Changes save automatically on toggle.
              </p>
            )}
          </div>
          <RolePermissionMatrix
            roleId={roleId}
            grouped={grouped}
            grantedIds={grantedIds}
            isSystem={role.is_system}
          />
        </div>

        {/* Info sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Role Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Display name</p>
                <p className="mt-0.5 font-medium">{role.display_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Slug</p>
                <code className="mt-0.5 block text-xs">{role.name}</code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="mt-0.5">{role.is_system ? "System (protected)" : "Custom"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-0.5">{role.is_active ? "Active" : "Inactive"}</p>
              </div>
              {role.description && (
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="mt-0.5 text-xs">{role.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="mt-0.5 text-xs">
                  {new Date(role.created_at).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Permission changes apply to all users holding this role immediately — no
                cache flush or redeployment needed.
              </p>
              <p>
                System roles (<code className="text-xs">super_admin</code>,{" "}
                <code className="text-xs">company_admin</code>,{" "}
                <code className="text-xs">candidate</code>) are seeded automatically and
                cannot be deleted.
              </p>
              <p>
                To assign this role to a user, go to{" "}
                <Link href="/admin/users" className="text-primary hover:underline">
                  Users
                </Link>{" "}
                and use the &quot;Assign Role&quot; button on their profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
