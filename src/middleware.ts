import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Routes deliberately kept outside the [locale] tree (see src/i18n/routing.ts
// and Phase 1D's approved scope): dashboards, the OAuth callback route
// handler, API routes, and the invite-accept flow (added in migration 0019 --
// a recruiter-team-only page, styled like the English-only dashboards, not
// the public marketing/auth surface) never get locale-prefixed or redirected.
const EXCLUDED_PREFIXES = ["/admin", "/candidate", "/recruiter", "/auth", "/api", "/invite"];
// Root-level special file routes (src/app/robots.ts, sitemap.ts,
// opengraph-image.tsx) -- exact top-level paths, not prefix trees. Without
// this exclusion, next-intl's middleware treats them as pages missing a
// locale prefix and redirects them to e.g. "/en/robots.txt", which doesn't
// exist as a route and 404s.
const EXCLUDED_EXACT_PATHS = ["/robots.txt", "/sitemap.xml", "/opengraph-image"];

function isExcludedFromLocaleRouting(pathname: string) {
  if (EXCLUDED_EXACT_PATHS.includes(pathname)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  // Supabase session refresh + role-based auth redirects run unconditionally
  // on every request, exactly as before this phase -- including dashboard
  // routes the locale middleware below never touches.
  const sessionResponse = await updateSession(request);
  if (sessionResponse.headers.get("location")) return sessionResponse;

  if (isExcludedFromLocaleRouting(request.nextUrl.pathname)) return sessionResponse;

  const intlResponse = intlMiddleware(request);
  // Carry the refreshed Supabase session cookies onto whichever response
  // next-intl produces (a locale redirect/rewrite or a plain pass-through),
  // so a session refresh is never silently dropped by the locale
  // middleware's own response replacing it.
  sessionResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") intlResponse.headers.append(key, value);
  });
  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
