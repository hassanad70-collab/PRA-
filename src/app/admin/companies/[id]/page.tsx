import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyActionsMenu } from "@/components/admin/company-actions-menu";
import { CompanyForm } from "@/components/admin/company-form";
import { getAdminCompanyDetail } from "@/lib/queries/admin";

export default async function AdminCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company, recruiterCount, stats } = await getAdminCompanyDetail(id);
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/companies" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to companies
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            {company.deleted_at ? (
              <Badge variant="destructive">Deleted</Badge>
            ) : company.is_active ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="warning">Disabled</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{company.industry ?? "No industry set"}</p>
        </div>
        <CompanyActionsMenu companyId={company.id} isActive={company.is_active} deletedAt={company.deleted_at} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Recruiters</p>
            <p className="mt-1 text-2xl font-bold">{recruiterCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active jobs</p>
            <p className="mt-1 text-2xl font-bold">{stats?.open_jobs ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total jobs</p>
            <p className="mt-1 text-2xl font-bold">{stats?.total_jobs ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Applications (this month)</p>
            <p className="mt-1 text-2xl font-bold">{stats?.applications_this_month ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyForm company={company} />
        </CardContent>
      </Card>

      <div className="text-sm">
        <Link href={`/admin/recruiters?companyId=${company.id}`} className="text-primary hover:underline">
          View this company&apos;s recruiters →
        </Link>
      </div>
    </div>
  );
}
