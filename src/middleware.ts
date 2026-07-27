import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Routes deliberately kept outside the [locale] tree (see src/i18n/routing.ts
// and Phase 1D's approved scope): the recruiter/admin dashboards, the OAuth
// callback route handler, API routes, and the invite-accept flow (added in
// migration 0019 -- a recruiter-team-only page, styled like the English-only
// dashboards, not the public marketing/auth surface) never get locale-prefixed
// or redirected. /candidate is deliberately NOT in this list as of the
// Candidate Portal Internationalization unit -- it now lives inside [locale]
// like every public page. Leaving it out of this list is exactly what makes
// a bare, unprefixed "/candidate/..." request (an old bookmark, a link in an
// old email, a stale internal reference) fall through to intlMiddleware
// below, which redirects it to add the missing locale prefix.
//
// TODO(tech-debt): this bare->locale-prefixed redirect is a temporary
// backward-compatibility layer for legacy candidate URLs only. No internal
// code should ever generate an unprefixed "/candidate/..." link/redirect
// going forward -- every internal reference uses the locale-aware Link/
// redirect from "@/i18n/navigation" instead. Remove this reliance once
// legacy traffic (old bookmarks/emails/external docs/any remaining
// hardcoded test URLs) has fully aged out and nothing depends on the bare
// form resolving anymore.
const EXCLUDED_PREFIXES = ["/admin", "/recruiter", "/auth", "/api", "/invite"];
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
