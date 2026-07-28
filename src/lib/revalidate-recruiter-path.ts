import { revalidatePath } from "next/cache";

import { locales } from "@/i18n/routing";

/**
 * Recruiter pages are locale-prefixed (/en/recruiter/..., /ar/recruiter/...)
 * as of Recruiter Intelligence v2.0's i18n prerequisite, so a bare
 * revalidatePath("/recruiter/...") no longer matches any real route and
 * silently revalidates nothing. Revalidate every locale variant instead of
 * hardcoding one. Mirrors src/lib/revalidate-candidate-path.ts.
 *
 * @param path - appended after "/{locale}/recruiter", e.g. "/jobs/123" or ""
 *   for the recruiter root itself.
 */
export function revalidateRecruiterPath(path: string, type?: "layout" | "page") {
  for (const locale of locales) {
    revalidatePath(`/${locale}/recruiter${path}`, type);
  }
}
