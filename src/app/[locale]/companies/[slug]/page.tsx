import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Globe, MapPin, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getCompanyBySlug, getPublishedJobs } from "@/lib/queries/jobs";
import { JsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { companyOrganizationSchema } from "@/lib/seo/schema";
import type { EmploymentType } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return buildMetadata({
    title: company.name,
    description: company.description?.slice(0, 160) ?? `Open roles at ${company.name} on PRA Talent Intelligence.`,
    path: `/companies/${slug}`,
    locale: locale as AppLocale,
  });
}

// Same ISR window as the homepage/jobs pages -- a company profile changes
// rarely (logo, description, open-roles list).
export const revalidate = 300;

export default async function PublicCompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const jobs = await getPublishedJobs({ companyId: company.id });
  const t = await getTranslations("Company");
  const tCommon = await getTranslations("Common");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <JsonLd data={companyOrganizationSchema(company, `/companies/${slug}`)} />
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {company.logo_url ? (
              <Image
                src={company.logo_url}
                alt={company.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-xl object-cover"
              />
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
                    <Users className="h-3.5 w-3.5" /> {t("employees", { count: company.company_size })}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> {t("website")}
                  </a>
                )}
              </div>
            </div>
          </div>
          {company.description && <p className="mt-6 text-sm text-muted-foreground">{company.description}</p>}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("openRolesAt", { name: company.name })}</h2>
        <div className="space-y-3">
          {jobs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noOpenRoles")}</p>
          )}
          {jobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-6">
                <Link href={`/jobs/${job.id}`}>
                  <h3 className="font-semibold">{job.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{job.location ?? tCommon("remote")}</span>
                    <Badge variant="outline" className="capitalize">
                      {tCommon(`employmentType.${job.employment_type as EmploymentType}`)}
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
