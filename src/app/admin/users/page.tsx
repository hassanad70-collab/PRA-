import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/admin/pagination";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { getAdminUsers } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const ROLES: UserRole[] = ["candidate", "recruiter", "hr_manager", "super_admin"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const result = await getAdminUsers({
    search: params.search,
    role: params.role as UserRole | undefined,
    status: params.status as "active" | "disabled" | "deleted" | undefined,
    page,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every account on the platform, across every role.</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input name="search" defaultValue={params.search} placeholder="Search by name or email…" className="sm:max-w-sm" />
        <select
          name="role"
          defaultValue={params.role ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm sm:w-44"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
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
          <option value="disabled">Disabled</option>
          <option value="deleted">Deleted</option>
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No users match these filters.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((user) => (
                <TableRow key={user.id as string}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/users/${user.id}`} className="hover:underline">
                      {user.full_name as string}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email as string}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {(user.role as string).replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge isActive={user.is_active as boolean} deletedAt={user.deleted_at as string | null} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(user.created_at as string)}</TableCell>
                  <TableCell className="text-right">
                    <UserRowActions
                      userId={user.id as string}
                      isActive={user.is_active as boolean}
                      deletedAt={user.deleted_at as string | null}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            basePath="/admin/users"
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
