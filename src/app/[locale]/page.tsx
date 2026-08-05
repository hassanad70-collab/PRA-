import type { Metadata } from "next";
import { domAnimation, LazyMotion } from "framer-motion";
import { getTranslations } from "next-intl/server";

import { AICareerToolsSection } from "@/components/marketing/ai-career-tools-section";
import { AtsCheckerTeaser } from "@/components/marketing/ats-checker-teaser";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Navbar } from "@/components/marketing/navbar";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  return buildMetadata({ title: t("title"), description: t("description"), path: "/", locale: locale as AppLocale });
}

export default async function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <LazyMotion features={domAnimation}>
        <main id="main-content" className="flex-1">
          <Hero />
          <AtsCheckerTeaser />
          <AICareerToolsSection />
        </main>
      </LazyMotion>
      <Footer />
    </div>
  );
}
