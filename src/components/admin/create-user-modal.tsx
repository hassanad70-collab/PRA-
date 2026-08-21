"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { createUserAction } from "@/actions/admin-users";
import type { UserRole } from "@/types/database";

interface Company {
  id: string;
  name: string;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "candidate", label: "Candidate" },
  { value: "recruiter", label: "Recruiter" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "super_admin", label: "Super Admin" },
];

interface CreateUserModalProps {
  companies: Company[];
}

export function CreateUserModal({ companies }: CreateUserModalProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [companyId, setCompanyId] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("recruiter");
  const [status, setStatus] = React.useState<"active" | "disabled">("active");
  const [temporaryPassword, setTemporaryPassword] = React.useState("");
  const [sendInvitation, setSendInvitation] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setCompanyId(""); setDepartment(""); setRole("recruiter");
    setStatus("active"); setTemporaryPassword(""); setSendInvitation(true); setError(null);
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await createUserAction({
        firstName, lastName, email, phone, companyId: companyId || undefined,
        department, role, status, temporaryPassword, sendInvitation,
      });
      if (result.success) {
        toast.success(`User ${firstName} ${lastName} created successfully`);
        setOpen(false);
        reset();
        router.refresh();
      } else {
        setError(result.error ?? "Failed to create user.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create new user</DialogTitle>
          <DialogDescription>
            Creates a Supabase Auth account, sets up their profile, and optionally sends an invitation email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cu-first-name">First name *</Label>
              <Input id="cu-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-last-name">Last name *</Label>
              <Input id="cu-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email address *</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-phone">Phone number</Label>
            <Input id="cu-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
          </div>

          {/* Role + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "disabled")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-dept">Department</Label>
            <Input id="cu-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Engineering, Sales…" />
          </div>

          {/* Temporary Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cu-pw">Temporary password *</Label>
            <Input
              id="cu-pw"
              type="password"
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              placeholder="Min 8 characters"
            />
            <p className="text-xs text-muted-foreground">The user will be prompted to set their own password after first sign-in.</p>
          </div>

          {/* Send invitation */}
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={sendInvitation}
              onChange={(e) => setSendInvitation(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Send invitation email</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sends a &quot;set your password&quot; link so the user can access their account immediately.
              </p>
            </div>
          </label>

          {/* Security note */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
            <PlusCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              User creation is fully server-side via the Supabase Admin API. The service role key never reaches the browser.
              All actions are logged to the audit trail.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !firstName.trim() || !lastName.trim() || !email.trim() || temporaryPassword.length < 8}
          >
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact role badge used in the users table
export function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, string> = {
    super_admin: "bg-pra-danger/10 text-pra-danger",
    hr_manager: "bg-pra-cyan/10 text-pra-cyan",
    recruiter: "bg-pra-primary/10 text-pra-primary",
    candidate: "bg-pra-border text-pra-text-secondary",
  };
  const cls = variants[role] ?? variants.candidate;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
      {role.replace("_", " ")}
    </span>
  );
}

// Lock badge
export function LockBadge() {
  return (
    <Badge variant="destructive" className="text-[10px] px-1.5 h-4">Locked</Badge>
  );
}
