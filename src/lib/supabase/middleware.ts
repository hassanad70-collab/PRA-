import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getRequiredEnv } from "@/lib/env";
import type { UserRole } from "@/types/database";

const STAFF_ROLES: UserRole[] = ["recruiter", "hr_manager", "super_admin"];
// The full /admin panel (platform-wide user/company management, audit logs,
// system settings) is super_admin only. hr_manager's "limited administration"
// is the existing /recruiter/* surface, already scoped to their own company.

const ROLE_HOME: Record<UserRole, string> = {
  candidate: "/candidate/dashboard",
  recruiter: "/recruiter/dashboard",
  hr_manager: "/recruiter/dashboard",
  super_admin: "/admin",
};

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

  const isCandidateRoute = pathname.startsWith("/candidate");
  const isRecruiterRoute = pathname.startsWith("/recruiter");
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtectedRoute = isCandidateRoute || isRecruiterRoute || isAdminRoute;
  // "/reset-password" is deliberately excluded: a user completing a password
  // reset has a real session (via the /auth/callback code exchange) but must
  // still be allowed to reach this page instead of being bounced to their
  // dashboard by the isAuthRoute check below.
  const isAuthRoute = ["/login", "/register", "/forgot-password"].includes(pathname);

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (isRecruiterRoute && !STAFF_ROLES.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    if (isAdminRoute && role !== "super_admin") {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    if (isCandidateRoute && role !== "candidate") {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
  }

  return supabaseResponse;
}
