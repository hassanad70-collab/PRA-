import { redirect } from "next/navigation";

import { DashboardShell, type NavItem } from "@/components/shared/dashboard-shell";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

const NAV_ITEMS: NavItem[] = [
  { href: "/recruiter/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/recruiter/jobs", label: "Jobs", icon: "Briefcase" },
  { href: "/recruiter/talent-pool", label: "Talent Pool", icon: "Users" },
];

export default async function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  return (
    <DashboardShell navItems={NAV_ITEMS} user={{ full_name: user.full_name, email: user.email, role: "recruiter" }}>
      {children}
    </DashboardShell>
  );
}
