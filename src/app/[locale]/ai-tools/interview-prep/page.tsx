import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { InterviewPrepTool } from "@/components/ai-tools/interview-prep-tool";
import { WorkspaceInterviewPrep } from "@/components/workspace/workspace-interview-prep";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { listInterviewSessions } from "@/lib/workspace/queries";
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

export default async function InterviewPrepPage() {
  const user = await getCurrentUser();
  const isCandidate = user?.role === "candidate";

  let workspaceResumeText: string | null = null;
  let savedSessions: Awaited<ReturnType<typeof listInterviewSessions>> = [];

  if (isCandidate) {
    const [resume, sessions] = await Promise.all([
      getWorkspaceResume(user.id),
      listInterviewSessions(user.id),
    ]);
    workspaceResumeText = resume?.raw_text ?? null;
    savedSessions = sessions;
  }

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
              {isCandidate
                ? "Your workspace resume is pre-loaded. Prep sessions are saved to your account automatically."
                : "AI generates role-specific questions, suggested answers, and coaching tips based on the actual job description. Free — no account needed."}
            </p>
          </div>
          {isCandidate ? (
            <WorkspaceInterviewPrep
              workspaceResumeText={workspaceResumeText}
              initialSaved={savedSessions}
            />
          ) : (
            <InterviewPrepTool />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
