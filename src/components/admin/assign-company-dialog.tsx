"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignRecruiterCompany } from "@/actions/admin-recruiters";

export function AssignCompanyDialog({
  recruiterId,
  currentCompanyId,
  companies,
}: {
  recruiterId: string;
  currentCompanyId: string;
  companies: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [companyId, setCompanyId] = React.useState(currentCompanyId);
  const [isPending, startTransition] = React.useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      const result = await assignRecruiterCompany(recruiterId, companyId);
      if (result.success) {
        toast.success("Company reassigned");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to reassign company");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Building2 className="h-3.5 w-3.5" /> Reassign
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign company</DialogTitle>
        </DialogHeader>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="gradient" onClick={onConfirm} disabled={isPending || companyId === currentCompanyId}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
