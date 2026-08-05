import type { Metadata } from "next";
import {
  ArrowRight, BarChart3, Brain, CheckCircle2, ChevronDown, Clock, Database,
  FileSearch, MessageSquare, Search, Shield, Target, TrendingUp, Users, Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/marketing/footer";
import { Navbar } from "@/components/marketing/navbar";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildMetadata({
    title: "Hire Smarter with AI Talent Intelligence — PRA for Employers",
    description: "Find, evaluate, and hire the best talent faster using AI-powered recruitment tools. ATS, AI screening, candidate matching, and hiring analytics in one platform.",
    path: "/companies",
    locale: locale as AppLocale,
  });
}

/* ─── Data ───────────────────────────────────────────────────────── */

const STATS = [
  { value: "80%", label: "Less screening time" },
  { value: "2×", label: "Faster shortlisting" },
  { value: "500+", label: "Hiring teams" },
  { value: "99.9%", label: "Platform uptime" },
];

const WHY = [
  {
    icon: Brain,
    title: "AI-powered screening",
    description:
      "Every resume is scored and ranked against your job requirements automatically — in seconds, not hours.",
  },
  {
    icon: Target,
    title: "Semantic candidate matching",
    description:
      "AI understands context and intent, not just keywords. Surface candidates who actually fit the role.",
  },
  {
    icon: BarChart3,
    title: "Real-time hiring analytics",
    description:
      "Funnel metrics, source quality, time-to-hire by department — every data point you need to hire smarter.",
  },
];

const FEATURES = [
  {
    icon: FileSearch,
    title: "Full Applicant Tracking",
    description:
      "Pipeline management, status tracking, bulk actions, and candidate comparison in one dashboard.",
    badge: "ATS",
  },
  {
    icon: Brain,
    title: "AI Resume Scoring",
    description:
      "Automated screening scores every application against your specific job requirements the moment it arrives.",
    badge: "AI",
  },
  {
    icon: MessageSquare,
    title: "Interview Intelligence",
    description:
      "AI-generated interview questions tailored to each role, plus structured feedback and scheduling.",
    badge: "AI",
  },
  {
    icon: BarChart3,
    title: "Hiring Analytics",
    description:
      "Department-level reports, conversion funnel analysis, source quality, and time-to-hire tracking.",
    badge: "Analytics",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Role-based access for HR managers, hiring managers, interviewers, and department leads.",
    badge: "Enterprise",
  },
  {
    icon: Database,
    title: "Talent Pool",
    description:
      "Build a searchable database of past applicants and candidates for future positions.",
    badge: "Database",
  },
];

const WORKFLOW = [
  {
    step: 1,
    time: "2 min",
    title: "Post your job",
    description: "AI writes the job description. Publish to your candidate pool instantly.",
  },
  {
    step: 2,
    time: "Automatic",
    title: "AI screens applicants",
    description: "Every resume is scored and ranked against your requirements as it comes in.",
  },
  {
    step: 3,
    time: "1 hour",
    title: "Review top candidates",
    description: "AI rankings and insights let you focus time on the best fits — not the full pile.",
  },
  {
    step: 4,
    time: "Your timeline",
    title: "Interview & hire",
    description: "Schedule interviews, capture structured feedback, and make data-backed offers.",
  },
];

const AI_FEATURES = [
  "Semantic understanding beyond keyword matching",
  "Skills gap analysis against job requirements",
  "Experience and seniority calibration",
  "Culture fit signals from writing style and profile",
  "Automated candidate ranking with reasoning",
  "Bias reduction through structured criteria scoring",
];

const TESTIMONIALS = [
  {
    quote:
      "We cut our time-to-shortlist from 2 weeks to under 48 hours. The AI rankings are genuinely good — it surfaces candidates our team would have missed.",
    name: "Sarah Chen",
    role: "Head of Talent Acquisition",
    company: "TechCorp",
    initials: "SC",
  },
  {
    quote:
      "The interview question generator alone is worth it. Role-specific questions in seconds instead of a 30-minute prep session before every interview.",
    name: "Marcus Reid",
    role: "Engineering Manager",
    company: "BuildCo",
    initials: "MR",
  },
  {
    quote:
      "Finally a platform where the analytics are actually useful. Seeing which sources produce our best hires changed how we allocate our recruiting budget.",
    name: "Priya Patel",
    role: "VP People & Culture",
    company: "ScaleUp Inc",
    initials: "PP",
  },
];

const FAQS = [
  {
    question: "How does the AI screening work?",
    answer:
      "Our AI reads each resume and scores it against your specific job requirements — skills, experience level, seniority, and role fit. It doesn't just match keywords; it understands context, so a candidate who describes relevant experience differently still gets scored accurately.",
  },
  {
    question: "Can I customize the screening criteria per job?",
    answer:
      "Yes. Each job posting has its own required and nice-to-have skills, experience level, and education requirements. The AI scoring adapts to each role's specific criteria, not a generic profile.",
  },
  {
    question: "How many active jobs can I post?",
    answer:
      "The Starter plan (free) allows 1 active job with up to 50 applicants per month. The Growth plan ($49/month) allows 10 active jobs with unlimited applicants. Enterprise plans are customizable for larger teams.",
  },
  {
    question: "Does PRA integrate with our existing ATS?",
    answer:
      "PRA is a full ATS — you don't need a separate tool. If you're migrating from another ATS, we support CSV bulk import of historical candidate data.",
  },
  {
    question: "Is candidate data secure?",
    answer:
      "Yes. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are SOC 2-aligned and GDPR-compliant. Candidate data is never sold or shared with third parties.",
  },
  {
    question: "How do team permissions work?",
    answer:
      "PRA has role-based access control (RBAC). Assign roles: Company Admin, HR Manager, Hiring Manager, Interviewer, or Department Manager. Each role sees only what they need — no over-sharing of sensitive data.",
  },
  {
    question: "Can multiple hiring managers collaborate on the same role?",
    answer:
      "Yes. Multiple hiring managers and interviewers can view candidates, leave structured feedback, and participate in hiring decisions for any role they're assigned to.",
  },
  {
    question: "What does onboarding look like?",
    answer:
      "Most teams are fully set up in under an hour. You add your company profile, post your first job, and the AI starts working immediately. No lengthy implementation or professional services required.",
  },
];

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    description: "For small teams getting started",
    features: [
      "1 active job posting",
      "Up to 50 applicants/month",
      "AI resume scoring",
      "Basic pipeline management",
      "Email support",
    ],
    cta: "Start for free",
    href: "/register",
    featured: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/month",
    description: "For growing hiring teams",
    features: [
      "10 active job postings",
      "Unlimited applicants",
      "AI resume scoring & ranking",
      "AI interview questions",
      "Candidate comparison",
      "Hiring analytics dashboard",
      "Team collaboration (5 seats)",
      "Priority support",
    ],
    cta: "Start free trial",
    href: "/register?plan=growth",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Unlimited jobs & applicants",
      "Custom RBAC roles",
      "SSO / SAML",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom integrations",
      "Advanced audit logs",
      "On-premise option",
    ],
    cta: "Book a demo",
    href: "/companies#contact",
    featured: false,
  },
];

/* ─── Page ───────────────────────────────────────────────────────── */

export default function CompaniesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">

        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
          <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:40px_40px] opacity-[0.04]" />
          <div className="absolute start-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-600/15 via-indigo-500/10 to-sky-400/10 blur-3xl" />
          <div className="container text-center">
            <Badge variant="secondary" className="mb-5">
              <Zap className="mr-1.5 h-3 w-3 text-primary" />
              Enterprise AI Recruitment Platform
            </Badge>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
              Hire smarter with{" "}
              <span className="gradient-text">AI Talent Intelligence</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Find, evaluate, and hire the best talent faster using AI-powered recruitment tools that
              automate screening, rank candidates, and deliver hiring analytics in real time.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/register">
                  Start hiring free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#contact">Book a demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free to start · No credit card required · Setup in under an hour
            </p>

            {/* Stats */}
            <div className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-card/60 p-4">
                  <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why PRA ────────────────────────────────────────── */}
        <section className="border-y border-border bg-secondary/20 py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Why forward-thinking hiring teams choose PRA
              </h2>
              <p className="mt-3 text-muted-foreground">
                One platform handles your entire hiring workflow — from posting to offer.
              </p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {WHY.map(({ icon: Icon, title, description }) => (
                <Card key={title} className="border-border bg-card">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-semibold">{title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Platform Features ──────────────────────────────── */}
        <section id="features" className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Everything your hiring team needs
              </h2>
              <p className="mt-3 text-muted-foreground">
                Replace scattered tools with one integrated platform built for modern recruitment.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description, badge }) => (
                <Card key={title} className="group border-border transition-shadow hover:shadow-md">
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{badge}</Badge>
                    </div>
                    <h3 className="mt-4 font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Hiring Workflow ────────────────────────────────── */}
        <section className="border-y border-border bg-secondary/20 py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                From posting to hire in one flow
              </h2>
              <p className="mt-3 text-muted-foreground">
                PRA automates the slow parts so your team focuses on conversations, not paperwork.
              </p>
            </div>
            <div className="mt-12 grid gap-0 sm:grid-cols-4">
              {WORKFLOW.map((step, i) => (
                <div key={step.step} className="relative">
                  {i < WORKFLOW.length - 1 && (
                    <div className="absolute left-1/2 top-8 hidden h-px w-full -translate-y-1/2 bg-border sm:block" />
                  )}
                  <div className="flex flex-col items-center px-4 text-center">
                    <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-border bg-background shadow-sm">
                      <span className="text-2xl font-bold text-primary">{step.step}</span>
                    </div>
                    <Badge variant="outline" className="mt-3 text-[10px]">
                      <Clock className="mr-1 h-2.5 w-2.5" />
                      {step.time}
                    </Badge>
                    <h3 className="mt-3 font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI Matching ────────────────────────────────────── */}
        <section className="py-20">
          <div className="container">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <Badge variant="secondary" className="mb-4">AI Matching Engine</Badge>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Match quality you can&apos;t get from keyword search
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Our AI understands what a role actually requires — and surfaces candidates who can genuinely do the work, even when their resume is worded differently.
                </p>
                <ul className="mt-6 space-y-3">
                  {AI_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-8" variant="gradient" asChild>
                  <Link href="/register">Try it free</Link>
                </Button>
              </div>

              {/* Mock score card */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-lg lg:p-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold">AI Match Score</p>
                  <Badge>Senior Frontend Engineer</Badge>
                </div>
                {[
                  { label: "Technical Skills", score: 94 },
                  { label: "Experience Match", score: 88 },
                  { label: "Seniority Fit", score: 91 },
                  { label: "Culture Signals", score: 85 },
                ].map(({ label, score }) => (
                  <div key={label} className="mb-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{score}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-5 flex items-center justify-between rounded-lg bg-success/10 px-4 py-2.5">
                  <p className="text-sm font-semibold text-success">Overall Match</p>
                  <p className="text-xl font-bold text-success">90%</p>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  AI Insight: Strong TypeScript + React experience. Led 3 cross-functional projects matching company scale. Recommended for fast-track screening.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Candidate Database ─────────────────────────────── */}
        <section className="border-y border-border bg-secondary/20 py-20">
          <div className="container">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm order-2 lg:order-1">
                <p className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Talent Pool</p>
                {[
                  { role: "Frontend Engineer", exp: "5 yrs", skills: "React, TypeScript, Next.js", score: 93 },
                  { role: "Product Manager", exp: "7 yrs", skills: "Roadmapping, Agile, SQL", score: 88 },
                  { role: "Data Scientist", exp: "4 yrs", skills: "Python, ML, PyTorch", score: 85 },
                ].map((c, i) => (
                  <div key={i} className="mb-3 flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{c.role}</p>
                      <p className="text-xs text-muted-foreground">{c.exp} · {c.skills}</p>
                    </div>
                    <Badge className="shrink-0">{c.score}% match</Badge>
                  </div>
                ))}
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  + thousands more in your talent pool
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <Badge variant="secondary" className="mb-4">Candidate Database</Badge>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Never start a search from zero
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Every candidate who applies to any of your roles goes into your talent pool. Future searches surface past applicants who fit — saving you from starting from scratch every time.
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {[
                    "Search by skills, location, experience, and salary",
                    "AI-ranked for any new role you post",
                    "One-click outreach with AI-drafted messages",
                    "Candidate history and interaction timeline",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Search className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── Analytics ──────────────────────────────────────── */}
        <section className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <Badge variant="secondary" className="mb-4">Hiring Analytics</Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Hiring data that drives better decisions
              </h2>
              <p className="mt-3 text-muted-foreground">
                Stop guessing. Real-time analytics turn your recruiting data into competitive intelligence.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Clock, title: "Time to Hire", desc: "Track avg. days from posting to offer by role, department, and recruiter" },
                { icon: TrendingUp, title: "Funnel Analytics", desc: "See exactly where candidates drop off and optimize your screening process" },
                { icon: Shield, title: "Source Quality", desc: "Measure which sources produce your best hires, not just your most applicants" },
                { icon: BarChart3, title: "Department Reports", desc: "Hiring velocity, acceptance rates, and team capacity by department" },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title}>
                  <CardContent className="pt-5 pb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────── */}
        <section id="pricing" className="border-y border-border bg-secondary/20 py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-3 text-muted-foreground">
                Start for free. Scale as you grow. No hidden fees.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <Card
                  key={tier.name}
                  className={tier.featured ? "border-primary shadow-lg ring-1 ring-primary" : "border-border"}
                >
                  <CardContent className="pt-6 pb-6 flex flex-col h-full">
                    {tier.featured && (
                      <Badge className="mb-3 w-fit">Most popular</Badge>
                    )}
                    <h3 className="font-bold text-lg">{tier.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{tier.price}</span>
                      {tier.period && (
                        <span className="text-muted-foreground text-sm">{tier.period}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                    <ul className="mt-5 space-y-2.5 flex-1">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-6 w-full"
                      variant={tier.featured ? "gradient" : "outline"}
                      asChild
                    >
                      <Link href={tier.href}>{tier.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────── */}
        <section id="testimonials" className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Trusted by hiring teams that move fast
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {TESTIMONIALS.map(({ quote, name, role, company, initials }) => (
                <Card key={name} className="border-border">
                  <CardContent className="pt-6 pb-6">
                    <div className="mb-4 flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-warning text-sm">★</span>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{quote}&rdquo;
                    </p>
                    <div className="mt-5 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">{role} · {company}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section id="faq" className="border-y border-border bg-secondary/20 py-20">
          <div className="container max-w-3xl">
            <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {FAQS.map(({ question, answer }) => (
                <details key={question} className="group rounded-lg border border-border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                    <span className="text-sm font-medium">{question}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-4 pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact / Book Demo CTA ────────────────────────── */}
        <section id="contact" className="py-20">
          <div className="container max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to transform your hiring?
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join hundreds of companies who hire faster and smarter with PRA Talent Intelligence.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/register">
                  Start hiring free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="mailto:hello@pratalent.io">Contact sales</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Typically respond within 24 hours · No sales pressure
            </p>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
