"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRedirectLocale } from "@/i18n/get-redirect-locale";
import { defaultLocale, locales } from "@/i18n/routing";
import { trackEvent } from "@/lib/analytics/track";
import { queueTemplateEmail } from "@/lib/email";
import { readGuestSessionId } from "@/lib/guest/session";
import { rateLimitByIp, rateLimitByIpAndTarget } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import {
  candidateRegisterSchema,
  completeProfileSchema,
  forgotPasswordSchema,
  loginSchema,
  phoneOtpSchema,
  phoneSchema,
  recruiterRegisterSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: T;
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
  //
  // SECURITY NOTE — email_confirm: true bypasses Supabase email verification.
  // Risk: users can register with an email address they do not own. This is
  // mitigated by the fact that role-sensitive operations (recruiter onboarding,
  // admin actions) are scoped to authenticated sessions via RLS and can never
  // be escalated via this path. No role change is possible via the registration
  // flow — candidates register as 'candidate' and recruiters as 'recruiter',
  // both set server-side, protected by the prevent_role_escalation trigger.
  // TODO: re-enable email confirmation once the Supabase mailer rate-limit is
  // resolved (or a transactional mailer like Resend is wired to Supabase Auth).
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

  // Queue welcome email (fire-and-forget via the email queue worker).
  const platformUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  queueTemplateEmail("welcome", { email, name: fullName }, {
    candidate_name: fullName,
    platform_url: platformUrl,
  }).catch(() => {});

  // Sign the new account in immediately on the session client so the user
  // lands in their dashboard already authenticated, not back at /login.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { success: false, error: "Account created, but automatic sign-in failed. Please sign in manually." };
  }

  const guestSessionId = await readGuestSessionId();
  if (guestSessionId) {
    await trackEvent("registration_from_guest_flow", { guestSessionId, userId: data.user.id });
  }

  revalidatePath("/", "layout");
  const requestedLocale = formData.get("locale");
  const locale =
    typeof requestedLocale === "string" && (locales as readonly string[]).includes(requestedLocale)
      ? requestedLocale
      : defaultLocale;
  redirect(`/${locale}/candidate/dashboard`);
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
    role: "owner",
  });

  if (recruiterError) return { success: false, error: recruiterError.message };

  // Queue welcome email for new recruiters (non-blocking).
  const platformUrlR = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  queueTemplateEmail("welcome", { email, name: fullName }, {
    candidate_name: fullName,
    platform_url: platformUrlR,
  }).catch(() => {});

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { success: false, error: "Account created, but automatic sign-in failed. Please sign in manually." };
  }

  revalidatePath("/", "layout");
  redirect(`/${await getRedirectLocale()}/recruiter/dashboard`);
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

  const requestedLocale = formData.get("locale");
  const locale =
    typeof requestedLocale === "string" && (locales as readonly string[]).includes(requestedLocale)
      ? requestedLocale
      : defaultLocale;

  const roleHome =
    profile?.role === "recruiter" || profile?.role === "hr_manager"
      ? `/${locale}/recruiter/dashboard`
      : profile?.role === "super_admin"
      ? "/admin"
      : `/${locale}/candidate/dashboard`;

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
  const locale = await getRedirectLocale();
  redirect(`/${locale}/login`);
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

export async function signInWithOAuth(provider: "google") {
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

export async function sendPhoneOtp(formData: FormData): Promise<ActionResult> {
  const phone = formData.get("phone");
  const parsed = phoneSchema.safeParse({ phone });
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors.phone?.[0] ?? "Invalid phone number" };
  }

  // Rate limit: 5 OTP sends per phone per 10 minutes across IPs to throttle abuse.
  const rateLimit = await rateLimitByIpAndTarget("phone-otp", parsed.data.phone, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many OTP requests. Please wait a few minutes before trying again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone });

  if (error) {
    if (error.message.toLowerCase().includes("sms") || error.message.toLowerCase().includes("provider")) {
      return { success: false, error: "SMS delivery failed. Check that phone auth is enabled in your Supabase project." };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function verifyPhoneOtp(formData: FormData): Promise<ActionResult> {
  const parsed = phoneOtpSchema.safeParse({
    phone: formData.get("phone"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return { success: false, error: errs.token?.[0] ?? errs.phone?.[0] ?? "Invalid input" };
  }

  // Rate-limit the verify step to prevent brute-forcing the 6-digit token.
  const rl = await rateLimitByIpAndTarget("phone-otp-verify", parsed.data.phone, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return { success: false, error: "Too many verification attempts. Please request a new code." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });

  if (error) {
    // Track wrong-code failures with a tighter per-phone window.
    // After 3 wrong attempts in 5 minutes the user must request a fresh OTP.
    const failRl = await rateLimitByIpAndTarget("phone-otp-fail", parsed.data.phone, 3, 5 * 60 * 1000);
    if (!failRl.allowed) {
      return { success: false, error: "Too many incorrect attempts. Please request a new code." };
    }
    const msg = error.message.toLowerCase();
    if (msg.includes("expired")) {
      return { success: false, error: "The code has expired. Please request a new one." };
    }
    return { success: false, error: "Invalid or expired code. Please check the code and try again." };
  }

  const userId = data.user?.id;
  if (!userId) return { success: false, error: "Authentication failed. Please try again." };

  const admin = createAdminClient();

  // The on_auth_user_created trigger creates a profiles row synchronously for
  // every new auth.users row. Read it to determine role for routing.
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  // A missing profile means the DB trigger didn't fire — do not silently
  // assume candidate and create an account. Surface the error instead.
  if (!profile) {
    return { success: false, error: "Account setup is incomplete. Please sign in with email or contact support." };
  }

  const role = profile.role;
  const locale = await getRedirectLocale();

  revalidatePath("/", "layout");

  if (role === "candidate") {
    // First phone login for a candidate: the trigger creates a profiles row but
    // not a candidates row. Create it and send to complete-profile.
    const { data: existingCandidate } = await admin
      .from("candidates")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existingCandidate) {
      await admin.from("candidates").insert({ id: userId });
      redirect(`/${locale}/complete-profile`);
    }

    redirect(`/${locale}/candidate/dashboard`);
  }

  // Recruiter / HR Manager / Company Admin → recruiter workspace.
  if (role === "recruiter" || role === "hr_manager") {
    redirect(`/${locale}/recruiter/dashboard`);
  }

  // super_admin → admin panel (matches /auth/callback routing).
  redirect(`/admin`);
}

export async function completeProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in." };

  const parsed = completeProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    city: formData.get("city"),
    country: formData.get("country"),
    currentPosition: formData.get("currentPosition"),
    yearsOfExperience: formData.get("yearsOfExperience"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
      ),
    };
  }

  const { fullName, city, country, currentPosition, yearsOfExperience, phone } = parsed.data;
  const admin = createAdminClient();

  // Update the profile row (full_name, and phone if the user doesn't have one yet).
  const profileUpdate: Record<string, unknown> = { full_name: fullName };
  if (phone && !user.phone) profileUpdate.phone = phone;

  const { error: profileErr } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", user.id);

  if (profileErr) return { success: false, error: profileErr.message };

  // Update the candidates row with the essential onboarding fields.
  const { error: candidateErr } = await admin
    .from("candidates")
    .update({
      city,
      country,
      current_position: currentPosition,
      years_of_experience: yearsOfExperience,
    })
    .eq("id", user.id);

  if (candidateErr) return { success: false, error: candidateErr.message };

  // Recompute profile completion score (best-effort, non-blocking).
  try { await supabase.rpc("recompute_profile_completion", { p_candidate_id: user.id }); } catch { /* non-fatal */ }

  revalidatePath("/", "layout");
  const locale = await getRedirectLocale();
  redirect(`/${locale}/candidate/dashboard`);
}
