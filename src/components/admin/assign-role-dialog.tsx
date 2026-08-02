"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { assignRoleToUser, removeRoleFromUser } from "@/actions/admin-rbac";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { PlatformRole } from "@/lib/queries/rbac";
import type { UserRoleAssignment } from "@/lib/queries/rbac";

interface AssignProps {
  userId: string;
  availableRoles: PlatformRole[];
  availableCompanies: { id: string; name: string }[];
}

export function AssignRoleDialog({ userId, availableRoles, availableCompanies }: AssignProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const roleId = fd.get("roleId") as string;
    const companyId = (fd.get("companyId") as string) || undefined;

    startTransition(async () => {
      const result = await assignRoleToUser(userId, roleId, companyId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to assign role.");
        return;
      }
      toast.success("Role assigned.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Assign Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Role</DialogTitle>
          <DialogDescription>
            Grant this user an RBAC role. For company-scoped roles, select a company.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ar-role">Role</Label>
            <select
              id="ar-role"
              name="roleId"
              required
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">Select a role…</option>
              {availableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-company">
              Company <span className="text-muted-foreground">(optional — leave blank for platform-level)</span>
            </Label>
            <select
              id="ar-company"
              name="companyId"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="">Platform-level</option>
              {availableCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Remove assignment button (inline in the assignments table)
// ─────────────────────────────────────────────────────────────

interface RemoveProps {
  assignment: UserRoleAssignment;
}

export function RemoveRoleButton({ assignment }: RemoveProps) {
  const [pending, startTransition] = React.useTransition();

  function handleRemove() {
    startTransition(async () => {
      const result = await removeRoleFromUser(assignment.id);
      if (!result.success) toast.error(result.error ?? "Failed to remove role.");
      else toast.success("Role removed.");
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={pending}
      className="h-7 px-2 text-muted-foreground hover:text-destructive"
    >
      {pending ? "…" : "Remove"}
    </Button>
  );
}
