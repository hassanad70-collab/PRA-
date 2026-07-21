"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { rateLimitByIp, rateLimitByIpAndTarget } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import {
  candidateRegisterSchema,
  forgotPasswordSchema,
  loginSchema,
  recruiterRegisterSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function registerCandidate(formData: FormData): Promise<ActionResult> {
  const rateLimit = await rateLimitByIp("register", 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many registration attempts. Please try again later." };
  }

  const parsed = candidateRegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { fullName, email, password } = parsed.data;
  const admin = createAdminClient();

  // Create the account pre-confirmed via the admin API instead of the public
  // signUp() flow. This project's Supabase Auth requires email confirmation,
  // but relies on Supabase's default built-in mailer, which is rate-limited
  // to a couple of sends/hour and unreliable for delivery — confirmation
  // emails were effectively never arriving, permanently locking new accounts
  // out of their own first login. Creating the user already confirmed removes
  // that dependency entirely; the on_auth_user_created trigger still fires
  // normally and creates the profiles row.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "candidate" },
  });

  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Failed to create account." };

  const { error: candidateError } = await admin.from("candidates").insert({ id: data.user.id });
  if (candidateError) return { success: false, error: candidateError.message };

  // Sign the new account in immediately on the session client so the user
  // lands in their dashboard already authenticated, not back at /login.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { success: false, error: "Account created, but automatic sign-in failed. Please sign in manually." };
  }

  revalidatePath("/", "layout");
  redirect("/candidate/dashboard");
}

export async function registerRecruiter(formData: FormData): Promise<ActionResult> {
  const rateLimit = await rateLimitByIp("register", 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many registration attempts. Please try again later." };
  }

  const parsed = recruiterRegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { fullName, email, companyName, jobTitle, password } = parsed.data;
  const admin = createAdminClient();

  // See registerCandidate() for why this uses createUser({ email_confirm: true })
  // instead of the public signUp() flow.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "recruiter" },
  });

  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Failed to create account." };

  let slug = slugify(companyName);
  const { data: existing } = await admin.from("companies").select("id").eq("slug", slug).maybeSingle();
  if (existing) slug = `${slug}-${data.user.id.slice(0, 6)}`;

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ name: companyName, slug, created_by: data.user.id })
    .select("id")
    .single();

  if (companyError) return { success: false, error: companyError.message };

  const { error: recruiterError } = await admin.from("recruiters").insert({
    id: data.user.id,
    company_id: company.id,
    job_title: jobTitle,
    is_company_admin: true,
  });

  if (recruiterError) return { success: false, error: recruiterError.message };

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { success: false, error: "Account created, but automatic sign-in failed. Please sign in manually." };
  }

  revalidatePath("/", "layout");
  redirect("/recruiter/dashboard");
}

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  // Keyed by IP + the specific email being attempted, not IP alone: the
  // real brute-force threat is many guesses against one account, and a
  // shared-IP cap would also wrongly throttle legitimate traffic from behind
  // a corporate NAT/proxy where many real users share one public IP.
  const rateLimit = await rateLimitByIpAndTarget("login", parsed.data.email, 15, 5 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many login attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed")) {
      return {
        success: false,
        error: "Please confirm your email before signing in. Check your inbox for the confirmation link.",
      };
    }
    return { success: false, error: "Invalid email or password" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active, deleted_at")
    .eq("id", data.user.id)
    .single();

  if (profileError) console.error("login: failed to resolve profile role", profileError);

  if (profile && (!profile.is_active || profile.deleted_at)) {
    await supabase.auth.signOut();
    return { success: false, error: "This account has been disabled. Contact support if you believe this is a mistake." };
  }

  revalidatePath("/", "layout");

  const roleHome =
    profile?.role === "recruiter" || profile?.role === "hr_manager"
      ? "/recruiter/dashboard"
      : profile?.role === "super_admin"
      ? "/admin"
      : "/candidate/dashboard";

  // Honor a "redirect" target (e.g. from clicking "Sign in to apply" on a
  // public job posting, or middleware bouncing an unauthenticated visitor
  // off a protected route) so the user lands back where they were instead of
  // always on their generic dashboard. Only a same-site relative path is
  // accepted — anything else falls back to the role's default dashboard,
  // which prevents this from being used as an open redirect.
  const requestedRedirect = formData.get("redirect");
  const destination =
    typeof requestedRedirect === "string" && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : roleHome;

  redirect(destination);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const rateLimit = await rateLimitByIp("password-reset", 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) {
    // Same "always report success" reasoning as below still applies to a
    // rate-limited request — don't reveal that a limit was even hit.
    return { success: true };
  }

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  // Always report success to avoid leaking which emails are registered.
  if (error) return { success: true };
  return { success: true };
}

export async function resetPassword(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function signInWithOAuth(provider: "google" | "linkedin_oidc") {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${getSiteUrl()}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_failed");
  }

  redirect(data.url);
}
