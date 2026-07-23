import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {organizationAndWebsiteSchema().map((schema) => (
          <JsonLd key={schema["@type"] as string} data={schema} />
        ))}
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
