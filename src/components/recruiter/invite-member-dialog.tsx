"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Loader2, UserPlus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvite } from "@/actions/team";
import type { RecruiterRole } from "@/types/database";

type InvitableRole = Exclude<RecruiterRole, "owner">;
const ROLES: InvitableRole[] = ["admin", "recruiter", "viewer"];

export interface InviteMemberDialogLabels {
  trigger: string;
  title: string;
  description: string;
  emailLabel: string;
  roleLabel: string;
  roleLabels: Record<RecruiterRole, string>;
  generateInviteLink: string;
  expiresNote: string;
  done: string;
  copy: string;
  toastCopied: string;
  toastFailed: string;
}

export function InviteMemberDialog({ labels }: { labels: InviteMemberDialogLabels }) {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState<InvitableRole>("recruiter");
  const [isPending, startTransition] = React.useTransition();
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const router = useRouter();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await createInvite(formData);
      if (result.success && result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
        router.refresh();
      } else {
        toast.error(result.error ?? labels.toastFailed);
      }
    });
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success(labels.toastCopied);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setInviteUrl(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="gradient">
          <UserPlus className="h-4 w-4" /> {labels.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        {!inviteUrl ? (
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{labels.emailLabel}</Label>
              <Input id="email" name="email" type="email" required placeholder="teammate@company.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">{labels.roleLabel}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as InvitableRole)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {labels.roleLabels[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="role" value={role} />
            </div>
            <DialogFooter>
              <Button type="submit" variant="gradient" disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {labels.generateInviteLink}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <span className="min-w-0 flex-1 truncate">{inviteUrl}</span>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5" /> {labels.copy}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{labels.expiresNote}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                {labels.done}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
