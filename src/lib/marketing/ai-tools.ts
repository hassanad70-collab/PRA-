import type { LucideIcon } from "lucide-react";
import { FileCheck2, FilePenLine, Mail, MessagesSquare, Compass } from "lucide-react";

/**
 * Presentation-only registry of AI tools shown to visitors. This is the
 * single source of truth the homepage/nav render from — a tool only ever
 * gets a real, clickable link when `status` is "live". "coming-soon"
 * entries must have `href: null`, enforced by this shape, so a page can
 * never accidentally link to a route that doesn't exist yet.
 */
export type AIToolListing = { key: string; label: string; description: string; icon: LucideIcon } & (
  | { status: "live"; href: string }
  | { status: "coming-soon"; href: null }
);

export const AI_TOOLS: AIToolListing[] = [
  {
    key: "ats_checker",
    label: "ATS Resume Checker",
    description:
      "Get an instant, AI-powered ATS compatibility score for your resume — free, no account required.",
    icon: FileCheck2,
    status: "live",
    href: "/ai-tools/ats-checker",
  },
  {
    key: "resume_builder",
    label: "AI Resume Builder",
    description: "Build a professional, ATS-optimized resume from scratch with AI guidance.",
    icon: FilePenLine,
    status: "coming-soon",
    href: null,
  },
  {
    key: "cover_letter_generator",
    label: "Cover Letter Generator",
    description: "Generate a tailored cover letter for any job in seconds.",
    icon: Mail,
    status: "coming-soon",
    href: null,
  },
  {
    key: "interview_prep",
    label: "Interview Preparation",
    description: "Practice with AI-generated interview questions tailored to your target role.",
    icon: MessagesSquare,
    status: "coming-soon",
    href: null,
  },
  {
    key: "career_advisor",
    label: "AI Career Advisor",
    description: "Get personalized guidance on your next career move, skill gaps, and growth path.",
    icon: Compass,
    status: "coming-soon",
    href: null,
  },
];
