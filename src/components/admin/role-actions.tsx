"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteRole, duplicateRole } from "@/actions/admin-rbac";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  roleId: string;
  roleName: string;
  displayName: string;
  isSystem: boolean;
}

export function RoleActions({ roleId, roleName, displayName, isSystem }: Props) {
  const router = useRouter();
  const [dupOpen, setDupOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleDuplicate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await duplicateRole(roleId, fd);
      if (!result.success) {
        toast.error(result.error ?? "Failed to duplicate role.");
        return;
      }
      toast.success("Role duplicated.");
      setDupOpen(false);
      if (result.roleId) router.push(`/admin/roles/${result.roleId}`);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRole(roleId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete role.");
        return;
      }
      toast.success("Role deleted.");
      setDelOpen(false);
      router.push("/admin/roles");
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/admin/roles/${roleId}`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit permissions
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDupOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </DropdownMenuItem>
          {!isSystem && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDelOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Duplicate dialog */}
      <Dialog open={dupOpen} onOpenChange={setDupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{`Duplicate "${displayName}"`}</DialogTitle>
            <DialogDescription>
              Creates a new role with the same permissions as this one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDuplicate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>New role name (slug)</Label>
              <Input
                name="name"
                placeholder={`${roleName}_copy`}
                defaultValue={`${roleName}_copy`}
                required
                pattern="[a-z][a-z0-9_]*"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input
                name="displayName"
                placeholder={`Copy of ${displayName}`}
                defaultValue={`Copy of ${displayName}`}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDupOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Duplicating…" : "Duplicate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{`Delete "${displayName}"?`}</DialogTitle>
            <DialogDescription>
              This cannot be undone. The role will be permanently removed and any users assigned to
              it will lose those permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
