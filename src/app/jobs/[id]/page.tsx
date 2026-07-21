import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Briefcase, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getJobById } from "@/lib/queries/jobs";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job || job.status !== "published") return { title: "Job not found" };
  return {
    title: `${job.title} at ${job.company?.name ?? "PRA"}`,
    description: job.description.slice(0, 160),
  };
}

export default async function PublicJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job || job.status !== "published") notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{job.title}</h1>
              <Link href={`/companies/${job.company?.slug}`} className="mt-1 block text-muted-foreground hover:underline">
                {job.company?.name}
              </Link>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">
                  <MapPin className="mr-1 h-3 w-3" /> {job.location ?? "Remote"}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {job.employment_type.replace("_", " ")}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  <Briefcase className="mr-1 h-3 w-3" /> {job.experience_level}
                </Badge>
                {job.salary_min && (
                  <Badge variant="outline">
                    {job.salary_currency} {job.salary_min.toLocaleString()}
                    {job.salary_max ? ` - ${job.salary_max.toLocaleString()}` : "+"}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="gradient" size="lg" asChild>
              <Link href={`/login?redirect=/candidate/jobs/${job.id}`}>Sign in to apply</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="prose prose-sm max-w-none space-y-6 pt-6 dark:prose-invert">
          <div>
            <h3 className="mb-2 text-base font-semibold">About this role</h3>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>
          </div>

          {!!job.responsibilities?.length && (
            <div>
              <h3 className="mb-2 text-base font-semibold">Responsibilities</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {job.responsibilities.map((r: string) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-primary">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!job.requirements?.length && (
            <div>
              <h3 className="mb-2 text-base font-semibold">Requirements</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {job.requirements.map((r: string) => (
                  <li key={r} className="flex gap-2">
                    <span className="text-primary">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-base font-semibold">Required skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((s: string) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          {!!job.benefits?.length && (
            <div>
              <h3 className="mb-2 text-base font-semibold">Benefits</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {job.benefits.map((b: string) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-primary">•</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/jobs" className="text-sm text-muted-foreground hover:underline">
          ← Back to all jobs
        </Link>
      </div>
    </div>
  );
}
