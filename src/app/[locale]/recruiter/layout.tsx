import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { DashboardShell, type NavGroup } from "@/components/shared/dashboard-shell";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { CopilotDialog } from "@/components/recruiter/copilot-dialog";
import { ViewAsSwitcher } from "@/components/super-admin/view-as-switcher";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";

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
  // Super Admin can browse recruiter routes in "View As" mode even without
  // a recruiter profile. All RBAC permissions remain intact.
  if (!recruiter && user.role !== "super_admin") {
    redirect({ href: "/candidate/dashboard", locale });
  }

  const supabase = await createClient();
  const [unreadThreadsResult, tNav, tCopilot] = await Promise.all([
    recruiter
      ? supabase
          .from("message_threads")
          .select("recruiter_unread_count")
          .eq("recruiter_id", recruiter.id)
          .gt("recruiter_unread_count", 0)
      : Promise.resolve({ data: [] }),
    getTranslations("Recruiter.Nav"),
    getTranslations("Recruiter.Copilot"),
  ]);
  const unreadMessages =
    unreadThreadsResult.data?.reduce((s, t) => s + (t.recruiter_unread_count ?? 0), 0) ?? 0;

  const p = (path: string) => `/${locale}/recruiter/${path}`;

  const navGroups: NavGroup[] = [
    {
      label: tNav("groupWorkspace"),
      items: [
        { href: p("dashboard"), label: tNav("dashboard"), icon: "LayoutDashboard" },
        { href: p("analytics"), label: tNav("analytics"), icon: "BarChart3" },
        { href: p("messages"), label: tNav("messages"), icon: "MessageCircle", badge: unreadMessages },
        { href: p("ai-assistant"), label: tNav("aiAssistant"), icon: "Bot" },
      ],
    },
    {
      label: tNav("groupRecruitment"),
      items: [
        { href: p("jobs"), label: tNav("jobs"), icon: "Briefcase" },
        { href: p("pipeline"), label: tNav("pipeline"), icon: "Activity" },
        { href: p("interviews"), label: tNav("interviews"), icon: "Calendar" },
        { href: p("offers"), label: tNav("offers"), icon: "FileText" },
      ],
    },
    {
      label: tNav("groupTalent"),
      items: [
        { href: p("candidate-search"), label: tNav("candidateSearch"), icon: "Search" },
        { href: p("talent-pool"), label: tNav("talentPool"), icon: "Users" },
        { href: p("saved-candidates"), label: tNav("savedCandidates"), icon: "Bookmark" },
      ],
    },
    {
      label: tNav("groupIntelligence"),
      items: [
        { href: p("jobs"), label: tNav("aiMatching"), icon: "Target" },
        { href: p("resume-intelligence"), label: tNav("resumeIntelligence"), icon: "FileStack" },
        { href: p("jobs/ai-description"), label: tNav("aiJobDescription"), icon: "Sparkles" },
      ],
    },
    {
      label: tNav("groupCompany"),
      items: [
        { href: p("company-profile"), label: tNav("companyProfile"), icon: "Building2" },
        { href: p("hiring-team"), label: tNav("hiringTeam"), icon: "UserCog" },
        { href: p("team"), label: tNav("team"), icon: "Share2" },
        { href: p("settings"), label: tNav("settings"), icon: "Settings" },
      ],
    },
  ];

  return (
    <DashboardShell
      navGroups={navGroups}
      user={{ full_name: user.full_name, email: user.email, role: "recruiter" }}
      settingsHref={`/${locale}/recruiter/settings`}
      labels={{ settings: tNav("settings"), signOut: tNav("signOut"), openMenu: tNav("openMenu") }}
      headerExtra={
        <>
          {user.role === "super_admin" && <ViewAsSwitcher locale={locale} />}
          <CopilotDialog
            labels={{
              trigger: tCopilot("trigger"),
              dialogTitle: tCopilot("dialogTitle"),
              placeholder: tCopilot("placeholder"),
              send: tCopilot("send"),
              thinking: tCopilot("thinking"),
              emptyState: tCopilot("emptyState"),
              exampleQueries: [
                tCopilot("exampleQuery1"),
                tCopilot("exampleQuery2"),
                tCopilot("exampleQuery3"),
                tCopilot("exampleQuery4"),
                tCopilot("exampleQuery5"),
              ],
              errorFallback: tCopilot("errorFallback"),
            }}
          />
          <LanguageSwitcher />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
