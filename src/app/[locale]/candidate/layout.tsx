import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { DashboardShell, type NavItem } from "@/components/shared/dashboard-shell";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { getCurrentUser } from "@/lib/queries/candidate";

export default async function CandidateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const [tNav, tCommon] = await Promise.all([
    getTranslations("Candidate.Nav"),
    getTranslations("Common"),
  ]);

  // DashboardShell renders these with plain next/link (shared with the
  // non-localized recruiter/admin portals), so hrefs must carry the locale
  // prefix themselves rather than relying on locale-aware Link prefixing.
  const navItems: NavItem[] = [
    { href: `/${locale}/candidate/dashboard`, label: tNav("dashboard"), icon: "LayoutDashboard" },
    { href: `/${locale}/candidate/profile`, label: tNav("profile"), icon: "User" },
    { href: `/${locale}/candidate/resume`, label: tNav("resumeAts"), icon: "FileText" },
    { href: `/${locale}/candidate/jobs`, label: tCommon("browseJobs"), icon: "Search" },
    { href: `/${locale}/candidate/applications`, label: tNav("applications"), icon: "Bookmark" },
    { href: `/${locale}/candidate/interviews`, label: tNav("interviews"), icon: "Calendar" },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      user={{ full_name: user.full_name, email: user.email, role: "candidate" }}
      settingsHref={`/${locale}/candidate/profile`}
      labels={{ settings: tNav("settings"), signOut: tNav("signOut"), openMenu: tNav("openMenu") }}
      headerExtra={<LanguageSwitcher />}
    >
      {children}
    </DashboardShell>
  );
}
