import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/i18n/routing";
import { getRequiredEnv } from "@/lib/env";
import type { UserRole } from "@/types/database";

const STAFF_ROLES: UserRole[] = ["recruiter", "hr_manager", "super_admin"];
// The full /admin panel (platform-wide user/company management, audit logs,
// system settings) is super_admin only. hr_manager's "limited administration"
// is the existing /recruiter/* surface, already scoped to their own company.

// Only /admin is deliberately kept outside the [locale] tree, so it's the
// only target here with no locale segment to preserve. /candidate (Candidate
// Portal Internationalization unit) and /recruiter (Recruiter Intelligence
// v2.0's i18n prerequisite) both moved inside [locale] -- their homes are
// resolved dynamically by roleHome() below instead of being fixed strings
// here, since they need the caller's locale threaded in.
const ROLE_HOME: Record<"super_admin", string> = {
  super_admin: "/admin",
};

// Falls back to the user's persisted preference (the same NEXT_LOCALE
// cookie next-intl's own middleware sets) so the page they land on matches
// the language they were already using, and only falls back further to the
// default locale if they have no preference yet.
function resolveRedirectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  return cookieLocale && (locales as readonly string[]).includes(cookieLocale) ? cookieLocale : defaultLocale;
}

function roleHome(role: UserRole, request: NextRequest): string {
  if (role === "candidate") return `/${resolveRedirectLocale(request)}/candidate/dashboard`;
  if (role === "recruiter" || role === "hr_manager") return `/${resolveRedirectLocale(request)}/recruiter/dashboard`;
  return ROLE_HOME[role];
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Login/register/forgot-password, /candidate (Candidate Portal
  // Internationalization unit), and /recruiter (Recruiter Intelligence v2.0's
  // i18n prerequisite) all live under the locale-prefixed [locale] tree
  // ("/en/login", "/ar/candidate/dashboard", "/en/recruiter/dashboard"),
  // unlike /admin, which is deliberately kept unprefixed. Strip a leading
  // "/en"/"/ar" segment before comparing so these checks keep working
  // regardless of which locale the user is on -- and so a bare, unprefixed
  // legacy "/candidate/..." or "/recruiter/..." request (no locale match) is
  // still correctly recognized as a protected route, not silently left
  // unprotected.
  const localeMatch = pathname.match(/^\/(en|ar)(\/.*)?$/);
  const pathWithoutLocale = localeMatch ? (localeMatch[2] ?? "/") : pathname;

  const isCandidateRoute = pathWithoutLocale.startsWith("/candidate");
  const isRecruiterRoute = pathWithoutLocale.startsWith("/recruiter");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute = isCandidateRoute || isRecruiterRoute || isAdminRoute;

  // "/reset-password" is deliberately excluded: a user completing a password
  // reset has a real session (via the /auth/callback code exchange) but must
  // still be allowed to reach this page instead of being bounced to their
  // dashboard by the isAuthRoute check below.
  const isAuthRoute = ["/login", "/register", "/forgot-password"].includes(pathWithoutLocale);

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = `/${resolveRedirectLocale(request)}/login`;
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active, deleted_at")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole | undefined;

    if (!role || !profile?.is_active || profile?.deleted_at) {
      // Fail closed: an unresolved role, a disabled account, or a
      // soft-deleted account must never reach a protected route. A session
      // can go stale mid-flight if an admin disables the account while the
      // user is still logged in, so this has to be re-checked every request,
      // not just at login.
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = `/${resolveRedirectLocale(request)}/login`;
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (isRecruiterRoute && !STAFF_ROLES.includes(role)) {
      return NextResponse.redirect(new URL(roleHome(role, request), request.url));
    }
    if (isAdminRoute && role !== "super_admin") {
      return NextResponse.redirect(new URL(roleHome(role, request), request.url));
    }
    if (isCandidateRoute && role !== "candidate") {
      return NextResponse.redirect(new URL(roleHome(role, request), request.url));
    }
  }

  if (user && isAuthRoute) {
    // Was previously hardcoded to the candidate home regardless of actual
    // role (harmless for candidates, but sent staff on an unnecessary extra
    // hop through a second redirect) -- resolving the real role here also
    // means the candidate case can be locale-aware via roleHome() instead of
    // hardcoding a bare, unprefixed "/candidate/dashboard" string.
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return NextResponse.redirect(new URL(roleHome((profile?.role as UserRole | undefined) ?? "candidate", request), request.url));
  }

  return supabaseResponse;
}
