import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { WebVitalsReporter } from "@/components/shared/web-vitals-reporter";
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
  icons: {
    icon: "/pra-logo.webp",
    apple: "/pra-logo.webp",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Correct for the initial server-rendered response on every route
  // (resolves to the negotiated locale under src/app/[locale]/, and to the
  // default locale "en" for routes outside it -- admin/candidate/recruiter/
  // auth callback keep their current English-only, ltr behavior unchanged).
  // Client-side navigations between locales are kept in sync separately by
  // HtmlAttributesSync, mounted in src/app/[locale]/layout.tsx where it can
  // react to the locale actually changing -- this root layout is outside
  // the [locale] segment and doesn't re-render on a soft navigation between
  // locales, so it can only ever get this right for the first paint.
  const locale = (await getLocale()) as AppLocale;

  return (
    <html lang={locale} dir={localeDirections[locale]} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        {organizationAndWebsiteSchema().map((schema) => (
          <JsonLd key={schema["@type"] as string} data={schema} />
        ))}
        <WebVitalsReporter />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
