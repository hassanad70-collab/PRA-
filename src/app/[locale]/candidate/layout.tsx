import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { DashboardShell, type NavGroup } from "@/components/shared/dashboard-shell";
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

  const p = (path: string) => `/${locale}/candidate${path}`;
  const w = (path: string) => `/${locale}/candidate/workspace${path}`;

  // DashboardShell renders these with plain next/link (shared with the
  // non-localized recruiter/admin portals), so hrefs must carry the locale
  // prefix themselves rather than relying on locale-aware Link prefixing.
  const navGroups: NavGroup[] = [
    {
      items: [
        { href: p("/dashboard"), label: tNav("dashboard"), icon: "LayoutDashboard" },
      ],
    },
    {
      label: tNav("aiWorkspaceGroup"),
      items: [
        { href: w("/assistant"),     label: tNav("aiAssistant"),   icon: "Bot" },
        { href: w("/resumes"),       label: tNav("myResumes"),     icon: "FileStack" },
        { href: w("/studio"),        label: tNav("resumeStudio"),  icon: "PenLine" },
        { href: w("/ats-checker"),   label: tNav("atsChecker"),    icon: "Target" },
        { href: w("/cover-letters"), label: tNav("coverLetters"),  icon: "Mail" },
        { href: w("/interview-prep"),label: tNav("interviewPrep"), icon: "Mic" },
        { href: w("/career-advisor"),  label: tNav("careerAdvisor"),     icon: "Sparkles" },
        { href: w("/salary"),          label: tNav("salaryInsights"),    icon: "DollarSign" },
        { href: w("/linkedin"),        label: tNav("linkedinOptimizer"), icon: "Share2" },
      ],
    },
    {
      label: tNav("jobsGroup"),
      items: [
        { href: p("/jobs"),         label: tCommon("browseJobs"),   icon: "Search" },
        { href: p("/saved-jobs"),   label: tNav("savedJobs"),       icon: "Bookmark" },
        { href: p("/applications"), label: tNav("applications"),    icon: "Briefcase" },
        { href: p("/interviews"),   label: tNav("interviews"),      icon: "Calendar" },
      ],
    },
    {
      label: tNav("personalGroup"),
      items: [
        { href: w("/portfolio"),    label: tNav("portfolio"),       icon: "Globe" },
        { href: w("/documents"),    label: tNav("documents"),       icon: "FolderOpen" },
        { href: w("/favorites"),    label: tNav("favorites"),       icon: "Star" },
        { href: w("/analytics"),    label: tNav("careerAnalytics"), icon: "LineChart" },
        { href: p("/notifications"),label: tNav("notifications"),   icon: "Bell" },
        { href: p("/settings"),     label: tNav("settings"),        icon: "Settings" },
      ],
    },
  ];

  return (
    <DashboardShell
      navGroups={navGroups}
      user={{ full_name: user.full_name, email: user.email, role: "candidate" }}
      settingsHref={p("/settings")}
      labels={{ settings: tNav("settings"), signOut: tNav("signOut"), openMenu: tNav("openMenu") }}
      headerExtra={<LanguageSwitcher />}
    >
      {children}
    </DashboardShell>
  );
}
