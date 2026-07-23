import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Browse Jobs",
  description: "Open roles across every company on PRA Talent Intelligence. Free to browse, no account required.",
  path: "/jobs",
});

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; location?: string }>;
}) {
  const params = await searchParams;
  const jobs = await getPublishedJobs({ search: params.search, location: params.location });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Browse Jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open roles across every company on PRA.{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create an account
          </Link>{" "}
          to get AI-matched recommendations and one-click apply.
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row">
        <Input name="search" defaultValue={params.search} placeholder="Search job titles…" className="sm:max-w-sm" />
        <Input name="location" defaultValue={params.location} placeholder="Location" className="sm:max-w-xs" />
      </form>

      <div className="space-y-3">
        {jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">No jobs match your search right now.</p>
        )}
        {jobs.map((job) => (
          <Card key={job.id} className="transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <Link href={`/jobs/${job.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{job.title}</h3>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
