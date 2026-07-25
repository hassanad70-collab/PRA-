"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

import { localeDirections, type AppLocale } from "@/i18n/routing";

/**
 * The root layout (src/app/layout.tsx) sets <html lang/dir> server-side via
 * getLocale(), which is correct on a full page load. But it lives outside
 * the [locale] segment, so Next.js's App Router doesn't re-render it on a
 * client-side (soft) navigation between locales -- only the page content
 * inside [locale] re-renders. Without this, switching languages via the
 * LanguageSwitcher updates the visible text but leaves <html> pointing at
 * the previous locale's lang/dir until a hard reload. Syncing it here from
 * the client-side locale context keeps it correct on every navigation.
 */
export function HtmlAttributesSync() {
  const locale = useLocale() as AppLocale;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirections[locale];
  }, [locale]);

  return null;
}
