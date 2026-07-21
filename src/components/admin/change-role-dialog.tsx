"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeUserRole } from "@/actions/admin-users";
import type { UserRole } from "@/types/database";

const ASSIGNABLE_ROLES: UserRole[] = ["recruiter", "hr_manager", "super_admin"];

export function ChangeRoleDialog({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<UserRole>(currentRole);
  const [isPending, startTransition] = React.useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await changeUserRole(userId, role);
      if (result.success) {
        toast.success("Role updated");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update role");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Change role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Only recruiter, hr_manager, and super_admin can be assigned here — candidates aren&apos;t supported by this action.
          </DialogDescription>
        </DialogHeader>
        <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r} className="capitalize">
                {r.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="gradient" onClick={onConfirm} disabled={isPending || role === currentRole}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
