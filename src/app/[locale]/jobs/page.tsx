import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getPublishedJobs } from "@/lib/queries/jobs";
import { buildMetadata } from "@/lib/seo/metadata";
import type { EmploymentType, ExperienceLevel } from "@/types/database";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.jobs" });
  return buildMetadata({ title: t("title"), description: t("description"), path: "/jobs", locale: locale as AppLocale });
}

// Same ISR window as the homepage (src/app/[locale]/page.tsx) -- job
// postings don't change second-to-second, so this was previously fully
// dynamic (a fresh DB round trip on every request) for no freshness benefit
// users would ever notice.
export const revalidate = 300;

export default async function PublicJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; location?: string }>;
}) {
  const params = await searchParams;
  const jobs = await getPublishedJobs({ search: params.search, location: params.location });
  const t = await getTranslations("Jobs");
  const tCommon = await getTranslations("Common");

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitlePrefix")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("createAccount")}
          </Link>{" "}
          {t("subtitleSuffix")}
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row">
        <Input name="search" defaultValue={params.search} placeholder={t("searchPlaceholder")} className="sm:max-w-sm" />
        <Input name="location" defaultValue={params.location} placeholder={t("locationPlaceholder")} className="sm:max-w-xs" />
      </form>

      <div className="space-y-3">
        {jobs.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noResults")}</p>
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
                    <MapPin className="h-3 w-3" /> {job.location ?? tCommon("remote")}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {tCommon(`employmentType.${job.employment_type as EmploymentType}`)}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {tCommon(`experienceLevel.${job.experience_level as ExperienceLevel}`)}
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
