"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInvite } from "@/actions/team";
import type { RecruiterInvite, RecruiterRole } from "@/types/database";

export interface PendingInviteListLabels {
  roleLabels: Record<RecruiterRole, string>;
  /** Keyed by invite id -- precomputed server-side since functions can't
   * cross the Server-to-Client Component boundary. */
  expiresLabels: Record<string, string>;
  toastRevoked: string;
  toastRevokeFailed: string;
}

export function PendingInviteList({ invites, labels }: { invites: RecruiterInvite[]; labels: PendingInviteListLabels }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const router = useRouter();

  const handleRevoke = (inviteId: string) => {
    setPendingId(inviteId);
    revokeInvite(inviteId)
      .then((result) => {
        if (result.success) {
          toast.success(labels.toastRevoked);
          router.refresh();
        } else {
          toast.error(result.error ?? labels.toastRevokeFailed);
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
            <p className="text-xs text-muted-foreground">{labels.expiresLabels[invite.id]}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{labels.roleLabels[invite.role]}</Badge>
            <Button variant="ghost" size="sm" disabled={pendingId === invite.id} onClick={() => handleRevoke(invite.id)}>
              {pendingId === invite.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
