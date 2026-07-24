"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Menu, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function Navbar() {
  const t = useTranslations("Common");
  const tNav = useTranslations("Nav");
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  const NAV_LINKS = [
    { href: "#features", label: t("features") },
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#ai", label: t("aiRecruitment") },
    { href: "#testimonials", label: t("testimonials") },
    { href: "#faq", label: t("faq") },
  ];

  const ROUTE_LINKS = [
    { href: "/ai-tools/ats-checker", label: t("atsChecker") },
    { href: "/jobs", label: t("browseJobs") },
  ];

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all",
        scrolled ? "glass border-b border-border" : "bg-transparent"
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          {t("brand")}
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {ROUTE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/register">{t("getStartedFree")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label={tNav("toggleMenu")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="glass border-t border-border lg:hidden">
          <div className="container flex flex-col gap-4 py-6">
            {ROUTE_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" asChild>
                <Link href="/login">{t("signIn")}</Link>
              </Button>
              <Button variant="gradient" asChild>
                <Link href="/register">{t("getStartedFree")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
