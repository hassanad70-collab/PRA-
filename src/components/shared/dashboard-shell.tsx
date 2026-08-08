"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart2,
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  FileStack,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Mail,
  Menu,
  MessageCircle,
  Mic,
  PenLine,
  ScrollText,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
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
import { CommandPalette, type PaletteItem } from "@/components/shared/command-palette";
import { logout } from "@/actions/auth";
import { cn, initials } from "@/lib/utils";

// Server Component layouts (candidate/recruiter/admin) build NavItem[] as
// module-level constants and pass them into this Client Component. React
// Server Components cannot serialize component references (e.g. a Lucide
// icon component) across that boundary, so nav items carry a string key
// instead — resolved to an actual icon component here, inside the client
// boundary, via this registry.
const ICON_MAP = {
  Activity,
  BarChart2,
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  Brain,
  Briefcase,
  Building2,
  Calendar,
  CreditCard,
  DollarSign,
  FileStack,
  FileText,
  Flag,
  FolderOpen,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Mail,
  MessageCircle,
  Mic,
  PenLine,
  ScrollText,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  User,
  UserCog,
  Users,
} as const;

export type IconName = keyof typeof ICON_MAP;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface DashboardShellProps {
  /** Flat nav for recruiter/admin (backward compat). Exactly one of navItems or navGroups must be provided. */
  navItems?: NavItem[];
  /** Grouped nav for candidate AI Career Workspace. */
  navGroups?: NavGroup[];
  user: { full_name: string; email: string; role: string };
  children: React.ReactNode;
  /** Locale-aware where needed -- each layout resolves its own destination (see CandidateLayout). */
  settingsHref: string;
  labels?: { settings: string; signOut: string; openMenu: string };
  /** Rendered in the header next to the theme toggle (e.g. LanguageSwitcher for the localized candidate portal). */
  headerExtra?: React.ReactNode;
}

const DEFAULT_LABELS = { settings: "Settings", signOut: "Sign out", openMenu: "Open menu" };

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = ICON_MAP[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}

export function DashboardShell({ navItems, navGroups, user, children, settingsHref, labels = DEFAULT_LABELS, headerExtra }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const paletteItems = React.useMemo<PaletteItem[]>(() => {
    if (navGroups) {
      return navGroups.flatMap((g) =>
        g.items.map((i) => ({ href: i.href, label: i.label, group: g.label }))
      );
    }
    return (navItems ?? []).map((i) => ({ href: i.href, label: i.label }));
  }, [navGroups, navItems]);

  const closeMenu = React.useCallback(() => setMobileOpen(false), []);

  const SidebarNav = navGroups ? (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {navGroups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? "mt-4" : ""}>
          {group.label && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={closeMenu} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  ) : (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {(navItems ?? []).map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onClick={closeMenu} />
      ))}
    </nav>
  );

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 px-6 py-5 font-semibold">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-500 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="text-sm">PRA Talent Intelligence</span>
      </Link>

      {SidebarNav}

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
              <Link href={settingsHref}>{labels.settings}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
              {labels.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block lg:h-screen lg:sticky lg:top-0 lg:overflow-hidden">{SidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-card">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 lg:justify-end lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={labels.openMenu}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <CommandPalette items={paletteItems} />
            {headerExtra}
            <ThemeToggle />
          </div>
        </header>
        <main id="main-content" className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
