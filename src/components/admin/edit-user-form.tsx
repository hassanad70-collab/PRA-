"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateUserDetails } from "@/actions/admin-users";

interface Company { id: string; name: string }

interface EditUserFormProps {
  userId: string;
  fullName: string;
  phone: string | null;
  department?: string | null;
  companyId?: string | null;
  companies?: Company[];
}

export function EditUserForm({ userId, fullName, phone, department, companyId, companies = [] }: EditUserFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [selectedCompany, setSelectedCompany] = React.useState(companyId ?? "");

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateUserDetails(userId, {
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        department: String(formData.get("department") ?? ""),
        companyId: selectedCompany || null,
      });
      if (result.success) {
        toast.success("User updated");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update user");
      }
    });
  };

  return (
    <form action={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" defaultValue={fullName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder="+1 555 000 0000" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input id="department" name="department" defaultValue={department ?? ""} placeholder="Engineering, Sales…" />
      </div>
      {companies.length > 0 && (
        <div className="space-y-2">
          <Label>Company</Label>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
