import { redirect } from "next/navigation";

import { DashboardShell, type NavItem } from "@/components/shared/dashboard-shell";
import { getCurrentUser } from "@/lib/queries/candidate";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Users", icon: "Users" },
  { href: "/admin/companies", label: "Companies", icon: "Building2" },
  { href: "/admin/recruiters", label: "Recruiters", icon: "UserCog" },
  { href: "/admin/candidates", label: "Candidates", icon: "GraduationCap" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "ScrollText" },
  { href: "/admin/settings", label: "Settings", icon: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Defense in depth: middleware already gates /admin to super_admin, but
  // every protected layout in this app double-checks role server-side too
  // (see RecruiterLayout / CandidateLayout).
  if (user.role !== "super_admin") {
    redirect(user.role === "candidate" ? "/candidate/dashboard" : "/recruiter/dashboard");
  }

  return (
    <DashboardShell navItems={NAV_ITEMS} user={{ full_name: user.full_name, email: user.email, role: "super_admin" }}>
      {children}
    </DashboardShell>
  );
}
