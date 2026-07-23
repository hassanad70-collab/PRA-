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
  // Deliberately omit the `images` key entirely (rather than setting it to
  // `undefined`) when no explicit image is given. Next.js only falls back
  // to the opengraph-image.tsx file-convention image when a page's
  // metadata doesn't define openGraph.images/twitter.images at all --
  // including the key with an undefined value still counts as "defined"
  // and suppresses the automatic fallback.
  const imagesField = image ? { images: [{ url: image.url, alt: image.alt ?? title }] } : {};
  const twitterImagesField = image ? { images: [image.url] } : {};

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
      ...imagesField,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...twitterImagesField,
    },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
