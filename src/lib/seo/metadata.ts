import type { Metadata } from "next";

import { defaultLocale, locales, type AppLocale } from "@/i18n/routing";

/**
 * Single reusable metadata builder every public page routes its title/
 * description through, so canonical URLs, Open Graph, Twitter Card, and
 * hreflang alternates are never hand-rolled per page and can't drift out of
 * sync with each other. `path` must be root-relative and locale-agnostic
 * ("/jobs/abc123", "/") -- this builder prefixes it with `locale` for the
 * canonical URL and generates every other locale's equivalent for
 * `alternates.languages` automatically. Next.js resolves the result against
 * `metadataBase` (set in the root layout from NEXT_PUBLIC_SITE_URL) into
 * absolute URLs.
 */

export const SITE_NAME = "PRA Talent Intelligence";

interface BuildMetadataOptions {
  title: string;
  description: string;
  path: string;
  locale: AppLocale;
  /** Defaults to the site-wide generated OG image if omitted. */
  image?: { url: string; alt?: string };
  /** Auth/utility pages that robots.txt already disallows. */
  noIndex?: boolean;
}

// Explicit fallback rather than relying on Next.js's opengraph-image.tsx
// file-convention cascade: confirmed via production testing that the
// convention only produces a fallback image for the exact root ("/")
// segment, not for nested static or dynamic routes -- so every other
// public page would otherwise have no og:image/twitter:image at all.
// Referencing the same generated route explicitly here guarantees every
// page gets it, regardless of that inheritance behavior.
const DEFAULT_OG_IMAGE = { url: "/opengraph-image", alt: "PRA Talent Intelligence — AI Career Platform" };

function localizedPath(path: string, locale: AppLocale): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function buildMetadata({ title, description, path, locale, image, noIndex }: BuildMetadataOptions): Metadata {
  const resolvedImage = image ?? DEFAULT_OG_IMAGE;
  const imagesField = { images: [{ url: resolvedImage.url, alt: resolvedImage.alt ?? title }] };
  const twitterImagesField = { images: [resolvedImage.url] };
  const canonicalPath = localizedPath(path, locale);

  const languages: Record<string, string> = { "x-default": localizedPath(path, defaultLocale) };
  for (const l of locales) languages[l] = localizedPath(path, l);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
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
