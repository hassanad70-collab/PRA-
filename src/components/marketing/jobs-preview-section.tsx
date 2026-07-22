import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { getPublishedJobs } from "@/lib/queries/jobs";

const PREVIEW_COUNT = 4;

/**
 * Reuses the exact Card/Badge/MapPin visual pattern already established on
 * /jobs — same query result, just sliced to a preview. No new query logic.
 */
export function JobsPreviewSection({ jobs }: { jobs: Awaited<ReturnType<typeof getPublishedJobs>> }) {
  if (jobs.length === 0) return null;

  return (
    <section className="py-24">
      <div className="container">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Open roles right now</h2>
            <p className="mt-2 text-muted-foreground">A sample of what&rsquo;s hiring on PRA today.</p>
          </div>
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link href="/jobs">
              Browse all jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {jobs.slice(0, PREVIEW_COUNT).map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <h3 className="font-semibold">{job.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{job.company?.name}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location ?? "Remote"}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {job.employment_type.replace("_", " ")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Button variant="outline" asChild className="mt-8 w-full sm:hidden">
          <Link href="/jobs">
            Browse all jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
