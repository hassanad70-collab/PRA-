import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteMemberDialog } from "@/components/recruiter/invite-member-dialog";
import { PendingInviteList } from "@/components/recruiter/pending-invite-list";
import { TeamMemberList } from "@/components/recruiter/team-member-list";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getCompanyMembers, getMyCapabilities, getPendingInvites } from "@/lib/queries/team";

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const t = await getTranslations("Recruiter.Team");

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
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle", { company: recruiter.company?.name ?? "" })}</p>
        </div>
        {canInvite && <InviteMemberDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("membersTitle", { count: members.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMemberList members={members} currentUserId={user.id} canChangeRoles={canChangeRoles} canRemove={canRemove} />
        </CardContent>
      </Card>

      {canInvite && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pendingInvitesTitle", { count: invites.length })}</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInviteList invites={invites} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
