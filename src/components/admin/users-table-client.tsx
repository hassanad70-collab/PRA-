"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpDown, Building2, CheckSquare, ChevronDown, ChevronUp,
  Square, Trash2, UserCheck, UserMinus,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkDeleteUsersAction, bulkSetUsersActiveAction } from "@/actions/admin-users";
import { LockBadge, RoleBadge } from "./create-user-modal";
import { UserRowActions } from "./user-row-actions";
import { UserStatusBadge } from "./user-status-badge";
import type { AdminUserRow, AdminUserSortKey } from "@/lib/queries/admin";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface SortHeaderProps {
  col: AdminUserSortKey;
  label: string;
  currentSort: AdminUserSortKey;
  currentDir: "asc" | "desc";
  onSort: (col: AdminUserSortKey) => void;
}

function SortHeader({ col, label, currentSort, currentDir, onSort }: SortHeaderProps) {
  const active = currentSort === col;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        currentDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

interface UsersTableClientProps {
  rows: AdminUserRow[];
  sortBy: AdminUserSortKey;
  sortDir: "asc" | "desc";
  currentUserId: string;
}

export function UsersTableClient({ rows, sortBy, sortDir, currentUserId }: UsersTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkPending, startBulk] = React.useTransition();

  const allIds = rows.map((r) => r.id).filter((id) => id !== currentUserId);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSort = (col: AdminUserSortKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", col);
    params.set("sortDir", sortBy === col && sortDir === "asc" ? "desc" : "asc");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const runBulk = (action: () => Promise<{ success: boolean; error?: string; data?: { count: number } }>, msg: string) => {
    startBulk(async () => {
      const result = await action();
      if (result.success) {
        toast.success(`${msg} (${result.data?.count ?? selected.size} users)`);
        setSelected(new Set());
        router.refresh();
      } else {
        toast.error(result.error ?? "Bulk action failed");
      }
    });
  };

  const selectedArray = Array.from(selected);

  return (
    <div className="space-y-3">
      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <div className="flex flex-wrap gap-2 ml-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkPending}
              onClick={() => runBulk(() => bulkSetUsersActiveAction(selectedArray, true), "Activated")}
            >
              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkPending}
              onClick={() => runBulk(() => bulkSetUsersActiveAction(selectedArray, false), "Suspended")}
            >
              <UserMinus className="mr-1.5 h-3.5 w-3.5" /> Suspend
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
              disabled={bulkPending}
              onClick={() => runBulk(() => bulkDeleteUsersAction(selectedArray), "Deleted")}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto text-xs" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 pl-4">
                <button
                  type="button"
                  onClick={toggleAll}
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allSelected
                    ? <CheckSquare className="h-4 w-4 text-primary" />
                    : <Square className="h-4 w-4" />
                  }
                </button>
              </TableHead>
              <TableHead>
                <SortHeader col="full_name" label="Name" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead>
                <SortHeader col="email" label="Email" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="hidden lg:table-cell">Company</TableHead>
              <TableHead className="hidden xl:table-cell">Department</TableHead>
              <TableHead>
                <SortHeader col="role" label="Role" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">
                <SortHeader col="last_seen_at" label="Last Login" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <SortHeader col="created_at" label="Created" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
              </TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-sm text-muted-foreground">
                  No users match these filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((user) => {
              const isSelf = user.id === currentUserId;
              const isChecked = selected.has(user.id);
              return (
                <TableRow
                  key={user.id}
                  className={`${isChecked ? "bg-primary/5" : ""} ${user.is_locked ? "opacity-70" : ""}`}
                >
                  <TableCell className="pl-4">
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => toggleOne(user.id)}
                        aria-label={isChecked ? "Deselect" : "Select"}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isChecked
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4" />
                        }
                      </button>
                    )}
                  </TableCell>

                  {/* Name + Avatar */}
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {initials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="block text-sm font-medium hover:underline truncate max-w-[140px]"
                        >
                          {user.full_name}
                          {isSelf && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
                        </Link>
                        {user.force_password_reset && (
                          <Badge variant="outline" className="text-[9px] h-3.5 px-1 mt-0.5 border-amber-300 text-amber-600">
                            Reset pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>

                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {user.phone ?? <span className="text-muted-foreground/40">—</span>}
                  </TableCell>

                  <TableCell className="hidden lg:table-cell">
                    {user.company_name ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate max-w-[120px]">{user.company_name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-sm">—</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                    {user.department ?? <span className="text-muted-foreground/40">—</span>}
                  </TableCell>

                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {user.is_locked
                        ? <LockBadge />
                        : <UserStatusBadge isActive={user.is_active} deletedAt={user.deleted_at} />
                      }
                    </div>
                  </TableCell>

                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {user.last_seen_at ? formatDate(user.last_seen_at) : <span className="text-muted-foreground/40">Never</span>}
                  </TableCell>

                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </TableCell>

                  <TableCell className="text-right pr-4">
                    <UserRowActions
                      userId={user.id}
                      isActive={user.is_active}
                      isLocked={user.is_locked}
                      deletedAt={user.deleted_at}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
