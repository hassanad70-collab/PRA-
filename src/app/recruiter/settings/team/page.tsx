import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRedirectLocale } from "@/i18n/get-redirect-locale";
import { InviteMemberDialog } from "@/components/recruiter/invite-member-dialog";
import { PendingInviteList } from "@/components/recruiter/pending-invite-list";
import { TeamMemberList } from "@/components/recruiter/team-member-list";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getCompanyMembers, getMyCapabilities, getPendingInvites } from "@/lib/queries/team";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect(`/${await getRedirectLocale()}/candidate/dashboard`);

  const [members, invites, capabilities] = await Promise.all([
    getCompanyMembers(recruiter.company_id),
    getPendingInvites(recruiter.company_id),
    getMyCapabilities(recruiter.role),
  ]);

  const canInvite = capabilities.has("invite_members");
  const canChangeRoles = capabilities.has("change_member_roles");
  const canRemove = capabilities.has("remove_members");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage who has access to {recruiter.company?.name}.</p>
        </div>
        {canInvite && <InviteMemberDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMemberList members={members} currentUserId={user.id} canChangeRoles={canChangeRoles} canRemove={canRemove} />
        </CardContent>
      </Card>

      {canInvite && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites ({invites.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInviteList invites={invites} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
