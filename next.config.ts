import type { NextConfig } from "next";
import createBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
// Opt-in only (ANALYZE=true npm run build) -- adds no cost to a normal
// build/deploy, gives an ongoing way to check bundle composition before it
// regresses again.
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const securityHeaders = [
  // Prevent the page from being embedded in an iframe (clickjacking).
  // Note: frame-ancestors in the CSP below takes precedence in modern browsers;
  // X-Frame-Options is kept for legacy browsers that don't parse CSP.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent browsers from MIME-sniffing a response away from the declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only origin (no path/query) in the Referer header when crossing origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser feature access — deny what this app never needs.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Enforce HTTPS for 1 year; include subdomains.
  // Only sent in production — local dev is plain HTTP.
  ...(process.env.VERCEL_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
  // Content-Security-Policy-Report-Only — defines the target CSP without
  // enforcement, so violations are visible in DevTools / the server logs without
  // breaking the app. Switch this key to "Content-Security-Policy" once you have
  // confirmed (via violation reports) that no legitimate resource is blocked.
  //
  // Current known violations to resolve before enforcing:
  //   • Investigate what causes the admin dashboard page-load delay when
  //     running in enforce mode (likely a font or script from an unlisted host).
  //
  // Concessions for Next.js 15 even in enforce mode:
  //   • 'unsafe-inline' in script-src: Next.js hydration injects inline scripts.
  //   • 'unsafe-eval' in script-src: some transpiled dependencies use eval().
  //
  // Supabase: *.supabase.co. OpenRouter AI: openrouter.ai. Google OAuth:
  // accounts.google.com (frame + script).
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://openrouter.ai",
      "frame-src https://accounts.google.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
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
    // Enables forbidden() and unauthorized() navigation interrupts (Next.js 15)
    authInterrupts: true,
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
