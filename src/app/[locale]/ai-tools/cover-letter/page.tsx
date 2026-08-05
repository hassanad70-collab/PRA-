import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { CoverLetterTool } from "@/components/ai-tools/cover-letter-tool";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";

const PATH = "/ai-tools/cover-letter";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "AI Cover Letter Generator — Free, Instant, Personalized",
    description: "Generate a professional, tailored cover letter in seconds. AI adapts to your resume and job description. Free — no account required.",
    path: PATH,
    locale: locale as AppLocale,
  });
}

export default function CoverLetterPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <div className="container max-w-2xl py-14">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="mr-1.5 h-3 w-3" />
              AI Cover Letter Generator
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The cover letter that <span className="gradient-text">gets you noticed</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              Paste your background and the job description — AI writes a compelling, tailored cover letter in seconds.
              Free, no account needed.
            </p>
          </div>
          <CoverLetterTool />
        </div>
      </main>
      <Footer />
    </div>
  );
}
