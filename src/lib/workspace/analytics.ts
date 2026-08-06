import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getCareerAnalytics(userId: string) {
  const supabase = await createClient();

  const [coverLetters, interviewSessions, careerReports, applications, atsScores] = await Promise.all([
    supabase
      .from("ai_cover_letters")
      .select("id, created_at, is_favorite")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_interview_sessions")
      .select("id, created_at, is_favorite")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_career_reports")
      .select("id, created_at, is_favorite")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("id, status, applied_at")
      .eq("candidate_id", userId)
      .order("applied_at", { ascending: false }),
    supabase
      .from("ats_scores")
      .select("overall_score, created_at")
      .eq("candidate_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const apps = applications.data ?? [];
  const scores = atsScores.data ?? [];

  const appsByStatus = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    coverLetters: coverLetters.data ?? [],
    interviewSessions: interviewSessions.data ?? [],
    careerReports: careerReports.data ?? [],
    applications: apps,
    appsByStatus,
    atsScoreHistory: scores,
    totals: {
      coverLetters: (coverLetters.data ?? []).length,
      interviewSessions: (interviewSessions.data ?? []).length,
      careerReports: (careerReports.data ?? []).length,
      applications: apps.length,
      activeApplications: apps.filter((a) => !["rejected", "withdrawn"].includes(a.status)).length,
    },
  };
}

export async function getFavorites(userId: string) {
  const supabase = await createClient();

  const [coverLetters, interviewSessions, careerReports] = await Promise.all([
    supabase
      .from("ai_cover_letters")
      .select("id, title, created_at")
      .eq("user_id", userId)
      .eq("is_favorite", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_interview_sessions")
      .select("id, job_title, company_name, created_at")
      .eq("user_id", userId)
      .eq("is_favorite", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_career_reports")
      .select("id, current_job_role, target_role, created_at")
      .eq("user_id", userId)
      .eq("is_favorite", true)
      .order("created_at", { ascending: false }),
  ]);

  return {
    coverLetters: coverLetters.data ?? [],
    interviewSessions: interviewSessions.data ?? [],
    careerReports: careerReports.data ?? [],
  };
}

export async function getNotifications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
