import type { LucideIcon } from "lucide-react";
import { FileCheck2, FilePenLine, Mail, MessagesSquare, Compass } from "lucide-react";

/**
 * Presentation-only registry of AI tools shown to visitors. This is the
 * single source of truth the homepage/nav render from — a tool only ever
 * gets a real, clickable link when `status` is "live". "coming-soon"
 * entries must have `href: null`, enforced by this shape, so a page can
 * never accidentally link to a route that doesn't exist yet.
 *
 * `label`/`description` are translated text, not stored here — they live in
 * messages/*.json under Home.AiTools.tools.<key>, keyed by the same `key`
 * used below, so this registry stays locale-agnostic.
 */
export type AIToolListing = { key: string; icon: LucideIcon } & (
  | { status: "live"; href: string }
  | { status: "coming-soon"; href: null }
);

export const AI_TOOLS: AIToolListing[] = [
  {
    key: "ats_checker",
    icon: FileCheck2,
    status: "live",
    href: "/ai-tools/ats-checker",
  },
  {
    key: "resume_builder",
    icon: FilePenLine,
    status: "live",
    href: "/ai-tools/resume-builder",
  },
  {
    key: "cover_letter_generator",
    icon: Mail,
    status: "live",
    href: "/ai-tools/cover-letter",
  },
  {
    key: "interview_prep",
    icon: MessagesSquare,
    status: "live",
    href: "/ai-tools/interview-prep",
  },
  {
    key: "career_advisor",
    icon: Compass,
    status: "live",
    href: "/ai-tools/career-advisor",
  },
];
