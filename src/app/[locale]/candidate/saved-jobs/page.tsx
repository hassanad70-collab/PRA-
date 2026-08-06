import { redirect } from "@/i18n/navigation";
import { Bookmark, Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/queries/candidate";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type SavedJobRow = {
  id: string;
  created_at: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    employment_type: string | null;
    status: string;
    company: { name: string } | null;
  } | null;
};

async function getSavedJobsWithDetails(candidateId: string): Promise<SavedJobRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_jobs")
    .select("id, created_at, job:jobs(id, title, location, employment_type, status, company:companies(name))")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .returns<SavedJobRow[]>();
  return data ?? [];
}

export default async function SavedJobsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const savedJobs = await getSavedJobsWithDetails(user.id);
  const activeJobs = savedJobs.filter((s) => (s.job as { status?: string } | null)?.status === "published");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {savedJobs.length > 0
              ? `${savedJobs.length} saved · ${activeJobs.length} still accepting applications`
              : "Jobs you bookmark will appear here."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/candidate/jobs`}>
            <Search className="mr-2 h-4 w-4" /> Browse Jobs
          </Link>
        </Button>
      </div>

      {savedJobs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No saved jobs yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {"Browse open roles and bookmark the ones you're interested in."}
              </p>
            </div>
            <Button asChild>
              <Link href={`/${locale}/candidate/jobs`}>Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {savedJobs.map((saved) => {
          const job = saved.job;
          if (!job) return null;
          const isActive = job.status === "published";

          return (
            <Link key={saved.id} href={`/${locale}/candidate/jobs/${job.id}`}>
              <Card className={`transition-shadow hover:shadow-md ${!isActive ? "opacity-60" : ""}`}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5 pb-5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{job.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {job.company?.name}
                      {job.location ? ` · ${job.location}` : ""}
                      {job.employment_type ? ` · ${job.employment_type.replace("_", " ")}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Saved {formatDate(saved.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && <Badge variant="secondary">Closed</Badge>}
                    {isActive && (
                      <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                        <Link href={`/${locale}/candidate/jobs/${job.id}`}>Apply</Link>
                      </Button>
                    )}
                    <Bookmark className="h-4 w-4 fill-primary text-primary" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
