import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, FileText, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/queries/candidate";
import { buildMetadata } from "@/lib/seo/metadata";

const PATH = "/ai-tools/resume-builder";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "AI Resume Builder — Create a Job-Winning Resume",
    description: "Build a professional, ATS-optimized resume with AI assistance. Multi-step wizard, 5 templates, PDF & DOCX export. Free to try.",
    path: PATH,
    locale: locale as AppLocale,
  });
}

const FEATURES = [
  "Multi-step wizard — Personal Info, Experience, Education, Skills, Projects, Certifications",
  "AI rewrites bullet points and professional summaries for maximum impact",
  "Optimizes every section for ATS keyword density",
  "5 professional templates: Modern, Professional, Executive, Minimal, Creative",
  "Export to PDF and DOCX in one click",
  "Real-time ATS score as you build",
  "Unlimited saves and version history",
];

const TEMPLATES = [
  { name: "Modern", accent: "from-blue-500 to-blue-600", tag: "Most popular" },
  { name: "Professional", accent: "from-slate-600 to-slate-700", tag: "" },
  { name: "Executive", accent: "from-indigo-600 to-indigo-700", tag: "Premium feel" },
  { name: "Minimal", accent: "from-gray-400 to-gray-500", tag: "" },
  { name: "Creative", accent: "from-violet-500 to-violet-600", tag: "Stand out" },
];

export default async function ResumeBuilderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();

  // Logged-in candidates go straight to the full builder in the portal
  if (user?.role === "candidate") {
    redirect({ href: "/candidate/resume-builder", locale });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background pb-20 pt-16">
          <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:40px_40px] opacity-[0.03]" />
          <div className="container max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1.5 h-3 w-3" />
              AI-Powered Resume Builder
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Build a resume that{" "}
              <span className="gradient-text">gets you hired</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              AI writes, rewrites, and optimizes every section — so you end up with a polished,
              ATS-friendly resume in minutes, not hours.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/register">
                  Start building free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Sign in to continue</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Free account — no credit card required
            </p>
          </div>
        </section>

        {/* Templates preview */}
        <section className="border-y border-border bg-muted/30 py-14">
          <div className="container">
            <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              5 Professional Templates
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {TEMPLATES.map((tpl) => (
                <div key={tpl.name} className="group flex flex-col items-center gap-2">
                  <div
                    className={`relative h-32 w-24 rounded-lg bg-gradient-to-br ${tpl.accent} shadow-md ring-2 ring-transparent transition-all group-hover:ring-primary/40`}
                  >
                    {/* Mock resume lines */}
                    <div className="absolute inset-3 space-y-1.5">
                      <div className="h-1.5 w-10 rounded-full bg-white/60" />
                      <div className="h-1 w-8 rounded-full bg-white/40" />
                      <div className="mt-2 h-px w-full bg-white/20" />
                      <div className="mt-1 h-1 w-full rounded-full bg-white/30" />
                      <div className="h-1 w-5/6 rounded-full bg-white/30" />
                      <div className="h-1 w-full rounded-full bg-white/30" />
                    </div>
                    {tpl.tag && (
                      <Badge className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0.5">
                        {tpl.tag}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{tpl.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="container max-w-2xl">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
              Everything you need in one builder
            </h2>
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>

            <Card className="mt-10 border-primary/30 bg-primary/5">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <FileText className="h-10 w-10 text-primary" />
                <div>
                  <p className="text-lg font-semibold">Ready to build your resume?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a free account and start building with AI assistance in under 2 minutes.
                  </p>
                </div>
                <Button variant="gradient" size="lg" asChild>
                  <Link href="/register">Get started free</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
