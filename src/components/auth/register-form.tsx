"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerCandidate, registerRecruiter, signInWithOAuth } from "@/actions/auth";
import {
  candidateRegisterSchema,
  recruiterRegisterSchema,
  type CandidateRegisterInput,
  type RecruiterRegisterInput,
} from "@/lib/validations/auth";

function CandidateRegisterFields() {
  const [isPending, startTransition] = React.useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CandidateRegisterInput>({ resolver: zodResolver(candidateRegisterSchema) });

  const onSubmit = (values: CandidateRegisterInput) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value));

    startTransition(async () => {
      const result = await registerCandidate(formData);
      // On success the action redirects server-side, so only the error case
      // ever resolves back here.
      if (!result.success) {
        toast.error(result.error ?? "Please check the form for errors");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="c-fullName">Full name</Label>
        <Input id="c-fullName" placeholder="Jane Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-email">Email</Label>
        <Input id="c-email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-password">Password</Label>
        <Input id="c-password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-confirmPassword">Confirm password</Label>
        <Input id="c-confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create candidate account
      </Button>
    </form>
  );
}

function RecruiterRegisterFields() {
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
        toast.error(result.error ?? "Please check the form for errors");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="r-fullName">Full name</Label>
        <Input id="r-fullName" placeholder="Jane Doe" {...register("fullName")} />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-companyName">Company name</Label>
        <Input id="r-companyName" placeholder="Acme Inc." {...register("companyName")} />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-jobTitle">Your job title</Label>
        <Input id="r-jobTitle" placeholder="Talent Acquisition Manager" {...register("jobTitle")} />
        {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-email">Work email</Label>
        <Input id="r-email" type="email" placeholder="you@company.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-password">Password</Label>
        <Input id="r-password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="r-confirmPassword">Confirm password</Label>
        <Input id="r-confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create recruiter account
      </Button>
    </form>
  );
}

export function RegisterForm() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start hiring smarter or find your next role</p>
      </div>

      <Tabs defaultValue="candidate">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="candidate">I&apos;m a candidate</TabsTrigger>
          <TabsTrigger value="recruiter">I&apos;m hiring</TabsTrigger>
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
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => signInWithOAuth("google")}>
          Google
        </Button>
        <Button variant="outline" onClick={() => signInWithOAuth("linkedin_oidc")}>
          LinkedIn
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
