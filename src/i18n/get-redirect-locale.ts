import "server-only";
import { cookies } from "next/headers";

import { defaultLocale, locales } from "./routing";

/**
 * For Server Components/Actions outside the [locale] tree (recruiter/admin
 * pages, auth actions) that need to redirect a candidate into the
 * locale-prefixed /candidate/* tree without a `params.locale` of their own
 * to read. Mirrors src/lib/supabase/middleware.ts's resolveRedirectLocale()
 * -- same NEXT_LOCALE cookie, same fallback -- kept as a separate function
 * because middleware runs in the Edge runtime (reads from NextRequest) while
 * this runs in a Node Server Component/Action (reads from next/headers).
 */
export async function getRedirectLocale(): Promise<string> {
  const cookieLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  return cookieLocale && (locales as readonly string[]).includes(cookieLocale) ? cookieLocale : defaultLocale;
}
