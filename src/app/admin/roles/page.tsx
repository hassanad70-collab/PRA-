import Link from "next/link";
import {
  Award, Briefcase, Building2, GraduationCap, Globe, Key, Lock, MessageSquare,
  Network, Pencil, Shield, ShieldAlert, ShieldCheck, Star, Target, Users, UserCog,
  Zap, Settings, Eye, ClipboardList,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreateRoleDialog } from "@/components/admin/create-role-dialog";
import { RoleActions } from "@/components/admin/role-actions";
import { getPlatformRolesWithCounts } from "@/lib/queries/rbac";

const ICON_MAP: Record<string, React.ElementType> = {
  Shield, ShieldCheck, ShieldAlert,
  Building2, UserCog, Users, Briefcase, MessageSquare,
  Network, GraduationCap, Award, Star, Settings, Globe, Lock, Key,
  Zap, Target, Eye, ClipboardList, Pencil,
};

function RoleIcon({ name, color }: { name: string; color: string }) {
  const Icon = ICON_MAP[name] ?? Shield;
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}20`, color }}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export default async function AdminRolesPage() {
  const roles = await getPlatformRolesWithCounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define platform roles and control exactly which permissions each role holds.
            Changes take effect immediately without redeployment.
          </p>
        </div>
        <CreateRoleDialog />
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{roles.length}</strong> roles</span>
        <span><strong className="text-foreground">{roles.filter((r) => r.is_system).length}</strong> system</span>
        <span><strong className="text-foreground">{roles.filter((r) => r.is_active).length}</strong> active</span>
        <span><strong className="text-foreground">{roles.reduce((s, r) => s + r.user_count, 0)}</strong> total assignments</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card
            key={role.id}
            className="group relative overflow-hidden transition-shadow hover:shadow-md"
            style={{ borderLeftColor: role.color, borderLeftWidth: 3 }}
          >
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <RoleIcon name={role.icon} color={role.color} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/admin/roles/${role.id}`}
                        className="text-sm font-semibold leading-snug hover:underline"
                      >
                        {role.display_name}
                      </Link>
                      {role.is_system && (
                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                          System
                        </Badge>
                      )}
                      {!role.is_active && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <code className="mt-0.5 block text-[11px] text-muted-foreground/60">
                      {role.name}
                    </code>
                  </div>
                </div>
                <RoleActions
                  roleId={role.id}
                  roleName={role.name}
                  displayName={role.display_name}
                  isSystem={role.is_system}
                />
              </div>

              {role.description && (
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                  {role.description}
                </p>
              )}

              <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums">{role.permission_count}</p>
                  <p className="text-[10px] text-muted-foreground">Permissions</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums">{role.user_count}</p>
                  <p className="text-[10px] text-muted-foreground">Assigned users</p>
                </div>
                <div className="ml-auto">
                  <Link
                    href={`/admin/roles/${role.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Edit permissions →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No roles defined yet. Run migration 0041 to seed the platform defaults.
          </p>
        </div>
      )}
    </div>
  );
}
