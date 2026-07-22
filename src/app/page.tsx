import type { Metadata } from "next";

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
import { getPublishedJobs } from "@/lib/queries/jobs";

export const metadata: Metadata = {
  title: "AI Career Platform — Free ATS Resume Checker & AI Recruitment",
  description:
    "PRA is an AI-powered career and talent platform. Check your resume's ATS score free, and hire smarter with AI screening, matching, and analytics.",
};

// The Jobs/Companies preview sections make this page data-dependent; ISR
// keeps it effectively cached rather than server-rendering on every request.
export const revalidate = 300;

export default async function HomePage() {
  const jobs = await getPublishedJobs();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
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
      <Footer />
    </div>
  );
}
