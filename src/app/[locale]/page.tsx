import type { Metadata } from "next";
import { domAnimation, LazyMotion } from "framer-motion";
import { getTranslations } from "next-intl/server";

import { AICareerToolsSection } from "@/components/marketing/ai-career-tools-section";
import { AIRecruitment } from "@/components/marketing/ai-recruitment";
import { AtsCheckerTeaser } from "@/components/marketing/ats-checker-teaser";
import { CompaniesPreviewSection } from "@/components/marketing/companies-preview-section";
import { CTA } from "@/components/marketing/cta";
import { FAQ } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { JobsPreviewSection } from "@/components/marketing/jobs-preview-section";
import { Navbar } from "@/components/marketing/navbar";
import { Testimonials } from "@/components/marketing/testimonials";
import { TrustedCompanies } from "@/components/marketing/trusted-companies";
import type { AppLocale } from "@/i18n/routing";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  return buildMetadata({ title: t("title"), description: t("description"), path: "/", locale: locale as AppLocale });
}

// The Jobs/Companies preview sections make this page data-dependent; ISR
// keeps it effectively cached rather than server-rendering on every request.
export const revalidate = 300;

export default async function HomePage() {
  const jobs = await getPublishedJobs();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {/*
        LazyMotion + the `m` component (used inside Hero/AtsCheckerTeaser/
        AICareerToolsSection/Features/HowItWorks/AIRecruitment/Testimonials)
        ships a smaller animation runtime than importing `motion` directly
        in each of those 7 files, without changing any animation behavior
        -- `domAnimation` covers the opacity/transform whileInView fades
        they all use.
      */}
      <LazyMotion features={domAnimation}>
        <main id="main-content" className="flex-1">
          <Hero />
          <TrustedCompanies />
          <AtsCheckerTeaser />
          <AICareerToolsSection />
          <Features />
          <HowItWorks />
          <JobsPreviewSection jobs={jobs} />
          <CompaniesPreviewSection jobs={jobs} />
          <AIRecruitment />
          <Testimonials />
          <FAQ />
          <CTA />
        </main>
      </LazyMotion>
      <Footer />
    </div>
  );
}
