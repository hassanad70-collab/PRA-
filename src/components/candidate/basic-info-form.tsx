"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("Candidate.BasicInfoForm");
  const tShared = useTranslations("Candidate.Shared");
  const [isPending, startTransition] = React.useTransition();
  const [relocate, setRelocate] = React.useState(candidate.willing_to_relocate);

  const onSubmit = (formData: FormData) => {
    formData.set("willingToRelocate", relocate ? "true" : "false");
    startTransition(async () => {
      const result = await updateBasicInfo(formData);
      if (result.success) toast.success(t("toastUpdated"));
      else toast.error(result.error ?? t("toastUpdateFailed"));
    });
  };

  return (
    <form action={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="headline">{t("headline")}</Label>
          <Input id="headline" name="headline" defaultValue={candidate.headline ?? ""} placeholder={t("headlinePlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentPosition">{t("currentPosition")}</Label>
          <Input id="currentPosition" name="currentPosition" defaultValue={candidate.current_position ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">{t("professionalSummary")}</Label>
        <Textarea id="summary" name="summary" defaultValue={candidate.summary ?? ""} rows={4} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="currentCompany">{t("currentCompany")}</Label>
          <Input id="currentCompany" name="currentCompany" defaultValue={candidate.current_company ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">{t("yearsOfExperience")}</Label>
          <Input id="yearsOfExperience" name="yearsOfExperience" type="number" step="0.5" defaultValue={candidate.years_of_experience ?? 0} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="noticePeriodDays">{t("noticePeriodDays")}</Label>
          <Input id="noticePeriodDays" name="noticePeriodDays" type="number" defaultValue={candidate.notice_period_days ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="location">{t("location")}</Label>
          <Input id="location" name="location" defaultValue={candidate.location ?? ""} placeholder={t("locationPlaceholder")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">{t("city")}</Label>
          <Input id="city" name="city" defaultValue={candidate.city ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">{t("country")}</Label>
          <Input id="country" name="country" defaultValue={candidate.country ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expectedSalaryMin">{t("expectedSalaryMin")}</Label>
          <Input id="expectedSalaryMin" name="expectedSalaryMin" type="number" defaultValue={candidate.expected_salary_min ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedSalaryMax">{t("expectedSalaryMax")}</Label>
          <Input id="expectedSalaryMax" name="expectedSalaryMax" type="number" defaultValue={candidate.expected_salary_max ?? ""} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={relocate} onCheckedChange={setRelocate} id="willingToRelocate" />
        <Label htmlFor="willingToRelocate">{t("willingToRelocate")}</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">{t("linkedinUrl")}</Label>
          <Input id="linkedinUrl" name="linkedinUrl" defaultValue={candidate.linkedin_url ?? ""} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="githubUrl">{t("githubUrl")}</Label>
          <Input id="githubUrl" name="githubUrl" defaultValue={candidate.github_url ?? ""} placeholder="https://github.com/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="portfolioUrl">{t("portfolioUrl")}</Label>
          <Input id="portfolioUrl" name="portfolioUrl" defaultValue={candidate.portfolio_url ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">{t("websiteUrl")}</Label>
          <Input id="websiteUrl" name="websiteUrl" defaultValue={candidate.website_url ?? ""} />
        </div>
      </div>

      <Button type="submit" variant="gradient" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {tShared("saveChanges")}
      </Button>
    </form>
  );
}
