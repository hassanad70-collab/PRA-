"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KeyRound, Lock, LockOpen, MailCheck, MoreVertical,
  Power, PowerOff, RotateCcw, Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminResetUserPassword,
  forcePasswordResetAction,
  lockUserAccount,
  resendInvitationAction,
  setUserActive,
  softDeleteUser,
  unlockUserAccount,
} from "@/actions/admin-users";

interface UserRowActionsProps {
  userId: string;
  isActive: boolean;
  isLocked: boolean;
  deletedAt: string | null;
}

export function UserRowActions({ userId, isActive, isLocked, deletedAt }: UserRowActionsProps) {
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

  const isDeleted = !!deletedAt;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={isPending} aria-label="User actions" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Account Status</DropdownMenuLabel>

        {!isDeleted && !isLocked && isActive && (
          <DropdownMenuItem onClick={() => run(() => setUserActive(userId, false), "User suspended")}>
            <PowerOff className="h-4 w-4" /> Suspend
          </DropdownMenuItem>
        )}
        {!isDeleted && !isLocked && !isActive && (
          <DropdownMenuItem onClick={() => run(() => setUserActive(userId, true), "User activated")}>
            <Power className="h-4 w-4" /> Activate
          </DropdownMenuItem>
        )}
        {!isDeleted && !isLocked && (
          <DropdownMenuItem
            onClick={() => run(() => lockUserAccount(userId), "Account locked")}
            className="text-destructive focus:text-destructive"
          >
            <Lock className="h-4 w-4" /> Lock account
          </DropdownMenuItem>
        )}
        {!isDeleted && isLocked && (
          <DropdownMenuItem onClick={() => run(() => unlockUserAccount(userId), "Account unlocked")}>
            <LockOpen className="h-4 w-4" /> Unlock account
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Password</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => run(() => adminResetUserPassword(userId), "Password reset email sent")}>
          <KeyRound className="h-4 w-4" /> Send password reset
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run(() => forcePasswordResetAction(userId), "Force reset initiated")}>
          <RotateCcw className="h-4 w-4" /> Force password reset
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Invitation</DropdownMenuLabel>

        <DropdownMenuItem onClick={() => run(() => resendInvitationAction(userId), "Invitation sent")}>
          <MailCheck className="h-4 w-4" /> Send invitation again
        </DropdownMenuItem>

        {!isDeleted && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => run(() => softDeleteUser(userId), "User deleted")}
            >
              <Trash2 className="h-4 w-4" /> Delete user
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
