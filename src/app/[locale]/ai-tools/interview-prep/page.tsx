import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { InterviewPrepTool } from "@/components/ai-tools/interview-prep-tool";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";

const PATH = "/ai-tools/interview-prep";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "AI Interview Preparation — Role-Specific Questions & Answers",
    description: "Get personalized interview questions, answer frameworks, and coaching tips tailored to your target role and experience. Free AI interview prep.",
    path: PATH,
    locale: locale as AppLocale,
  });
}

export default function InterviewPrepPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <div className="container max-w-2xl py-14">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="mr-1.5 h-3 w-3" />
              AI Interview Preparation
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Walk in <span className="gradient-text">fully prepared</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              AI generates role-specific questions, suggested answers, and coaching tips based on
              the actual job description. Free — no account needed.
            </p>
          </div>
          <InterviewPrepTool />
        </div>
      </main>
      <Footer />
    </div>
  );
}
