import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { DashboardShell, type NavGroup } from "@/components/shared/dashboard-shell";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ViewAsSwitcher } from "@/components/super-admin/view-as-switcher";
import { GlobalAiAssistant } from "@/components/workspace/global-ai-assistant";
import { getCurrentUser } from "@/lib/queries/candidate";
import { createClient } from "@/lib/supabase/server";

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

  const supabase = await createClient();
  const [{ data: unreadThreads }, unreadNotifsResult, offersResult, tNav, tCommon] = await Promise.all([
    supabase
      .from("message_threads")
      .select("candidate_unread_count")
      .eq("candidate_id", user.id)
      .gt("candidate_unread_count", 0),
    supabase.rpc("get_unread_notification_count"),
    supabase.from("offers").select("*", { count: "exact", head: true }).eq("candidate_id", user.id).eq("status", "pending"),
    getTranslations("Candidate.Nav"),
    getTranslations("Common"),
  ]);
  const unreadMessages = unreadThreads?.reduce((s, t) => s + (t.candidate_unread_count ?? 0), 0) ?? 0;
  const unreadNotifications = (unreadNotifsResult.data as number | null) ?? 0;
  const pendingOffers = offersResult.count ?? 0;

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
      collapsible: true,
      items: [
        {
          label: tNav("resumeSubGroup"),
          icon: "FileStack",
          children: [
            { href: w("/studio"),      label: tNav("resumeStudio") },
            { href: w("/resumes"),     label: tNav("myResumes") },
            { href: w("/ats-checker"), label: tNav("atsChecker") },
          ],
        },
        {
          label: tNav("interviewSubGroup"),
          icon: "Mic",
          children: [
            { href: w("/interview-prep"),   label: tNav("interviewPrep") },
            { href: w("/interview-center"), label: tNav("interviewCenter") },
          ],
        },
        { href: w("/assistant"),      label: tNav("aiAssistant"),       icon: "Bot" },
        { href: w("/career-coach"),   label: tNav("careerCoach"),       icon: "Target" },
        { href: w("/cover-letters"),  label: tNav("coverLetters"),      icon: "Mail" },
        { href: w("/career-advisor"), label: tNav("careerAdvisor"),     icon: "Sparkles" },
        { href: w("/salary"),         label: tNav("salaryInsights"),    icon: "DollarSign" },
        { href: w("/linkedin"),       label: tNav("linkedinOptimizer"), icon: "Share2" },
        { href: w("/portfolio"),      label: tNav("portfolio"),         icon: "Globe" },
      ],
    },
    {
      label: tNav("jobsGroup"),
      collapsible: true,
      items: [
        { href: p("/jobs"),              label: tCommon("browseJobs"),      icon: "Search" },
        { href: p("/saved-jobs"),        label: tNav("savedJobs"),          icon: "Bookmark" },
        { href: p("/applications"),      label: tNav("applications"),       icon: "Briefcase" },
        { href: w("/app-intelligence"),  label: tNav("appIntelligence"),    icon: "BarChart2" },
        { href: p("/interviews"),        label: tNav("interviews"),         icon: "Calendar" },
        { href: p("/offers"),            label: tNav("offers"),             icon: "FileText",  badge: pendingOffers },
        { href: p("/messages"),          label: tNav("messages"),           icon: "MessageCircle", badge: unreadMessages },
      ],
    },
    {
      label: tNav("careerGroup"),
      collapsible: true,
      items: [
        { href: w("/documents"),  label: tNav("documents"),       icon: "FolderOpen" },
        { href: w("/favorites"),  label: tNav("favorites"),       icon: "Star" },
        { href: w("/analytics"),  label: tNav("careerAnalytics"), icon: "LineChart" },
      ],
    },
    {
      label: tNav("accountGroup"),
      collapsible: true,
      items: [
        { href: p("/profile"),       label: tNav("profile"),        icon: "User" },
        { href: p("/notifications"), label: tNav("notifications"),  icon: "Bell",    badge: unreadNotifications },
        { href: p("/settings"),      label: tNav("settings"),       icon: "Settings" },
      ],
    },
  ];

  return (
    <DashboardShell
      navGroups={navGroups}
      user={{ full_name: user.full_name, email: user.email, role: "candidate" }}
      settingsHref={p("/settings")}
      labels={{ settings: tNav("settings"), signOut: tNav("signOut"), openMenu: tNav("openMenu") }}
      floatingSlot={<GlobalAiAssistant />}
      headerExtra={
        user.role === "super_admin" ? (
          <>
            <ViewAsSwitcher locale={locale} />
            <LanguageSwitcher />
          </>
        ) : (
          <LanguageSwitcher />
        )
      }
    >
      {children}
    </DashboardShell>
  );
}
