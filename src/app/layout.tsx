import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { localeDirections, type AppLocale } from "@/i18n/routing";
import { JsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME } from "@/lib/seo/metadata";
import { organizationAndWebsiteSchema } from "@/lib/seo/schema";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const description =
  "Enterprise AI Recruitment & Talent Intelligence System — AI resume screening, talent matching, and HR analytics that cuts manual recruitment work by over 80%.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "PRA Talent Intelligence Platform",
    template: "%s | PRA Talent Intelligence",
  },
  description,
  openGraph: {
    title: "PRA Talent Intelligence Platform",
    description,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PRA Talent Intelligence Platform",
    description,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolves to the negotiated locale for routes under src/app/[locale]/,
  // and to the default locale ("en") for routes outside it (admin/candidate/
  // recruiter/auth callback aren't part of the locale tree and keep their
  // current English-only, ltr behavior unchanged).
  const locale = (await getLocale()) as AppLocale;
  const messages = await getMessages();

  return (
    <html lang={locale} dir={localeDirections[locale]} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {organizationAndWebsiteSchema().map((schema) => (
          <JsonLd key={schema["@type"] as string} data={schema} />
        ))}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider delayDuration={150}>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
