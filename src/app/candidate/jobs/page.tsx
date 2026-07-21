import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SaveJobButton } from "@/components/candidate/save-job-button";
import { getCurrentUser, getRecommendedJobsForCandidate, getSavedJobIds } from "@/lib/queries/candidate";
import { getPublishedJobs } from "@/lib/queries/jobs";

export default async function BrowseJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; location?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const [jobs, savedIds, recommended] = await Promise.all([
    getPublishedJobs({ search: params.search, location: params.location }),
    getSavedJobIds(user.id),
    getRecommendedJobsForCandidate(user.id, 100),
  ]);

  const matchByJobId = new Map(recommended.map((m) => [m.job_id, m.match_score]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Browse Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">AI-matched roles based on your profile and resume.</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row">
        <Input name="search" defaultValue={params.search} placeholder="Search job titles…" className="sm:max-w-sm" />
        <Input name="location" defaultValue={params.location} placeholder="Location" className="sm:max-w-xs" />
      </form>

      <div className="space-y-3">
        {jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No jobs match your search right now.</p>
        )}
        {jobs.map((job) => {
          const matchScore = matchByJobId.get(job.id);
          return (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <Link href={`/candidate/jobs/${job.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{job.title}</h3>
                    {matchScore !== undefined && (
                      <Badge variant={matchScore >= 80 ? "success" : matchScore >= 60 ? "warning" : "outline"}>
                        <Sparkles className="mr-1 h-3 w-3" />
                        {Math.round(matchScore)}% match
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.company?.name}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location ?? "Remote"}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {job.employment_type.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {job.experience_level}
                    </Badge>
                  </div>
                </Link>
                <SaveJobButton jobId={job.id} initialSaved={savedIds.has(job.id)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
