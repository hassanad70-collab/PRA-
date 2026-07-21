import { redirect } from "next/navigation";

import { DashboardShell, type NavItem } from "@/components/shared/dashboard-shell";
import { getCurrentUser } from "@/lib/queries/candidate";

const NAV_ITEMS: NavItem[] = [
  { href: "/candidate/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/candidate/profile", label: "Profile", icon: "User" },
  { href: "/candidate/resume", label: "Resume & ATS", icon: "FileText" },
  { href: "/candidate/jobs", label: "Browse Jobs", icon: "Search" },
  { href: "/candidate/applications", label: "Applications", icon: "Bookmark" },
];

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell navItems={NAV_ITEMS} user={{ full_name: user.full_name, email: user.email, role: "candidate" }}>
      {children}
    </DashboardShell>
  );
}
