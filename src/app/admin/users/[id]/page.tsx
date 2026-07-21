import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeRoleDialog } from "@/components/admin/change-role-dialog";
import { EditUserForm } from "@/components/admin/edit-user-form";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { getAdminUserDetail } from "@/lib/queries/admin";
import { formatDate, initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAdminUserDetail(id);
  if (!detail?.profile) notFound();

  const { profile, recruiter, candidate } = detail;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{initials(profile.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {profile.role.replace("_", " ")}
              </Badge>
              <UserStatusBadge isActive={profile.is_active} deletedAt={profile.deleted_at} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.role !== "candidate" && <ChangeRoleDialog userId={profile.id} currentRole={profile.role as UserRole} />}
          <UserRowActions userId={profile.id} isActive={profile.is_active} deletedAt={profile.deleted_at} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <EditUserForm userId={profile.id} fullName={profile.full_name} phone={profile.phone} />
          <div className="grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="mt-1 font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Joined</p>
              <p className="mt-1 font-medium">{formatDate(profile.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last seen</p>
              <p className="mt-1 font-medium">{profile.last_seen_at ? formatDate(profile.last_seen_at) : "Never"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {recruiter && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recruiter details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Company</p>
              <Link href={`/admin/companies/${recruiter.company_id}`} className="mt-1 block font-medium hover:underline">
                {recruiter.company?.name ?? "—"}
              </Link>
            </div>
            <div>
              <p className="text-muted-foreground">Job title</p>
              <p className="mt-1 font-medium">{recruiter.job_title ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Company admin</p>
              <p className="mt-1 font-medium">{recruiter.is_company_admin ? "Yes" : "No"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {candidate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Candidate details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Current position</p>
              <p className="mt-1 font-medium">{candidate.current_position ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Years of experience</p>
              <p className="mt-1 font-medium">{candidate.years_of_experience ?? 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Profile completion</p>
              <p className="mt-1 font-medium">{candidate.profile_completion_percent}%</p>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <Link href={`/admin/candidates/${candidate.id}`} className="text-sm text-primary hover:underline">
              View full candidate profile, resumes, and ATS/AI history →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
