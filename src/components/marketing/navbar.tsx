"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ChevronDown, Compass, FileCheck2, FilePenLine, Mail, Menu, MessagesSquare, Sparkles, X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavContext = "candidates" | "companies";

const CAREER_TOOLS = [
  {
    href: "/ai-tools/ats-checker",
    label: "ATS Resume Checker",
    description: "Instant ATS compatibility score",
    icon: FileCheck2,
  },
  {
    href: "/ai-tools/resume-builder",
    label: "AI Resume Builder",
    description: "Build a job-winning resume",
    icon: FilePenLine,
  },
  {
    href: "/ai-tools/cover-letter",
    label: "Cover Letter Generator",
    description: "Write the perfect cover letter",
    icon: Mail,
  },
  {
    href: "/ai-tools/interview-prep",
    label: "Interview Preparation",
    description: "Prepare for any interview",
    icon: MessagesSquare,
  },
  {
    href: "/ai-tools/career-advisor",
    label: "AI Career Advisor",
    description: "Personalized career guidance",
    icon: Compass,
  },
];

const CANDIDATE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Browse Jobs" },
];

const COMPANY_LINKS = [
  { href: "/companies", label: "For Companies" },
  { href: "/companies#features", label: "Features" },
  { href: "/companies#pricing", label: "Pricing" },
];

export function Navbar() {
  const t = useTranslations("Common");
  const tNav = useTranslations("Nav");
  const pathname = usePathname();

  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [context, setContext] = React.useState<NavContext>(() =>
    pathname?.includes("/companies") ? "companies" : "candidates"
  );

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sync context when navigating between homepage and /companies
  React.useEffect(() => {
    if (pathname?.includes("/companies")) setContext("companies");
  }, [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        scrolled ? "glass border-b border-border shadow-sm" : "bg-transparent"
      )}
    >
      {/* Context switcher strip */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container flex h-8 items-center justify-end gap-1">
          <span className="text-[11px] text-muted-foreground mr-1.5">I&apos;m a:</span>
          {(["candidates", "companies"] as NavContext[]).map((ctx) => (
            <button
              key={ctx}
              onClick={() => setContext(ctx)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all",
                context === ctx
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {ctx === "candidates" ? "Job Seeker" : "Employer"}
            </button>
          ))}
        </div>
      </div>

      {/* Main nav */}
      <div className="container flex h-14 items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pra-primary-hover to-pra-primary text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline">{t("brand")}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {context === "candidates" ? (
            <>
              {CANDIDATE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}

              {/* Career Tools dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
                    Career Tools
                    <ChevronDown className="h-3.5 w-3.5 transition-transform ui-open:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 p-2" align="start">
                  {CAREER_TOOLS.map((tool, i) => {
                    const Icon = tool.icon;
                    return (
                      <React.Fragment key={tool.href}>
                        {i === 1 && <DropdownMenuSeparator className="my-1" />}
                        <DropdownMenuItem asChild>
                          <Link
                            href={tool.href}
                            className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-none">{tool.label}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{tool.description}</p>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      </React.Fragment>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            COMPANY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          {context === "companies" ? (
            <Button variant="gradient" size="sm" asChild>
              <Link href="/companies#contact">Book Demo</Link>
            </Button>
          ) : (
            <Button variant="gradient" size="sm" asChild>
              <Link href="/register">{t("getStartedFree")}</Link>
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label={tNav("toggleMenu")}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div id="mobile-nav" className="glass border-t border-border lg:hidden">
          <div className="container flex flex-col gap-4 py-5">
            {/* Context switcher mobile */}
            <div className="grid grid-cols-2 gap-2">
              {(["candidates", "companies"] as NavContext[]).map((ctx) => (
                <button
                  key={ctx}
                  onClick={() => setContext(ctx)}
                  className={cn(
                    "rounded-lg py-2 text-sm font-medium transition-colors",
                    context === ctx
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {ctx === "candidates" ? "Job Seeker" : "Employer"}
                </button>
              ))}
            </div>

            {context === "candidates" ? (
              <>
                {CANDIDATE_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Career Tools
                  </p>
                  <div className="space-y-1.5 pl-1">
                    {CAREER_TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link
                          key={tool.href}
                          href={tool.href}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                          onClick={() => setOpen(false)}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tool.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              COMPANY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="outline" asChild>
                <Link href="/login" onClick={() => setOpen(false)}>
                  {t("signIn")}
                </Link>
              </Button>
              {context === "companies" ? (
                <Button variant="gradient" asChild>
                  <Link href="/companies#contact" onClick={() => setOpen(false)}>
                    Book Demo
                  </Link>
                </Button>
              ) : (
                <Button variant="gradient" asChild>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    {t("getStartedFree")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
