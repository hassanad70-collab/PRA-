"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInvite } from "@/actions/team";
import { formatDate } from "@/lib/utils";
import type { RecruiterInvite } from "@/types/database";

export function PendingInviteList({ invites }: { invites: RecruiterInvite[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const router = useRouter();

  const handleRevoke = (inviteId: string) => {
    setPendingId(inviteId);
    revokeInvite(inviteId)
      .then((result) => {
        if (result.success) {
          toast.success("Invite revoked");
          router.refresh();
        } else {
          toast.error(result.error ?? "Failed to revoke invite");
        }
      })
      .finally(() => setPendingId(null));
  };

  return (
    <div className="space-y-2">
      {invites.map((invite) => (
        <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{invite.email}</p>
            <p className="text-xs text-muted-foreground">Expires {formatDate(invite.expires_at)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {invite.role}
            </Badge>
            <Button variant="ghost" size="sm" disabled={pendingId === invite.id} onClick={() => handleRevoke(invite.id)}>
              {pendingId === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
