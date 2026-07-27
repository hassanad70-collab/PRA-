import { revalidatePath } from "next/cache";

import { locales } from "@/i18n/routing";

/**
 * Candidate pages are locale-prefixed (/en/candidate/..., /ar/candidate/...),
 * so a bare revalidatePath("/candidate/...") no longer matches any real
 * route and silently revalidates nothing. Revalidate every locale variant
 * instead of hardcoding one.
 */
export function revalidateCandidatePath(path: string) {
  for (const locale of locales) {
    revalidatePath(`/${locale}${path}`);
  }
}
