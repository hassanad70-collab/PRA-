"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateBasicInfo } from "@/actions/profile";
import type { Candidate } from "@/types/database";

export function BasicInfoForm({ candidate }: { candidate: Candidate }) {
  const [isPending, startTransition] = React.useTransition();
  const [relocate, setRelocate] = React.useState(candidate.willing_to_relocate);

  const onSubmit = (formData: FormData) => {
    formData.set("willingToRelocate", relocate ? "true" : "false");
    startTransition(async () => {
      const result = await updateBasicInfo(formData);
      if (result.success) toast.success("Profile updated");
      else toast.error(result.error ?? "Failed to update profile");
    });
  };

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="headline">Headline</Label>
          <Input id="headline" name="headline" defaultValue={candidate.headline ?? ""} placeholder="Senior Product Designer" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentPosition">Current position</Label>
          <Input id="currentPosition" name="currentPosition" defaultValue={candidate.current_position ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Professional summary</Label>
        <Textarea id="summary" name="summary" defaultValue={candidate.summary ?? ""} rows={4} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="currentCompany">Current company</Label>
          <Input id="currentCompany" name="currentCompany" defaultValue={candidate.current_company ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">Years of experience</Label>
          <Input id="yearsOfExperience" name="yearsOfExperience" type="number" step="0.5" defaultValue={candidate.years_of_experience ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="noticePeriodDays">Notice period (days)</Label>
          <Input id="noticePeriodDays" name="noticePeriodDays" type="number" defaultValue={candidate.notice_period_days ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={candidate.location ?? ""} placeholder="Cairo, Egypt" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={candidate.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue={candidate.country ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expectedSalaryMin">Expected salary (min)</Label>
          <Input id="expectedSalaryMin" name="expectedSalaryMin" type="number" defaultValue={candidate.expected_salary_min ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedSalaryMax">Expected salary (max)</Label>
          <Input id="expectedSalaryMax" name="expectedSalaryMax" type="number" defaultValue={candidate.expected_salary_max ?? ""} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={relocate} onCheckedChange={setRelocate} id="willingToRelocate" />
        <Label htmlFor="willingToRelocate">Willing to relocate</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input id="linkedinUrl" name="linkedinUrl" defaultValue={candidate.linkedin_url ?? ""} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="githubUrl">GitHub URL</Label>
          <Input id="githubUrl" name="githubUrl" defaultValue={candidate.github_url ?? ""} placeholder="https://github.com/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolioUrl">Portfolio URL</Label>
          <Input id="portfolioUrl" name="portfolioUrl" defaultValue={candidate.portfolio_url ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input id="websiteUrl" name="websiteUrl" defaultValue={candidate.website_url ?? ""} />
        </div>
      </div>

      <Button type="submit" variant="gradient" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
