import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";

export default async function RecruiterSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account and company details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input defaultValue={user.full_name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Job title</Label>
            <Input defaultValue={recruiter.job_title ?? ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input defaultValue={recruiter.company?.name ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input defaultValue={recruiter.company?.industry ?? ""} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
