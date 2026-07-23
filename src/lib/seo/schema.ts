import { SITE_NAME } from "./metadata";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Site-wide Organization + WebSite JSON-LD, rendered once in the root layout. */
export function organizationAndWebsiteSchema() {
  const url = siteUrl();
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url,
      potentialAction: {
        "@type": "SearchAction",
        target: `${url}/jobs?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

// Google's JobPosting requires employmentType values from a fixed enum
// (https://schema.org/employmentType / Google's job-posting guidelines),
// not this app's lowercase snake_case column values.
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
};

interface JobForSchema {
  title: string;
  description: string;
  employment_type: string;
  location: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  published_at: string | null;
  closes_at: string | null;
  company: { name: string; website?: string | null } | null;
}

/**
 * JobPosting structured data per Google's required/recommended properties.
 * Honest limitation: `location` is a free-text column, not a structured
 * address, so `jobLocation.address` below is necessarily approximate
 * (addressLocality only) for on-site roles -- there's no city/region/
 * country breakdown in the schema to build a fully structured
 * PostalAddress from. Remote roles use the TELECOMMUTE pattern instead,
 * which Google's own guidance prefers over a fabricated address anyway.
 */
export function jobPostingSchema(job: JobForSchema, path: string) {
  const url = `${siteUrl()}${path}`;

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    url,
    datePosted: job.published_at ?? undefined,
    validThrough: job.closes_at ?? undefined,
    employmentType: EMPLOYMENT_TYPE_MAP[job.employment_type] ?? "OTHER",
    hiringOrganization: {
      "@type": "Organization",
      name: job.company?.name ?? SITE_NAME,
      sameAs: job.company?.website ?? undefined,
    },
  };

  if (job.is_remote) {
    base.jobLocationType = "TELECOMMUTE";
  } else if (job.location) {
    base.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    };
  }

  if (job.salary_min) {
    base.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.salary_currency ?? "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min,
        maxValue: job.salary_max ?? job.salary_min,
        unitText: "YEAR",
      },
    };
  }

  return base;
}

/** SoftwareApplication schema for the free guest ATS checker tool page. */
export function softwareApplicationSchema(path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PRA Free ATS Resume Checker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any (web-based)",
    url: `${siteUrl()}${path}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

/** Lightweight Organization schema for a company profile page. */
export function companyOrganizationSchema(company: { name: string; website?: string | null; description?: string | null }, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url: `${siteUrl()}${path}`,
    sameAs: company.website ?? undefined,
    description: company.description ?? undefined,
  };
}
