import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { DashboardShell, type NavItem } from "@/components/shared/dashboard-shell";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

export default async function RecruiterLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const tNav = await getTranslations("Recruiter.Nav");

  // DashboardShell renders these with plain next/link (shared with the
  // non-localized admin portal), so hrefs must carry the locale prefix
  // themselves rather than relying on locale-aware Link prefixing.
  const navItems: NavItem[] = [
    { href: `/${locale}/recruiter/dashboard`, label: tNav("dashboard"), icon: "LayoutDashboard" },
    { href: `/${locale}/recruiter/jobs`, label: tNav("jobs"), icon: "Briefcase" },
    { href: `/${locale}/recruiter/interviews`, label: tNav("interviews"), icon: "Calendar" },
    { href: `/${locale}/recruiter/talent-pool`, label: tNav("talentPool"), icon: "Users" },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      user={{ full_name: user.full_name, email: user.email, role: "recruiter" }}
      settingsHref={`/${locale}/recruiter/settings`}
      labels={{ settings: tNav("settings"), signOut: tNav("signOut"), openMenu: tNav("openMenu") }}
      headerExtra={<LanguageSwitcher />}
    >
      {children}
    </DashboardShell>
  );
}
