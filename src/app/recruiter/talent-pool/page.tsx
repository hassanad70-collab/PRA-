import { redirect } from "next/navigation";
import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { getRecruiterContext } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";

export default async function TalentPoolPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recruiter = await getRecruiterContext(user.id);
  if (!recruiter) redirect("/candidate/dashboard");

  const supabase = await createClient();
  const { data: pool } = await supabase
    .from("talent_pool")
    .select("*, candidate:candidates(*, profile:profiles(*))")
    .eq("company_id", recruiter.company_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Talent Pool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Candidates you&apos;ve saved for future roles at {recruiter.company?.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(!pool || pool.length === 0) && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Your talent pool is empty. Save strong candidates from job applications to build your pipeline for future roles.
            </CardContent>
          </Card>
        )}
        {pool?.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(entry.candidate?.profile?.full_name ?? "?")}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{entry.candidate?.profile?.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{entry.candidate?.current_position}</p>
                </div>
                {entry.is_favorite && <Star className="ml-auto h-4 w-4 shrink-0 fill-warning text-warning" />}
              </div>
              {!!entry.tags?.length && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entry.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {entry.notes && <p className="mt-3 text-sm text-muted-foreground">{entry.notes}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
