import type { MetadataRoute } from "next";

import { getPublishedJobs } from "@/lib/queries/jobs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // /login and /register are intentionally excluded: robots.ts already
  // disallows them, and listing a URL in the sitemap while telling
  // crawlers not to index it is a known sitemap/robots inconsistency
  // (flagged by Google Search Console) rather than a helpful entry.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/ai-tools/ats-checker`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const jobs = await getPublishedJobs();
  const jobRoutes: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${siteUrl}/jobs/${job.id}`,
    lastModified: job.updated_at,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const companySlugs = new Set(jobs.map((job) => job.company?.slug).filter((slug): slug is string => Boolean(slug)));
  const companyRoutes: MetadataRoute.Sitemap = Array.from(companySlugs).map((slug) => ({
    url: `${siteUrl}/companies/${slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...jobRoutes, ...companyRoutes];
}
