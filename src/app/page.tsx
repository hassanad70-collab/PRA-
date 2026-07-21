import { AIRecruitment } from "@/components/marketing/ai-recruitment";
import { CTA } from "@/components/marketing/cta";
import { FAQ } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Navbar } from "@/components/marketing/navbar";
import { Testimonials } from "@/components/marketing/testimonials";
import { TrustedCompanies } from "@/components/marketing/trusted-companies";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <TrustedCompanies />
        <Features />
        <HowItWorks />
        <AIRecruitment />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
