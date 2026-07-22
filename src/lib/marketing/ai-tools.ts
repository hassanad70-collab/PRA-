/**
 * Presentation-only registry of AI tools shown to visitors. This is the
 * single source of truth the homepage/nav (Phase 1B) will render from — a
 * tool only ever gets a real, clickable link when `status` is "live".
 * "coming-soon" entries must have `href: null`, enforced by this shape, so
 * a future homepage can never accidentally link to a page that doesn't
 * exist yet.
 */
export type AIToolListing = { key: string; label: string; description: string } & (
  | { status: "live"; href: string }
  | { status: "coming-soon"; href: null }
);

export const AI_TOOLS: AIToolListing[] = [
  {
    key: "ats_checker",
    label: "ATS Resume Checker",
    description:
      "Get an instant, AI-powered ATS compatibility score for your resume — free, no account required.",
    status: "live",
    href: "/ai-tools/ats-checker",
  },
];
