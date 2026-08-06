import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/admin/pagination";
import { CreateUserModal } from "@/components/admin/create-user-modal";
import { UsersTableClient } from "@/components/admin/users-table-client";
import { getActiveCompaniesLite, getAdminUsers } from "@/lib/queries/admin";
import { getCurrentUser } from "@/lib/queries/candidate";
import type { AdminUserSortKey } from "@/lib/queries/admin";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["candidate", "recruiter", "hr_manager", "super_admin"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const sortBy = (params.sortBy ?? "created_at") as AdminUserSortKey;
  const sortDir = (params.sortDir === "asc" ? "asc" : "desc") as "asc" | "desc";

  const [result, companies, currentUser] = await Promise.all([
    getAdminUsers({
      search: params.search,
      role: params.role as UserRole | undefined,
      status: params.status as "active" | "disabled" | "deleted" | "locked" | undefined,
      sortBy,
      sortDir,
      page,
    }),
    getActiveCompaniesLite(),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Identity Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total.toLocaleString()} user{result.total !== 1 ? "s" : ""} across all roles. Create, manage, and audit every account on the platform.
          </p>
        </div>
        <CreateUserModal companies={companies} />
      </div>

      {/* Filters */}
      <form className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Input
          name="search"
          defaultValue={params.search}
          placeholder="Search name or email…"
          className="sm:max-w-xs"
        />
        <select
          name="role"
          defaultValue={params.role ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm sm:w-44"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm sm:w-44"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Suspended</option>
          <option value="locked">Locked</option>
          <option value="deleted">Deleted</option>
        </select>
        {/* Preserve sort params when filtering */}
        {params.sortBy && <input type="hidden" name="sortBy" value={params.sortBy} />}
        {params.sortDir && <input type="hidden" name="sortDir" value={params.sortDir} />}
        <Button type="submit" variant="outline">
          Filter
        </Button>
        {(params.search || params.role || params.status) && (
          <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Clear filters
          </Link>
        )}
      </form>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: result.total },
          { label: "Page", value: `${page} / ${result.pageCount}` },
          { label: "Sort", value: `${sortBy.replace("_", " ")} ${sortDir}` },
          { label: "Showing", value: `${result.rows.length} of ${result.total}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-sm font-semibold capitalize">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-4 pb-2 px-0">
          <UsersTableClient
            rows={result.rows}
            sortBy={sortBy}
            sortDir={sortDir}
            currentUserId={currentUser?.id ?? ""}
          />
          <div className="px-4 pt-2">
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              basePath="/admin/users"
              searchParams={params}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
