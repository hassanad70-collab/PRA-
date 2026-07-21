"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminResetUserPassword, setUserActive, softDeleteUser } from "@/actions/admin-users";

export function UserRowActions({ userId, isActive, deletedAt }: { userId: string; isActive: boolean; deletedAt: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(result.error ?? "Action failed");
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending} aria-label="User actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!deletedAt && isActive && (
          <DropdownMenuItem onClick={() => run(() => setUserActive(userId, false), "User disabled")}>
            <PowerOff className="h-4 w-4" /> Disable
          </DropdownMenuItem>
        )}
        {!deletedAt && !isActive && (
          <DropdownMenuItem onClick={() => run(() => setUserActive(userId, true), "User enabled")}>
            <Power className="h-4 w-4" /> Enable
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => run(() => adminResetUserPassword(userId), "Password reset email sent")}>
          <KeyRound className="h-4 w-4" /> Send password reset
        </DropdownMenuItem>
        {!deletedAt && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => run(() => softDeleteUser(userId), "User deleted")}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
