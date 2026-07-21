"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUserDetails } from "@/actions/admin-users";

export function EditUserForm({ userId, fullName, phone }: { userId: string; fullName: string; phone: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateUserDetails(userId, {
        fullName: String(formData.get("fullName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
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
        <Input id="phone" name="phone" defaultValue={phone ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}
