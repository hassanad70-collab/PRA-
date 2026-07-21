import type { MetadataRoute } from "next";

import { getPublishedJobs } from "@/lib/queries/jobs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/jobs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/register`, changeFrequency: "yearly", priority: 0.3 },
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
