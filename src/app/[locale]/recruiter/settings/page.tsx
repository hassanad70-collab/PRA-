import { getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import type { RecruiterRole } from "@/types/database";

export default async function RecruiterSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect({ href: "/candidate/dashboard", locale });

  const [t, tShared] = await Promise.all([
    getTranslations("Recruiter.Settings"),
    getTranslations("Recruiter.Shared"),
  ]);

  const roleLabels: Record<RecruiterRole, string> = {
    owner: tShared("role.owner"),
    admin: tShared("role.admin"),
    recruiter: tShared("role.recruiter"),
    viewer: tShared("role.viewer"),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("accountTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("fullName")}</Label>
            <Input defaultValue={user.full_name} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("email")}</Label>
            <Input defaultValue={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("jobTitle")}</Label>
            <Input defaultValue={recruiter.job_title ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("role")}</Label>
            <div>
              <Badge variant="outline">{roleLabels[recruiter.role as RecruiterRole]}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("companyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("companyName")}</Label>
            <Input defaultValue={recruiter.company?.name ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>{t("industry")}</Label>
            <Input defaultValue={recruiter.company?.industry ?? ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-medium">{t("teamTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("teamSubtitle")}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/recruiter/settings/team">
              <Users className="h-4 w-4" /> {t("manageTeam")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
