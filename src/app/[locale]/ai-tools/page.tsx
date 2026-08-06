import type { Metadata } from "next";
import { ArrowRight, FileText, Mail, MessageSquare, TrendingUp, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getWorkspaceResume } from "@/lib/workspace/resume-context";
import { getWorkspaceSummary } from "@/lib/workspace/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { WorkspaceResumeClient } from "@/components/workspace/workspace-resume-client";

const PATH = "/ai-tools";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "AI Career Tools — Resume, Cover Letter, Interview Prep & Career Advisor",
    description: "Your AI-powered career toolkit. Check your resume's ATS score, generate cover letters, prepare for interviews, and get a personalized career roadmap.",
    path: PATH,
    locale: locale as AppLocale,
  });
}

const TOOLS = [
  {
    href: "/ai-tools/ats-checker",
    icon: FileText,
    title: "ATS Resume Checker",
    description: "Scan your resume against any job description and get an ATS compatibility score with actionable fixes.",
    badge: "Free · No account",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    href: "/ai-tools/resume-builder",
    icon: Sparkles,
    title: "AI Resume Builder",
    description: "9-step guided wizard builds a polished, ATS-optimized resume with AI rewrites, 5 templates, and PDF/DOCX export.",
    badge: "Requires account",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    href: "/ai-tools/cover-letter",
    icon: Mail,
    title: "Cover Letter Generator",
    description: "Paste the job description and get a tailored, professional cover letter in seconds. Choose tone and length.",
    badge: "Free · Workspace saves",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    href: "/ai-tools/interview-prep",
    icon: MessageSquare,
    title: "Interview Preparation",
    description: "Role-specific questions across HR, Technical, Behavioral, and Situational categories — with answer frameworks and coaching tips.",
    badge: "Free · Workspace saves",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    href: "/ai-tools/career-advisor",
    icon: TrendingUp,
    title: "AI Career Advisor",
    description: "Career roadmap, skill gap analysis, salary insights, certification recommendations, and weekly action goals.",
    badge: "Free · Workspace saves",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
];

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AiToolsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getCurrentUser();
  const isCandidate = user?.role === "candidate";

  let workspaceResume = null;
  let summary = { coverLetters: 0, interviewSessions: 0, careerReports: 0 };

  if (isCandidate) {
    [workspaceResume, summary] = await Promise.all([
      getWorkspaceResume(user.id),
      getWorkspaceSummary(user.id),
    ]);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <div className="container max-w-3xl py-14 space-y-10">
          {/* Header */}
          <div className="text-center">
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="mr-1.5 h-3 w-3" />
              AI Career Toolkit
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {isCandidate ? (
                <>Your <span className="gradient-text">AI Workspace</span></>
              ) : (
                <>AI tools that <span className="gradient-text">get you hired</span></>
              )}
            </h1>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              {isCandidate
                ? "Upload your resume once and it's automatically used across all AI tools — cover letters, interview prep, and career advice."
                : "ATS checker, cover letter generator, interview prep, and career advisor — all AI-powered. Free to try, no account required."}
            </p>
          </div>

          {/* Workspace resume manager (candidates only) */}
          {isCandidate && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Workspace Resume
              </h2>
              <WorkspaceResumeClient
                currentResumeText={workspaceResume?.raw_text ?? null}
                currentFileName={workspaceResume?.file_name ?? null}
              />
            </div>
          )}

          {/* Saved counts (candidates only) */}
          {isCandidate && (summary.coverLetters + summary.interviewSessions + summary.careerReports) > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <CardContent className="py-4">
                  <p className="text-2xl font-bold tabular-nums">{summary.coverLetters}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Cover letters</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="py-4">
                  <p className="text-2xl font-bold tabular-nums">{summary.interviewSessions}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Interview sessions</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="py-4">
                  <p className="text-2xl font-bold tabular-nums">{summary.careerReports}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Career reports</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tools grid */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {isCandidate ? "Your Tools" : "All Tools"}
            </h2>
            <div className="space-y-3">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href} locale={locale as AppLocale}>
                    <Card className="group transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-start gap-4">
                          <div className={`rounded-lg p-2.5 ${tool.bg} shrink-0`}>
                            <Icon className={`h-5 w-5 ${tool.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{tool.title}</p>
                              <Badge variant="outline" className="text-[10px]">{tool.badge}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Guest CTA */}
          {!isCandidate && (
            <Card className="border-primary/30 bg-primary/5 text-center">
              <CardContent className="py-8">
                <p className="font-semibold">Get your personal AI workspace</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a free account to save your resume once and reuse it across all tools — cover letters, interview prep, and career reports automatically loaded.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button variant="gradient" size="sm" asChild>
                    <Link href="/register">Create free account</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
