import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { getPublishedJobs } from "@/lib/queries/jobs";

/**
 * Derives a deduped company list from the same jobs query JobsPreviewSection
 * already fetched — no second round trip to the database, same dedup
 * pattern already used in src/app/sitemap.ts. There's no /companies index
 * route today, so each card links to its own real /companies/[slug] page
 * and there is deliberately no "view all companies" link, since that
 * destination doesn't exist yet — adding one would be exactly the kind of
 * dead link this phase is meant to prevent.
 */
export function CompaniesPreviewSection({ jobs }: { jobs: Awaited<ReturnType<typeof getPublishedJobs>> }) {
  const seen = new Set<string>();
  const companies = jobs
    .map((job) => job.company)
    .filter((company): company is NonNullable<typeof company> => {
      if (!company || seen.has(company.id)) return false;
      seen.add(company.id);
      return true;
    })
    .slice(0, 6);

  if (companies.length === 0) return null;

  return (
    <section className="border-y border-border bg-secondary/30 py-24">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Companies hiring on PRA</h2>
          <p className="mt-4 text-muted-foreground">Explore the teams building with PRA today.</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {companies.map((company) => (
            <Link key={company.id} href={`/companies/${company.slug}`}>
              <Card className="flex h-full flex-col items-center gap-3 p-4 text-center transition-shadow hover:shadow-md">
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
                    {company.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium">{company.name}</span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
