import type { MetadataRoute } from "next";

import { locales } from "@/i18n/routing";
import { getPublishedJobs } from "@/lib/queries/jobs";

interface RouteEntry {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  lastModified?: string;
}

// Emits one sitemap entry per locale for every in-scope path, each carrying
// `alternates.languages` back to its sibling locales -- the sitemap-level
// counterpart to the hreflang <link> tags buildMetadata() adds to each
// page's <head>, so crawlers get the same locale relationships from either
// signal. Adding a locale later only means editing src/i18n/routing.ts;
// this loop already iterates whatever `locales` contains.
function localizedEntries(siteUrl: string, { path, changeFrequency, priority, lastModified }: RouteEntry) {
  const urlFor = (locale: string) => `${siteUrl}/${locale}${path === "/" ? "" : path}`;
  const languages = Object.fromEntries(locales.map((locale) => [locale, urlFor(locale)]));

  return locales.map(
    (locale): MetadataRoute.Sitemap[number] => ({
      url: urlFor(locale),
      changeFrequency,
      priority,
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    })
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // /login and /register are intentionally excluded: robots.ts already
  // disallows them, and listing a URL in the sitemap while telling
  // crawlers not to index it is a known sitemap/robots inconsistency
  // (flagged by Google Search Console) rather than a helpful entry.
  const staticRoutes = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/jobs", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/ai-tools/ats-checker", changeFrequency: "monthly" as const, priority: 0.8 },
  ].flatMap((route) => localizedEntries(siteUrl, route));

  const jobs = await getPublishedJobs();
  const jobRoutes = jobs.flatMap((job) =>
    localizedEntries(siteUrl, {
      path: `/jobs/${job.id}`,
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: job.updated_at,
    })
  );

  const companySlugs = new Set(jobs.map((job) => job.company?.slug).filter((slug): slug is string => Boolean(slug)));
  const companyRoutes = Array.from(companySlugs).flatMap((slug) =>
    localizedEntries(siteUrl, { path: `/companies/${slug}`, changeFrequency: "weekly", priority: 0.5 })
  );

  return [...staticRoutes, ...jobRoutes, ...companyRoutes];
}
