import { NextResponse } from "next/server";

import { getRedirectLocale } from "@/i18n/get-redirect-locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` is set by the password-reset flow — honour it but never trust it
  // for role-based routing (it is already a trusted same-site relative path
  // that was embedded in our own reset-email link).
  const next = searchParams.get("next");
  const locale = await getRedirectLocale();

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData.user) {
      // Password-reset links carry a `next` param — redirect there immediately.
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const userId = sessionData.user.id;
      const admin = createAdminClient();

      // Profiles are created by the on_auth_user_created trigger on every
      // new Supabase Auth user (both email/password and OAuth flows).
      const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      // For OAuth candidate sign-ups the trigger creates the profile row but
      // not the candidates row (that is normally done by registerCandidate).
      // Create it here if missing so the candidate dashboard doesn't 404.
      const role = profile?.role ?? "candidate";
      if (role === "candidate") {
        const { data: candidateRow } = await admin
          .from("candidates")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (!candidateRow) {
          await admin.from("candidates").insert({ id: userId });

          // Queue a welcome email for brand-new OAuth registrations.
          const email = sessionData.user.email;
          const rawName = sessionData.user.user_metadata?.full_name
            ?? sessionData.user.user_metadata?.name;
          const candidateName = typeof rawName === "string" ? rawName : "there";
          if (email) {
            try {
              const { queueTemplateEmail } = await import("@/lib/email");
              const platformUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.pratalent.com";
              await queueTemplateEmail("welcome", { email, name: candidateName }, {
                candidate_name: candidateName,
                platform_url: platformUrl,
              });
            } catch {
              // Non-fatal — welcome email failure must never block the sign-in.
            }
          }
        }
      }

      const destination =
        role === "recruiter" || role === "hr_manager"
          ? `/${locale}/recruiter/dashboard`
          : role === "super_admin"
          ? "/admin"
          : `/${locale}/candidate/dashboard`;

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
