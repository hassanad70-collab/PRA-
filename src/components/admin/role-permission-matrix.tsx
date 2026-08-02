"use client";

import * as React from "react";
import { toast } from "sonner";

import { setRolePermission } from "@/actions/admin-rbac";
import type { PermissionsByCategory } from "@/lib/queries/rbac";

const CATEGORY_LABELS: Record<string, string> = {
  platform:        "Platform",
  companies:       "Companies",
  users:           "Users",
  roles:           "Roles & Permissions",
  billing:         "Billing",
  ai:              "AI",
  analytics:       "Analytics",
  jobs:            "Jobs",
  applications:    "Applications",
  candidates:      "Candidates",
  interviews:      "Interviews",
  settings:        "Settings",
  audit_logs:      "Audit Logs",
  feature_flags:   "Feature Flags",
  email_templates: "Email Templates",
  notifications:   "Notifications",
  queue:           "Job Queue",
};

interface Props {
  roleId: string;
  grouped: PermissionsByCategory;
  grantedIds: Set<string>;
  isSystem: boolean;
}

export function RolePermissionMatrix({ roleId, grouped, grantedIds, isSystem }: Props) {
  const [pending, startTransition] = React.useTransition();
  const [local, setLocal] = React.useState<Set<string>>(() => new Set(grantedIds));

  const toggle = (permissionId: string) => {
    if (isSystem || pending) return;
    const enabled = !local.has(permissionId);
    const next = new Set(local);
    if (enabled) { next.add(permissionId); } else { next.delete(permissionId); }
    setLocal(next);

    startTransition(async () => {
      const result = await setRolePermission(roleId, permissionId, enabled);
      if (!result.success) {
        // revert optimistic update
        setLocal(new Set(local));
        toast.error(result.error ?? "Failed to update permission.");
      }
    });
  };

  const categories = Object.keys(grouped).sort((a, b) => {
    const order = ["platform","companies","users","roles","billing","ai","analytics",
                   "jobs","applications","candidates","interviews","settings",
                   "audit_logs","feature_flags","email_templates","notifications","queue"];
    return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99);
  });

  return (
    <div className="space-y-4">
      {isSystem && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
          System role — permissions are fixed and cannot be modified.
        </div>
      )}

      {categories.map((cat) => {
        const perms = grouped[cat];
        const grantedCount = perms.filter((p) => local.has(p.id)).length;

        return (
          <div key={cat} className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="text-sm font-semibold">
                {CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ")}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {grantedCount} / {perms.length}
              </span>
            </div>

            <div className="divide-y divide-border">
              {perms.map((perm) => {
                const checked = local.has(perm.id);
                return (
                  <label
                    key={perm.id}
                    className={[
                      "flex items-start gap-3 px-4 py-3 transition-colors",
                      isSystem ? "cursor-default" : "cursor-pointer hover:bg-muted/30",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(perm.id)}
                      disabled={isSystem || pending}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-input accent-primary disabled:cursor-default disabled:opacity-50"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{perm.name}</p>
                      {perm.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{perm.description}</p>
                      )}
                      <code className="mt-0.5 block text-[10px] text-muted-foreground/50">
                        {perm.slug}
                      </code>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
