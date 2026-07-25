import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { HtmlAttributesSync } from "@/components/shared/html-attributes-sync";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for pages in this segment -- without this,
  // next-intl treats every request as dynamic because it can't know the
  // locale ahead of time.
  setRequestLocale(locale);
  const messages = await getMessages();

  // NextIntlClientProvider lives here, not in the true root layout
  // (src/app/layout.tsx), specifically so it re-instantiates with the
  // correct locale/messages on every client-side navigation between [locale]
  // segments -- the root layout is an ancestor of this segment and doesn't
  // re-render on a soft navigation, which left every client component's
  // useTranslations()/useLocale() (including this same fix's <html>
  // lang/dir sync) pointing at the previous locale until a hard reload.
  // Routes outside [locale] (dashboards) never call useTranslations, so they
  // don't need this provider at all.
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlAttributesSync />
      {children}
    </NextIntlClientProvider>
  );
}
