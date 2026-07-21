import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AssignCompanyDialog } from "@/components/admin/assign-company-dialog";
import { Pagination } from "@/components/admin/pagination";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { getActiveCompaniesLite, getAdminRecruiters, getRecruiterPerformance } from "@/lib/queries/admin";

export default async function AdminRecruitersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; companyId?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const [result, companies] = await Promise.all([
    getAdminRecruiters({ search: params.search, companyId: params.companyId, page }),
    getActiveCompaniesLite(),
  ]);

  const performance = await Promise.all(result.rows.map((r) => getRecruiterPerformance(r.id as string)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruiters</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every recruiter and HR manager across every company.</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input name="search" defaultValue={params.search} placeholder="Search by name or email…" className="sm:max-w-sm" />
        <select
          name="companyId"
          defaultValue={params.companyId ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm sm:w-56"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Jobs posted</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Hired</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No recruiters match these filters.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((recruiter, i) => {
                const profile = recruiter.profile as { id: string; full_name: string; email: string; is_active: boolean; deleted_at: string | null };
                const company = recruiter.company as { id: string; name: string } | null;
                const perf = performance[i];
                return (
                  <TableRow key={recruiter.id as string}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/users/${profile.id}`} className="hover:underline">
                        {profile.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    </TableCell>
                    <TableCell>{company?.name ?? "—"}</TableCell>
                    <TableCell>
                      <UserStatusBadge isActive={profile.is_active} deletedAt={profile.deleted_at} />
                    </TableCell>
                    <TableCell>{perf.jobsCount}</TableCell>
                    <TableCell>{perf.applicationsCount}</TableCell>
                    <TableCell>{perf.hiredCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <AssignCompanyDialog
                          recruiterId={recruiter.id as string}
                          currentCompanyId={recruiter.company_id as string}
                          companies={companies}
                        />
                        <UserRowActions userId={profile.id} isActive={profile.is_active} deletedAt={profile.deleted_at} />
                      </div>
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
            basePath="/admin/recruiters"
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
