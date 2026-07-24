import { defineRouting } from "next-intl/routing";

// Single source of truth for supported locales. Adding a 3rd language later
// is: add its code+direction here, add messages/<code>.json, done -- no
// other file in this directory needs to change.
export const locales = ["en", "ar"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

export const localeDirections: Record<AppLocale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  ar: "العربية",
};

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
