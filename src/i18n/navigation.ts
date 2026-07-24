import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Locale-aware Link/useRouter/usePathname/redirect. Every internal link and
// programmatic navigation within the [locale] tree should import from here
// instead of next/navigation, so the current locale is preserved
// automatically instead of being hand-threaded through every call site.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
