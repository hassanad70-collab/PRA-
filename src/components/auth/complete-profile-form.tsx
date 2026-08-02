"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeProfile } from "@/actions/auth";
import { completeProfileSchema, type CompleteProfileInput } from "@/lib/validations/auth";

const COUNTRIES = [
  "Saudi Arabia", "United Arab Emirates", "Kuwait", "Qatar", "Bahrain", "Oman",
  "Jordan", "Lebanon", "Egypt", "Morocco", "Algeria", "Tunisia", "Libya",
  "Pakistan", "India", "Bangladesh", "Sri Lanka", "Nepal",
  "United Kingdom", "United States", "Canada", "Australia",
  "Germany", "France", "Netherlands", "Sweden", "Norway", "Denmark",
  "Turkey", "South Africa", "Nigeria", "Kenya", "Ghana",
];

interface CompleteProfileFormProps {
  defaultFullName?: string;
  defaultPhone?: string;
  hasPhone?: boolean;
}

export function CompleteProfileForm({ defaultFullName, defaultPhone, hasPhone }: CompleteProfileFormProps) {
  const t = useTranslations("Auth.CompleteProfile");
  const tCommon = useTranslations("Common");
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      fullName: defaultFullName ?? "",
      phone: defaultPhone ?? "",
      city: "",
      country: "",
      currentPosition: "",
      yearsOfExperience: 0,
    },
  });

  const onSubmit = (values: CompleteProfileInput) => {
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.set(k, String(v));
    });

    startTransition(async () => {
      const result = await completeProfile(formData);
      if (result && !result.success) {
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([, msg]) => {
            if (msg) toast.error(msg);
          });
        } else {
          toast.error(result.error ?? tCommon("somethingWentWrong"));
        }
      }
      // On success, the action redirects to the dashboard.
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <UserCheck className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input
            id="fullName"
            placeholder="Jane Smith"
            {...register("fullName")}
            disabled={isPending}
          />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>

        {/* Phone — only shown when the user authenticated via Google and has no phone on file */}
        {!hasPhone && (
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t("phone")}
              <span className="ml-1 text-xs text-muted-foreground">({tCommon("optional")})</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+966 50 123 4567"
              {...register("phone")}
              disabled={isPending}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">{t("city")}</Label>
            <Input
              id="city"
              placeholder="Riyadh"
              {...register("city")}
              disabled={isPending}
            />
            {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t("country")}</Label>
            <select
              id="country"
              {...register("country")}
              disabled={isPending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{t("selectCountry")}</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentPosition">{t("jobTitle")}</Label>
          <Input
            id="currentPosition"
            placeholder="Software Engineer"
            {...register("currentPosition")}
            disabled={isPending}
          />
          {errors.currentPosition && <p className="text-xs text-destructive">{errors.currentPosition.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="yearsOfExperience">{t("yearsOfExperience")}</Label>
          <Input
            id="yearsOfExperience"
            type="number"
            min={0}
            max={60}
            step={0.5}
            placeholder="3"
            {...register("yearsOfExperience")}
            disabled={isPending}
          />
          {errors.yearsOfExperience && (
            <p className="text-xs text-destructive">{errors.yearsOfExperience.message}</p>
          )}
        </div>

        <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
