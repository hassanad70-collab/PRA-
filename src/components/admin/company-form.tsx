"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCompany, updateCompany } from "@/actions/admin-companies";
import type { Company } from "@/types/database";

export function CompanyForm({ company }: { company?: Company }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = company ? await updateCompany(company.id, formData) : await createCompany(formData);
      if (result.success) {
        toast.success(company ? "Company updated" : "Company created");
        router.push(`/admin/companies/${result.companyId ?? company?.id}`);
        router.refresh();
      } else {
        toast.error(result.error ?? "Please check the form for errors");
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Company name</Label>
          <Input id="name" name="name" required defaultValue={company?.name} placeholder="Acme Corp" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={company?.website ?? ""} placeholder="https://acme.com" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" defaultValue={company?.industry ?? ""} placeholder="Software" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companySize">Company size</Label>
          <Input id="companySize" name="companySize" defaultValue={company?.company_size ?? ""} placeholder="51-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="foundedYear">Founded year</Label>
          <Input id="foundedYear" name="foundedYear" type="number" defaultValue={company?.founded_year ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headquarters">Headquarters</Label>
        <Input id="headquarters" name="headquarters" defaultValue={company?.headquarters ?? ""} placeholder="San Francisco, CA" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={company?.description ?? ""} />
      </div>

      <Button type="submit" variant="gradient" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {company ? "Save changes" : "Create company"}
      </Button>
    </form>
  );
}
