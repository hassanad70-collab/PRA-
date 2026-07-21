"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, signInWithOAuth } from "@/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) => {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    const redirect = searchParams.get("redirect");
    if (redirect) formData.set("redirect", redirect);

    startTransition(async () => {
      const result = await login(formData);
      if (result && !result.success) {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  };

  const error = searchParams.get("error");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>

      {error === "oauth_failed" && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Social sign-in failed. Please try again.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" variant="gradient" className="w-full" size="lg" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => startTransition(() => signInWithOAuth("google"))} disabled={isPending}>
          Google
        </Button>
        <Button variant="outline" onClick={() => startTransition(() => signInWithOAuth("linkedin_oidc"))} disabled={isPending}>
          LinkedIn
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
