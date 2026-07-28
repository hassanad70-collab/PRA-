import type { MetadataRoute } from "next";

import { locales } from "@/i18n/routing";

// Dashboards/auth-callback/API stay unprefixed and disallowed exactly as
// before this phase. Public pages moved under /en, /ar -- robots.txt
// matches on URL prefix, so a bare "/login" rule would no longer match
// "/en/login" at all. Generating one allow/disallow entry per locale (via
// `locales`) keeps this correct without hand-maintaining it per language.
const PUBLIC_PATHS = ["", "/jobs", "/companies", "/ai-tools"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const allow = locales.flatMap((locale) => PUBLIC_PATHS.map((path) => `/${locale}${path}`));
  const disallowAuth = locales.flatMap((locale) => AUTH_PATHS.map((path) => `/${locale}${path}`));
  // /candidate and /recruiter now live under each locale (Candidate Portal
  // Internationalization unit; Recruiter Intelligence v2.0's i18n
  // prerequisite) -- disallow both the locale-prefixed paths and the bare
  // legacy path, which still resolves via the temporary backward-compatibility
  // redirect.
  const disallowCandidate = locales.map((locale) => `/${locale}/candidate`);
  const disallowRecruiter = locales.map((locale) => `/${locale}/recruiter`);

  return {
    rules: [
      {
        userAgent: "*",
        allow,
        disallow: ["/candidate", ...disallowCandidate, "/recruiter", ...disallowRecruiter, "/admin", "/auth", ...disallowAuth],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
