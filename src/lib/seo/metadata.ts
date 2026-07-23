import type { Metadata } from "next";

/**
 * Single reusable metadata builder every public page routes its title/
 * description through, so canonical URLs, Open Graph, and Twitter Card
 * fields are never hand-rolled per page and can't drift out of sync with
 * each other. `path` must be root-relative ("/jobs/abc123") -- Next.js
 * resolves it against `metadataBase` (set in the root layout from
 * NEXT_PUBLIC_SITE_URL) into an absolute URL automatically.
 */

export const SITE_NAME = "PRA Talent Intelligence";

interface BuildMetadataOptions {
  title: string;
  description: string;
  path: string;
  /** Defaults to the site-wide generated OG image if omitted. */
  image?: { url: string; alt?: string };
  /** Auth/utility pages that robots.txt already disallows. */
  noIndex?: boolean;
}

export function buildMetadata({ title, description, path, image, noIndex }: BuildMetadataOptions): Metadata {
  const images = image ? [{ url: image.url, alt: image.alt ?? title }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images?.map((img) => img.url),
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
