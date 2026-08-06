import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { CareerAdvisorTool } from "@/components/ai-tools/career-advisor-tool";
import { WorkspaceCareerAdvisor } from "@/components/workspace/workspace-career-advisor";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { listCareerReports } from "@/lib/workspace/queries";
import { buildMetadata } from "@/lib/seo/metadata";

const PATH = "/ai-tools/career-advisor";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "AI Career Advisor — Personalized Career Roadmap & Salary Insights",
    description: "Get a personalized career roadmap, skill gap analysis, salary insights, and weekly action goals powered by AI. Free — no account required.",
    path: PATH,
    locale: locale as AppLocale,
  });
}

export default async function CareerAdvisorPage() {
  const user = await getCurrentUser();
  const isCandidate = user?.role === "candidate";

  let workspaceResumeText: string | null = null;
  let savedReports: Awaited<ReturnType<typeof listCareerReports>> = [];

  if (isCandidate) {
    const [resume, reports] = await Promise.all([
      getWorkspaceResume(user.id),
      listCareerReports(user.id),
    ]);
    workspaceResumeText = resume?.raw_text ?? null;
    savedReports = reports;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <div className="container max-w-2xl py-14">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="mr-1.5 h-3 w-3" />
              AI Career Advisor
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your <span className="gradient-text">personalized career roadmap</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              {isCandidate
                ? "Career reports are saved to your account automatically. Access your full history below."
                : "Describe your background and where you want to go — AI delivers a complete career intelligence report with skill gaps, salary insights, certifications, and weekly action goals."}
            </p>
          </div>
          {isCandidate ? (
            <WorkspaceCareerAdvisor
              workspaceResumeText={workspaceResumeText}
              initialSaved={savedReports}
            />
          ) : (
            <CareerAdvisorTool />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
