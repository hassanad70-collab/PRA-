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
  ChevronDown,
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
  Pin,
  PinOff,
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
  X,
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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubNavItem {
  href: string;
  label: string;
  tag?: "ai" | "beta" | "new";
  badge?: number;
}

export interface NavItem {
  /** Absent when the item is a collapsible section header (has children). */
  href?: string;
  label: string;
  icon: IconName;
  badge?: number;
  tag?: "ai" | "beta" | "new";
  /** When present, the item renders as an expandable sub-group. */
  children?: SubNavItem[];
}

export interface NavGroup {
  label?: string;
  collapsible?: boolean;
  items: NavItem[];
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const LS = {
  collapsed:      "pra.sidebar.v1.collapsed",
  collapsedItems: "pra.sidebar.v1.collapsed-items",
  pinned:         "pra.sidebar.v1.pinned",
  recent:         "pra.sidebar.v1.recent",
  lastWorkspace:  "pra.sidebar.v1.last-workspace",
} as const;

/** Exported so ContinueWidget can read the same key. */
export const LS_KEY_LAST_WORKSPACE = LS.lastWorkspace;

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DashboardShellProps {
  /** Flat nav for recruiter/admin (backward compat). */
  navItems?: NavItem[];
  /** Grouped nav with search, pinned, recent, and sub-groups for candidate. */
  navGroups?: NavGroup[];
  user: { full_name: string; email: string; role: string };
  children: React.ReactNode;
  settingsHref: string;
  labels?: { settings: string; signOut: string; openMenu: string };
  headerExtra?: React.ReactNode;
  /** Optional fixed-position overlay mounted inside the root flex container (e.g. global AI assistant). */
  floatingSlot?: React.ReactNode;
}

const DEFAULT_LABELS = { settings: "Settings", signOut: "Sign out", openMenu: "Open menu" };

// ─── Badge helpers ────────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: "ai" | "beta" | "new" }) {
  return (
    <span className={cn(
      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none",
      tag === "ai"   && "bg-gradient-to-r from-pra-primary/15 to-pra-cyan/15 text-pra-primary ring-1 ring-inset ring-pra-primary/20",
      tag === "beta" && "bg-pra-warning/10 text-pra-warning",
      tag === "new"  && "bg-pra-success/10 text-pra-success",
    )}>
      {tag === "ai" ? "AI" : tag}
    </span>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Nav item components ──────────────────────────────────────────────────────

function NavLink({
  href, label, icon, tag, badge, pathname, onClick, onPin, isPinned,
}: {
  href: string;
  label: string;
  icon: IconName;
  tag?: "ai" | "beta" | "new";
  badge?: number;
  pathname: string;
  onClick?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const Icon = ICON_MAP[icon];
  return (
    <div className="group relative">
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          onPin && "pr-8",
          active
            ? "bg-pra-primary/12 text-pra-primary font-semibold"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {tag && <TagBadge tag={tag} />}
        {badge != null && <CountBadge count={badge} />}
      </Link>
      {onPin && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(); }}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-opacity",
            "opacity-0 group-hover:opacity-50 hover:!opacity-100",
            isPinned && "!opacity-40 group-hover:!opacity-70"
          )}
          title={isPinned ? "Unpin" : "Pin to top"}
        >
          {isPinned
            ? <PinOff className="h-3 w-3 text-primary" />
            : <Pin className="h-3 w-3" />
          }
        </button>
      )}
    </div>
  );
}

function SubLink({
  href, label, tag, badge, pathname, onClick,
}: {
  href: string;
  label: string;
  tag?: "ai" | "beta" | "new";
  badge?: number;
  pathname: string;
  onClick?: () => void;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md py-1.5 pl-10 pr-3 text-sm transition-colors",
        active
          ? "bg-pra-primary/12 font-semibold text-pra-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-40" />
      <span className="flex-1">{label}</span>
      {tag && <TagBadge tag={tag} />}
      {badge != null && <CountBadge count={badge} />}
    </Link>
  );
}

function SubGroupHeader({
  item, isOpen, onToggle, pathname,
}: {
  item: NavItem;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const Icon = ICON_MAP[item.icon];
  const hasActiveChild =
    item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`)) ?? false;
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        hasActiveChild
          ? "text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-start">{item.label}</span>
      {item.tag && <TagBadge tag={item.tag} />}
      <ChevronDown className={cn(
        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
        !isOpen && "-rotate-90"
      )} />
    </button>
  );
}

// ─── DashboardShell ───────────────────────────────────────────────────────────

export function DashboardShell({
  navItems, navGroups, user, children, settingsHref,
  labels = DEFAULT_LABELS, headerExtra, floatingSlot,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [sidebarSearch, setSidebarSearch] = React.useState("");

  // ── Sidebar preferences — all SSR-safe (init from fallback, hydrate in effect) ──
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());
  const [collapsedItems,  setCollapsedItems]  = React.useState<Set<string>>(new Set());
  const [pinned,          setPinned]          = React.useState<string[]>([]);
  const [recent,          setRecent]          = React.useState<string[]>([]);

  React.useEffect(() => {
    setCollapsedGroups(new Set(lsGet<string[]>(LS.collapsed, [])));
    setCollapsedItems (new Set(lsGet<string[]>(LS.collapsedItems, [])));
    setPinned(lsGet<string[]>(LS.pinned, []));
    setRecent(lsGet<string[]>(LS.recent, []));
  }, []);

  const toggleGroup = React.useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) { next.delete(label); } else { next.add(label); }
      lsSet(LS.collapsed, [...next]);
      return next;
    });
  }, []);

  const expandGroup = React.useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      if (!prev.has(label)) return prev;
      const next = new Set(prev);
      next.delete(label);
      lsSet(LS.collapsed, [...next]);
      return next;
    });
  }, []);

  const toggleItem = React.useCallback((key: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      lsSet(LS.collapsedItems, [...next]);
      return next;
    });
  }, []);

  const expandItem = React.useCallback((key: string) => {
    setCollapsedItems((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      lsSet(LS.collapsedItems, [...next]);
      return next;
    });
  }, []);

  const togglePin = React.useCallback((href: string) => {
    setPinned((prev) => {
      const next = prev.includes(href)
        ? prev.filter((h) => h !== href)
        : [href, ...prev].slice(0, 12);
      lsSet(LS.pinned, next);
      return next;
    });
  }, []);

  // ── Auto-expand groups/items containing the active path + visit tracking ──
  React.useEffect(() => {
    if (!navGroups) return;

    for (const group of navGroups) {
      if (!group.collapsible || !group.label) continue;
      const hasActive = group.items.some(
        (item) =>
          (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) ||
          item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))
      );
      if (hasActive) expandGroup(group.label);
    }

    for (const group of navGroups) {
      for (const item of group.items) {
        if (item.children?.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`))) {
          expandItem(item.label);
        }
      }
    }

    // Find the label + icon for the current path (for recent/last-workspace tracking)
    const found = (() => {
      for (const g of navGroups) {
        for (const item of g.items) {
          if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
            return { label: item.label, icon: item.icon };
          const child = item.children?.find(
            (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
          );
          if (child) return { label: child.label, icon: item.icon };
        }
      }
      return null;
    })();

    if (found) {
      setRecent((prev) => {
        const next = [pathname, ...prev.filter((h) => h !== pathname)].slice(0, 8);
        lsSet(LS.recent, next);
        return next;
      });
      if (pathname.includes("/workspace/")) {
        lsSet(LS.lastWorkspace, {
          href: pathname,
          label: found.label,
          icon: found.icon,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }, [pathname, navGroups, expandGroup, expandItem]);

  // Clear search on navigate
  React.useEffect(() => { setSidebarSearch(""); }, [pathname]);

  // ── Command Palette items (include sub-items) ─────────────────────────────
  const paletteItems = React.useMemo<PaletteItem[]>(() => {
    if (navGroups) {
      return navGroups.flatMap((g) =>
        g.items.flatMap((i) => {
          const base = i.href ? [{ href: i.href, label: i.label, group: g.label }] : [];
          const subs = (i.children ?? []).map((c) => ({
            href: c.href,
            label: c.label,
            group: g.label ?? i.label,
          }));
          return [...base, ...subs];
        })
      );
    }
    return (navItems ?? []).filter((i) => !!i.href).map((i) => ({
      href: i.href!,
      label: i.label,
    }));
  }, [navGroups, navItems]);

  const closeMenu = React.useCallback(() => setMobileOpen(false), []);

  // ── Resolve href → display info (for pinned/recent sections) ─────────────
  const findItem = React.useCallback(
    (href: string) => {
      if (!navGroups) return null;
      for (const g of navGroups) {
        for (const item of g.items) {
          if (item.href === href)
            return { href, label: item.label, icon: item.icon, tag: item.tag, badge: item.badge };
          const child = item.children?.find((c) => c.href === href);
          if (child)
            return { href, label: child.label, icon: item.icon, tag: child.tag, badge: child.badge };
        }
      }
      return null;
    },
    [navGroups]
  );

  const pinnedItems = React.useMemo(
    () =>
      pinned
        .map(findItem)
        .filter(Boolean) as Array<{
          href: string; label: string; icon: IconName;
          tag?: "ai" | "beta" | "new"; badge?: number;
        }>,
    [pinned, findItem]
  );

  const recentItems = React.useMemo(
    () =>
      recent
        .filter((h) => h !== pathname)
        .slice(0, 5)
        .map(findItem)
        .filter(Boolean) as Array<{ href: string; label: string; icon: IconName }>,
    [recent, pathname, findItem]
  );

  // ── Sidebar search ────────────────────────────────────────────────────────
  const isSearching = sidebarSearch.trim().length > 0;
  const searchResults = React.useMemo(() => {
    if (!navGroups || !isSearching) return [];
    const q = sidebarSearch.toLowerCase();
    const out: Array<{
      href: string; label: string; icon: IconName;
      tag?: "ai" | "beta" | "new"; badge?: number;
    }> = [];
    for (const g of navGroups) {
      for (const item of g.items) {
        if (item.href && item.label.toLowerCase().includes(q))
          out.push({ href: item.href, label: item.label, icon: item.icon, tag: item.tag, badge: item.badge });
        for (const child of item.children ?? []) {
          if (child.label.toLowerCase().includes(q))
            out.push({ href: child.href, label: child.label, icon: item.icon, tag: child.tag, badge: child.badge });
        }
      }
    }
    return out;
  }, [navGroups, isSearching, sidebarSearch]);

  // ── SidebarNav ────────────────────────────────────────────────────────────
  const SidebarNav = navGroups ? (
    <nav className="flex-1 overflow-y-auto px-3 py-2">

      {/* Search input */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={sidebarSearch}
          onChange={(e) => setSidebarSearch(e.target.value)}
          placeholder="Search…"
          className="w-full rounded-lg border border-border bg-muted/30 py-1.5 pl-8 pr-7 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        {sidebarSearch && (
          <button
            onClick={() => setSidebarSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isSearching ? (
        /* Flat filtered results */
        <div className="space-y-0.5">
          {searchResults.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No results for &ldquo;{sidebarSearch}&rdquo;
            </p>
          ) : searchResults.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              tag={item.tag}
              badge={item.badge}
              pathname={pathname}
              onClick={closeMenu}
              onPin={() => togglePin(item.href)}
              isPinned={pinned.includes(item.href)}
            />
          ))}
        </div>
      ) : (
        <>
          {/* Pinned section */}
          {pinnedItems.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Pinned
              </p>
              <div className="space-y-0.5">
                {pinnedItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    tag={item.tag}
                    badge={item.badge}
                    pathname={pathname}
                    onClick={closeMenu}
                    onPin={() => togglePin(item.href)}
                    isPinned
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent section */}
          {recentItems.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Recent
              </p>
              <div className="space-y-0.5">
                {recentItems.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    pathname={pathname}
                    onClick={closeMenu}
                    onPin={() => togglePin(item.href)}
                    isPinned={pinned.includes(item.href)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Groups */}
          {navGroups.map((group, gi) => {
            const hasSections = pinnedItems.length > 0 || recentItems.length > 0;
            const groupOpen =
              !group.collapsible || !group.label || !collapsedGroups.has(group.label);
            return (
              <div key={gi} className={gi > 0 || hasSections ? "mt-3" : undefined}>
                {group.label && (
                  group.collapsible ? (
                    <button
                      onClick={() => toggleGroup(group.label!)}
                      className="flex w-full items-center justify-between mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform duration-200",
                        !groupOpen && "-rotate-90"
                      )} />
                    </button>
                  ) : (
                    <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                      {group.label}
                    </p>
                  )
                )}

                {groupOpen && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      // Sub-group item (has children — renders as collapsible section)
                      if (item.children) {
                        const itemOpen = !collapsedItems.has(item.label);
                        return (
                          <div key={item.label}>
                            <SubGroupHeader
                              item={item}
                              isOpen={itemOpen}
                              onToggle={() => toggleItem(item.label)}
                              pathname={pathname}
                            />
                            {itemOpen && (
                              <div className="space-y-0.5">
                                {item.children.map((child) => (
                                  <SubLink
                                    key={child.href}
                                    href={child.href}
                                    label={child.label}
                                    tag={child.tag}
                                    badge={child.badge}
                                    pathname={pathname}
                                    onClick={closeMenu}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      // Leaf item
                      if (!item.href) return null;
                      return (
                        <NavLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          tag={item.tag}
                          badge={item.badge}
                          pathname={pathname}
                          onClick={closeMenu}
                          onPin={() => togglePin(item.href!)}
                          isPinned={pinned.includes(item.href)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </nav>
  ) : (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {(navItems ?? []).filter((i) => !!i.href).map((item) => (
        <NavLink
          key={item.href}
          href={item.href!}
          label={item.label}
          icon={item.icon}
          tag={item.tag}
          badge={item.badge}
          pathname={pathname}
          onClick={closeMenu}
        />
      ))}
    </nav>
  );

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2 px-6 py-5 font-semibold">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pra-primary-hover to-pra-primary text-white">
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
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:text-destructive"
            >
              {labels.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {floatingSlot}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block lg:h-screen lg:sticky lg:top-0 lg:overflow-hidden">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-card">
            {SidebarContent}
          </aside>
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
        <main id="main-content" className="min-w-0 flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
