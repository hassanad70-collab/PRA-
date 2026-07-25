import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
// Opt-in only (ANALYZE=true npm run build) -- adds no cost to a normal
// build/deploy, gives an ongoing way to check bundle composition before it
// regresses again.
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: {
    serverActions: {
      // Next.js's default is 1MB. uploadResume() advertises and validates a
      // 10MB resume limit, but with the default in place, every upload
      // between 1MB and 10MB was hitting Next's own hard cutoff first and
      // crashing with an uncaught 413 before the app's validation ever ran.
      // Set comfortably above 10MB (leaving headroom for multipart framing
      // overhead on top of the raw file bytes) so files just over the app's
      // own 10MB limit still reach uploadResume()'s check and get its actual
      // error message instead of Next's generic framework-level rejection.
      bodySizeLimit: "15mb",
    },
    // Separate from serverActions.bodySizeLimit above: this app's middleware
    // (src/middleware.ts) runs on every request, and Next.js caps request
    // bodies passed through middleware at 10MB by default regardless of the
    // server-action limit. A resume upload just over that cap was silently
    // truncated mid-multipart-body, corrupting the form and crashing with
    // "Unexpected end of form" instead of ever reaching uploadResume()'s own
    // validation.
    middlewareClientMaxBodySize: "15mb",
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
