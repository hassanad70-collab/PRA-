import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanyActionsMenu } from "@/components/admin/company-actions-menu";
import { Pagination } from "@/components/admin/pagination";
import { getAdminCompanies } from "@/lib/queries/admin";
import { formatDate } from "@/lib/utils";

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;

  const result = await getAdminCompanies({
    search: params.search,
    status: params.status as "active" | "disabled" | "deleted" | undefined,
    page,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every company registered on the platform.</p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/admin/companies/new">
            <Plus className="h-4 w-4" /> New company
          </Link>
        </Button>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input name="search" defaultValue={params.search} placeholder="Search company name…" className="sm:max-w-sm" />
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
                <TableHead>Industry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No companies match these filters.
                  </TableCell>
                </TableRow>
              )}
              {result.rows.map((company) => (
                <TableRow key={company.id as string}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/companies/${company.id}`} className="hover:underline">
                      {company.name as string}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{(company.industry as string) ?? "—"}</TableCell>
                  <TableCell>
                    {company.deleted_at ? (
                      <Badge variant="destructive">Deleted</Badge>
                    ) : company.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="warning">Disabled</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(company.created_at as string)}</TableCell>
                  <TableCell className="text-right">
                    <CompanyActionsMenu
                      companyId={company.id as string}
                      isActive={company.is_active as boolean}
                      deletedAt={company.deleted_at as string | null}
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
            basePath="/admin/companies"
            searchParams={params}
          />
        </CardContent>
      </Card>
    </div>
  );
}
