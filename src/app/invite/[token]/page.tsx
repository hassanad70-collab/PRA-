import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { getInviteByToken } from "@/lib/queries/team";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  const isInvalid = !invite || invite.status !== "pending" || new Date(invite.expires_at) < new Date();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-blue-500 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          PRA
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isInvalid ? "Invite not available" : `Join ${invite.company?.name ?? "your team"}`}</CardTitle>
          </CardHeader>
          <CardContent>
            {isInvalid ? (
              <p className="text-sm text-muted-foreground">
                This invite link is invalid, has expired, or has already been used. Ask whoever invited you to send a
                new one.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  You&apos;ve been invited as a <span className="font-medium capitalize text-foreground">{invite.role}</span>.
                  Set a password to create your account and join.
                </p>
                <AcceptInviteForm token={token} email={invite.email} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
