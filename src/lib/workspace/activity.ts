import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ActivityType =
  | "cover_letter"
  | "interview"
  | "career_report"
  | "ats_score"
  | "application";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  label: string;
  created_at: string;
  href: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function str(v: any): string {
  return typeof v === "string" ? v : String(v ?? "");
}

export async function getRecentActivity(userId: string): Promise<ActivityEntry[]> {
  const supabase = await createClient();

  const [clRes, isRes, crRes, atsRes, appRes] = await Promise.all([
    supabase
      .from("ai_cover_letters")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ai_interview_sessions")
      .select("id, job_title, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ai_career_reports")
      .select("id, current_job_role, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ats_scores")
      .select("id, overall_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("applications")
      .select("id, created_at, job:jobs(title)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const entries: ActivityEntry[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const cl of (clRes.data ?? []) as any[]) {
    entries.push({
      id: str(cl.id),
      type: "cover_letter",
      label: `Cover letter: ${cl.title ?? "Untitled"}`,
      created_at: str(cl.created_at),
      href: "/candidate/workspace/cover-letters",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const is_ of (isRes.data ?? []) as any[]) {
    entries.push({
      id: str(is_.id),
      type: "interview",
      label: `Interview prep: ${is_.job_title ?? "Untitled"}`,
      created_at: str(is_.created_at),
      href: "/candidate/workspace/interview-prep",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const cr of (crRes.data ?? []) as any[]) {
    entries.push({
      id: str(cr.id),
      type: "career_report",
      label: `Career report${cr.current_job_role ? `: ${cr.current_job_role}` : ""}`,
      created_at: str(cr.created_at),
      href: "/candidate/workspace/career-advisor",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const ats of (atsRes.data ?? []) as any[]) {
    entries.push({
      id: str(ats.id),
      type: "ats_score",
      label: `ATS score: ${ats.overall_score ?? 0}/100`,
      created_at: str(ats.created_at),
      href: "/candidate/workspace/ats-checker",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const app of (appRes.data ?? []) as any[]) {
    const jobTitle = Array.isArray(app.job) ? app.job[0]?.title : app.job?.title;
    entries.push({
      id: str(app.id),
      type: "application",
      label: `Applied: ${jobTitle ?? "Job"}`,
      created_at: str(app.created_at),
      href: "/candidate/applications",
    });
  }

  return entries
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);
}
