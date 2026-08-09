import { redirect } from "next/navigation";

import { DashboardShell, type NavItem } from "@/components/shared/dashboard-shell";
import { ViewAsSwitcher } from "@/components/super-admin/view-as-switcher";
import { getRedirectLocale } from "@/i18n/get-redirect-locale";
import { getCurrentUser } from "@/lib/queries/candidate";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard",          icon: "LayoutDashboard" },
  { href: "/admin/analytics",  label: "Analytics",          icon: "BarChart3"       },
  { href: "/admin/billing",    label: "Billing",            icon: "CreditCard"      },
  { href: "/admin/feature-flags", label: "Feature Flags",  icon: "Flag"            },
  { href: "/admin/queue",      label: "Job Queue",          icon: "ListTodo"        },
  { href: "/admin/email",      label: "Email",              icon: "Mail"            },
  { href: "/admin/users",      label: "Users",              icon: "Users"           },
  { href: "/admin/companies",  label: "Companies",          icon: "Building2"       },
  { href: "/admin/recruiters", label: "Recruiters",         icon: "UserCog"         },
  { href: "/admin/candidates", label: "Candidates",         icon: "GraduationCap"   },
  { href: "/admin/roles",      label: "Roles & Permissions", icon: "ShieldCheck"   },
  { href: "/admin/audit-logs", label: "Audit Logs",         icon: "ScrollText"      },
  { href: "/admin/diagnostics", label: "Diagnostics",       icon: "Activity"        },
  { href: "/admin/settings",   label: "Settings",           icon: "Settings"        },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Defense in depth: middleware already gates /admin to super_admin, but
  // every protected layout in this app double-checks role server-side too
  // (see RecruiterLayout / CandidateLayout).
  if (user.role !== "super_admin") {
    const locale = await getRedirectLocale();
    redirect(user.role === "candidate" ? `/${locale}/candidate/dashboard` : `/${locale}/recruiter/dashboard`);
  }

  const locale = await getRedirectLocale();

  return (
    <DashboardShell
      navItems={NAV_ITEMS}
      user={{ full_name: user.full_name, email: user.email, role: "super_admin" }}
      settingsHref="/admin/settings"
      headerExtra={<ViewAsSwitcher locale={locale} />}
    >
      {children}
    </DashboardShell>
  );
}
