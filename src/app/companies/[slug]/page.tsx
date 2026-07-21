import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Globe, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCompanyBySlug, getPublishedJobs } from "@/lib/queries/jobs";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return {
    title: company.name,
    description: company.description?.slice(0, 160) ?? `Open roles at ${company.name} on PRA Talent Intelligence.`,
  };
}

export default async function PublicCompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const jobs = await getPublishedJobs({ companyId: company.id });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logo_url} alt={company.name} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-xl font-semibold text-primary">
                {company.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold">{company.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {company.industry && <span>{company.industry}</span>}
                {company.headquarters && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {company.headquarters}
                  </span>
                )}
                {company.company_size && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {company.company_size} employees
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
          {company.description && <p className="mt-6 text-sm text-muted-foreground">{company.description}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Open roles at {company.name}</h2>
        <div className="space-y-3">
          {jobs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No open roles right now — check back soon.</p>
          )}
          {jobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <Link href={`/jobs/${job.id}`}>
                  <h3 className="font-semibold">{job.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{job.location ?? "Remote"}</span>
                    <Badge variant="outline" className="capitalize">
                      {job.employment_type.replace("_", " ")}
                    </Badge>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
