"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerCandidate, registerRecruiter, signInWithOAuth } from "@/actions/auth";
import { Link } from "@/i18n/navigation";
import {
  candidateRegisterSchema,
  recruiterRegisterSchema,
  type CandidateRegisterInput,
  type RecruiterRegisterInput,
} from "@/lib/validations/auth";

function CandidateRegisterFields() {
  const t = useTranslations("Auth.Register");
  const locale = useLocale();
  const [isPending, startTransition] = React.useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CandidateRegisterInput>({ resolver: zodResolver(candidateRegisterSchema) });

  const onSubmit = (values: CandidateRegisterInput) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));
    formData.set("locale", locale);

    startTransition(async () => {
      const result = await registerCandidate(formData);
      if (!result.success) {
        toast.error(result.error ?? t("genericError"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="c-fullName">{t("fullName")}</Label>
        <Input id="c-fullName" placeholder="Jane Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-email">{t("email")}</Label>
        <Input id="c-email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-password">{t("password")}</Label>
        <Input id="c-password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-confirmPassword">{t("confirmPassword")}</Label>
        <Input id="c-confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("createCandidateAccount")}
      </Button>
    </form>
  );
}

function RecruiterRegisterFields() {
  const t = useTranslations("Auth.Register");
  const [isPending, startTransition] = React.useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecruiterRegisterInput>({ resolver: zodResolver(recruiterRegisterSchema) });

  const onSubmit = (values: RecruiterRegisterInput) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));

    startTransition(async () => {
      const result = await registerRecruiter(formData);
      if (!result.success) {
        toast.error(result.error ?? t("genericError"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="r-fullName">{t("fullName")}</Label>
        <Input id="r-fullName" placeholder="Jane Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-companyName">{t("companyName")}</Label>
        <Input id="r-companyName" placeholder="Acme Inc." {...register("companyName")} />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-jobTitle">{t("jobTitle")}</Label>
        <Input id="r-jobTitle" placeholder="Talent Acquisition Manager" {...register("jobTitle")} />
        {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-email">{t("workEmail")}</Label>
        <Input id="r-email" type="email" placeholder="you@company.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-password">{t("password")}</Label>
        <Input id="r-password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-confirmPassword">{t("confirmPassword")}</Label>
        <Input id="r-confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("createRecruiterAccount")}
      </Button>
    </form>
  );
}

export function RegisterForm() {
  const t = useTranslations("Auth.Register");
  const tCommon = useTranslations("Common");
  const [isOAuthPending, startOAuthTransition] = React.useTransition();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="candidate">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="candidate">{t("candidateTab")}</TabsTrigger>
          <TabsTrigger value="recruiter">{t("recruiterTab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="candidate" className="pt-4">
          <CandidateRegisterFields />
        </TabsContent>
        <TabsContent value="recruiter" className="pt-4">
          <RecruiterRegisterFields />
        </TabsContent>
      </Tabs>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{tCommon("orContinueWith")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => startOAuthTransition(() => signInWithOAuth("google"))}
          disabled={isOAuthPending}
          className="gap-2.5"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {tCommon("google")}
        </Button>

        <Button variant="outline" asChild disabled={isOAuthPending} className="gap-2.5">
          <Link href="/phone-login">
            <Phone className="h-4 w-4 shrink-0" />
            {tCommon("mobile")}
          </Link>
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
