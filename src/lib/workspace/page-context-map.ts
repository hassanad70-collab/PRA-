import type { AssistantDomain } from "@/actions/ai-assistant";

export interface PageContext {
  domain: AssistantDomain;
  label: string;
}

export const CHATBOT_PAGE_PATH = "/workspace/assistant";

const MAP: Array<{ match: string; context: PageContext }> = [
  { match: "/workspace/studio",           context: { domain: "resume",        label: "Resume Studio" } },
  { match: "/workspace/resumes",          context: { domain: "resume",        label: "My Resumes" } },
  { match: "/workspace/ats-checker",      context: { domain: "ats",           label: "ATS Checker" } },
  { match: "/workspace/cover-letters",    context: { domain: "cover-letter",  label: "Cover Letters" } },
  { match: "/workspace/interview-prep",   context: { domain: "interview",     label: "Interview Prep" } },
  { match: "/workspace/interview-center", context: { domain: "interview",     label: "Interview Center" } },
  { match: "/workspace/career-advisor",   context: { domain: "career",        label: "Career Advisor" } },
  { match: "/workspace/career-coach",     context: { domain: "career",        label: "Career Coach" } },
  { match: "/workspace/salary",           context: { domain: "career",        label: "Salary Insights" } },
  { match: "/workspace/linkedin",         context: { domain: "career",        label: "LinkedIn Optimizer" } },
  { match: "/workspace/portfolio",        context: { domain: "career",        label: "Portfolio" } },
  { match: "/workspace/app-intelligence", context: { domain: "job-search",    label: "Application Intelligence" } },
  { match: "/workspace/analytics",        context: { domain: "career",        label: "Career Analytics" } },
  { match: "/applications",               context: { domain: "job-search",    label: "Applications" } },
  { match: "/interviews",                 context: { domain: "interview",     label: "Interviews" } },
  { match: "/saved-jobs",                 context: { domain: "job-search",    label: "Saved Jobs" } },
  { match: "/jobs",                       context: { domain: "job-search",    label: "Browse Jobs" } },
];

export function getPageContext(pathname: string): PageContext {
  for (const { match, context } of MAP) {
    if (pathname.includes(match)) return context;
  }
  return { domain: "general", label: "General Career Assistant" };
}

export function isOnChatbotPage(pathname: string): boolean {
  return pathname.includes(CHATBOT_PAGE_PATH);
}
