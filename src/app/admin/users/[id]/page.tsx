import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock, Lock, RotateCcw, Shield } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignRoleDialog, RemoveRoleButton } from "@/components/admin/assign-role-dialog";
import { EditUserForm } from "@/components/admin/edit-user-form";
import { LockBadge, RoleBadge } from "@/components/admin/create-user-modal";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { ChangeRoleDialog } from "@/components/shared/dynamic-dialogs";
import { getActiveCompaniesLite, getAdminUserDetail } from "@/lib/queries/admin";
import { getPlatformRoles, getUserRoleAssignments } from "@/lib/queries/rbac";
import { formatDate, initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, roleAssignments, allRoles, allCompanies] = await Promise.all([
    getAdminUserDetail(id),
    getUserRoleAssignments(id),
    getPlatformRoles(),
    getActiveCompaniesLite(),
  ]);
  if (!detail?.profile) notFound();

  const { profile, recruiter, candidate } = detail;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {initials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.full_name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <RoleBadge role={profile.role} />
              {profile.is_locked
                ? <LockBadge />
                : <UserStatusBadge isActive={profile.is_active} deletedAt={profile.deleted_at} />
              }
              {profile.force_password_reset && (
                <Badge variant="outline" className="text-[10px] border-pra-warning/40 text-pra-warning">
                  <RotateCcw className="mr-1 h-3 w-3" /> Reset pending
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.role !== "candidate" && (
            <ChangeRoleDialog userId={profile.id} currentRole={profile.role as UserRole} />
          )}
          <UserRowActions
            userId={profile.id}
            isActive={profile.is_active}
            isLocked={profile.is_locked ?? false}
            deletedAt={profile.deleted_at}
          />
        </div>
      </div>

      {/* Lock warning banner */}
      {profile.is_locked && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Account locked</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This account was locked{profile.locked_at ? ` on ${formatDate(profile.locked_at)}` : ""}. All sessions have been terminated.
              Use the Actions menu to unlock.
            </p>
          </div>
        </div>
      )}

      {/* Force password reset banner */}
      {profile.force_password_reset && !profile.is_locked && (
        <div className="flex items-start gap-3 rounded-lg border border-pra-warning/30 bg-pra-warning/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-pra-warning" />
          <div>
            <p className="text-sm font-medium text-pra-warning">Password reset pending</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A password reset email has been sent. The flag will clear once the user resets their password.
            </p>
          </div>
        </div>
      )}

      {/* Account details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <EditUserForm
            userId={profile.id}
            fullName={profile.full_name}
            phone={profile.phone}
            department={profile.department}
            companyId={profile.company_id}
            companies={allCompanies}
          />
          <div className="grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="mt-1 font-medium">{profile.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Joined
              </p>
              <p className="mt-1 font-medium">{formatDate(profile.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Last seen
              </p>
              <p className="mt-1 font-medium">
                {profile.last_seen_at ? formatDate(profile.last_seen_at) : "Never"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recruiter details */}
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
              <p className="text-muted-foreground">Department</p>
              <p className="mt-1 font-medium capitalize">{recruiter.department ?? profile.department ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate details */}
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

      {/* RBAC role assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">RBAC Role Assignments</CardTitle>
          </div>
          <AssignRoleDialog
            userId={profile.id}
            availableRoles={allRoles}
            availableCompanies={allCompanies}
          />
        </CardHeader>
        <CardContent>
          {roleAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No RBAC roles assigned yet. Use &quot;Assign Role&quot; to grant fine-grained permissions.
            </p>
          ) : (
            <div className="space-y-2">
              {roleAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: a.role.color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{a.role.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.company ? `Company: ${a.company.name}` : "Platform-level"}
                        {" · "}Assigned {formatDate(a.assigned_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.role.is_system && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">System</Badge>
                    )}
                    <RemoveRoleButton assignment={a} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
