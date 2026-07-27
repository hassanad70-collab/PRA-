"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeMemberRole, removeMember } from "@/actions/team";
import { initials } from "@/lib/utils";
import type { RecruiterRole } from "@/types/database";

type AssignableRole = Exclude<RecruiterRole, "owner">;
const ROLES: AssignableRole[] = ["admin", "recruiter", "viewer"];

interface Member {
  id: string;
  role: RecruiterRole;
  job_title: string | null;
  profile: { full_name: string; email: string } | null;
}

export function TeamMemberList({
  members,
  currentUserId,
  canChangeRoles,
  canRemove,
}: {
  members: Member[];
  currentUserId: string;
  canChangeRoles: boolean;
  canRemove: boolean;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const router = useRouter();

  const handleRoleChange = (memberId: string, role: AssignableRole) => {
    setPendingId(memberId);
    changeMemberRole(memberId, role)
      .then((result) => {
        if (result.success) {
          toast.success("Role updated");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to update role");
        }
      })
      .finally(() => setPendingId(null));
  };

  const handleRemove = (memberId: string) => {
    setPendingId(memberId);
    removeMember(memberId)
      .then((result) => {
        if (result.success) {
          toast.success("Member removed");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to remove member");
        }
      })
      .finally(() => setPendingId(null));
  };

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const isSelf = member.id === currentUserId;
        const isOwner = member.role === "owner";
        const isPending = pendingId === member.id;

        return (
          <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {initials(member.profile?.full_name ?? "?")}
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium">
                  {member.profile?.full_name}
                  {isSelf && (
                    <Badge variant="outline" className="text-xs font-normal">
                      You
                    </Badge>
                  )}
                </p>
                <p className="truncate text-sm text-muted-foreground">{member.profile?.email}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {canChangeRoles && !isOwner && !isSelf ? (
                <Select value={member.role} disabled={isPending} onValueChange={(v) => handleRoleChange(member.id, v as AssignableRole)}>
                  <SelectTrigger className="w-32 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {member.role}
                </Badge>
              )}

              {canRemove && !isOwner && !isSelf && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Remove member"
                  disabled={isPending}
                  onClick={() => handleRemove(member.id)}
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
