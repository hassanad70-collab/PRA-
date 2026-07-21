import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/admin/pagination";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { getAdminCandidates } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export default async function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const result = await getAdminCandidates({
    search: params.search,
    status: params.status as "active" | "disabled" | "deleted" | undefined,
    page,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every candidate registered on the platform.</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input name="search" defaultValue={params.search} placeholder="Search by name or email…" className="sm:max-w-sm" />
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
                <TableHead>Experience</TableHead>
                <TableHead>Profile completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No candidates match these filters.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((candidate) => {
                const profile = candidate.profile as { id: string; full_name: string; email: string; is_active: boolean; deleted_at: string | null };
                return (
                  <TableRow key={candidate.id as string}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/candidates/${candidate.id}`} className="hover:underline">
                        {profile.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                    <TableCell>{candidate.years_of_experience as number} yrs</TableCell>
                    <TableCell>{candidate.profile_completion_percent as number}%</TableCell>
                    <TableCell>
                      <UserStatusBadge isActive={profile.is_active} deletedAt={profile.deleted_at} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(candidate.created_at as string)}</TableCell>
                    <TableCell className="text-right">
                      <UserRowActions userId={profile.id} isActive={profile.is_active} deletedAt={profile.deleted_at} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            basePath="/admin/candidates"
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
