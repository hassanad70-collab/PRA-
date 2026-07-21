"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  User,
  UserCog,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { logout } from "@/actions/auth";
import { cn, initials } from "@/lib/utils";

// Server Component layouts (candidate/recruiter/admin) build NavItem[] as
// module-level constants and pass them into this Client Component. React
// Server Components cannot serialize component references (e.g. a Lucide
// icon component) across that boundary, so nav items carry a string key
// instead — resolved to an actual icon component here, inside the client
// boundary, via this registry.
const ICON_MAP = {
  LayoutDashboard,
  User,
  FileText,
  Search,
  Bookmark,
  Briefcase,
  Users,
  Building2,
  UserCog,
  GraduationCap,
  ScrollText,
  Settings,
} as const;

export type IconName = keyof typeof ICON_MAP;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

interface DashboardShellProps {
  navItems: NavItem[];
  user: { full_name: string; email: string; role: string };
  children: React.ReactNode;
}

export function DashboardShell({ navItems, user, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 px-6 py-5 font-semibold">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm">PRA Talent Intelligence</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = ICON_MAP[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{user.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link
                href={
                  user.role === "candidate"
                    ? "/candidate/profile"
                    : user.role === "super_admin"
                    ? "/admin/settings"
                    : "/recruiter/settings"
                }
              >
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">{SidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-card">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:justify-end lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
