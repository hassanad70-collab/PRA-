import { getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { Briefcase, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { getHiringTeamOverview } from "@/lib/recruiter/employer-queries";
import { initials } from "@/lib/utils";

const ROLE_VARIANT = {
  owner: "default",
  admin: "warning",
  recruiter: "secondary",
  viewer: "outline",
} as const;

export default async function HiringTeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [t, tShared] = await Promise.all([
    getTranslations("Recruiter.HiringTeam"),
    getTranslations("Recruiter.Shared"),
  ]);

  const team = await getHiringTeamOverview(recruiter.company_id);

  const roleLabels: Record<string, string> = {
    owner: tShared("role.owner"),
    admin: tShared("role.admin"),
    recruiter: tShared("role.recruiter"),
    viewer: tShared("role.viewer"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle", { company: recruiter.company?.name ?? "", count: team.length })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {team.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">{t("empty")}</CardContent>
          </Card>
        )}
        {team.map((member) => {
          const profile = (Array.isArray(member.profile) ? member.profile[0] : member.profile) as { full_name: string; email: string } | null;
          return (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials(profile?.full_name ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-semibold">{profile?.full_name ?? "—"}</CardTitle>
                    <p className="truncate text-xs text-muted-foreground">{member.job_title ?? member.department ?? "—"}</p>
                  </div>
                  <Badge variant={ROLE_VARIANT[member.role as keyof typeof ROLE_VARIANT] ?? "secondary"}>
                    {roleLabels[member.role] ?? member.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile?.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("activeJobs", { count: member.active_jobs })}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
