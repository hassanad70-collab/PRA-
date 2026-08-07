import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationAnalytics } from "@/types/database";

export interface ApplicationRow {
  id: string;
  status: string;
  applied_at: string;
  resume_id: string;
  cover_letter_id: string | null;
  job_id: string;
}

export interface ApplicationWithRole extends ApplicationRow {
  role: string;
  company: string | null;
  atsScore: number | null;
  matchScore: number | null;
}

export async function getApplicationAnalytics(candidateId: string): Promise<ApplicationAnalytics> {
  const supabase = await createClient();

  const [appsResult, atsResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, applied_at, resume_id, cover_letter_id, job_id")
      .eq("candidate_id", candidateId)
      .order("applied_at", { ascending: false }),
    supabase
      .from("ats_scores")
      .select("overall_score, created_at, resume_id")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  const apps = (appsResult.data ?? []) as ApplicationRow[];
  const atsScores = atsResult.data ?? [];

  const total = apps.length;
  const screened = apps.filter(a => ["screening", "shortlisted", "interview", "offer", "hired"].includes(a.status)).length;
  const interviewed = apps.filter(a => ["interview", "offer", "hired"].includes(a.status)).length;
  const offered = apps.filter(a => ["offer", "hired"].includes(a.status)).length;
  const hired = apps.filter(a => a.status === "hired").length;
  const rejected = apps.filter(a => a.status === "rejected").length;

  const safeRate = (num: number, den: number) => den > 0 ? Math.round((num / den) * 100) : 0;

  const allAtsScores = atsScores.map(s => s.overall_score as number);
  const avgAtsScore = allAtsScores.length > 0
    ? Math.round(allAtsScores.reduce((a, b) => a + b, 0) / allAtsScores.length)
    : null;

  const withCoverLetter = apps.filter(a => a.cover_letter_id !== null).length;

  // Build funnel
  const funnelStages = [
    { stage: "Applied", count: total },
    { stage: "Screened", count: screened },
    { stage: "Interviewed", count: interviewed },
    { stage: "Offered", count: offered },
    { stage: "Hired", count: hired },
  ];
  const funnel = funnelStages.map(s => ({
    stage: s.stage,
    count: s.count,
    pct: total > 0 ? Math.round((s.count / total) * 100) : 0,
  }));

  // ATS history — deduplicate by month, take the latest per month
  const atsHistory = atsScores.map(s => ({
    date: s.created_at.slice(0, 10),
    score: s.overall_score as number,
    resumeName: "",
  }));

  // Weekly stats
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeklyApplications = apps.filter(a => now - new Date(a.applied_at).getTime() < weekMs).length;
  const prevWeekApplications = apps.filter(a => {
    const age = now - new Date(a.applied_at).getTime();
    return age >= weekMs && age < 2 * weekMs;
  }).length;

  return {
    totals: { applications: total, screened, interviewed, offered, hired, rejected },
    rates: {
      interviewRate: safeRate(interviewed, total),
      offerRate: safeRate(offered, total),
      successRate: safeRate(hired, total),
      rejectionRate: safeRate(rejected, total),
    },
    avgAtsScore,
    coverLetterUsage: { used: withCoverLetter, total },
    funnel,
    atsHistory,
    weeklyApplications,
    prevWeekApplications,
  };
}

export async function getRecentApplicationsWithContext(
  candidateId: string,
  limit = 10,
): Promise<ApplicationWithRole[]> {
  const supabase = await createClient();

  const { data: apps } = await supabase
    .from("applications")
    .select(`
      id, status, applied_at, resume_id, cover_letter_id, job_id,
      jobs!inner(title, companies(name)),
      ats_scores(overall_score),
      job_matches(match_score)
    `)
    .eq("candidate_id", candidateId)
    .order("applied_at", { ascending: false })
    .limit(limit);

  if (!apps) return [];

  return apps.map((a) => {
    const jobRaw = a.jobs as unknown as { title: string; companies: { name: string } | null } | null;
    const atsRaw = a.ats_scores as unknown as { overall_score: number }[] | null;
    const matchRaw = a.job_matches as unknown as { match_score: number }[] | null;
    return {
      id: a.id as string,
      status: a.status as string,
      applied_at: a.applied_at as string,
      resume_id: a.resume_id as string,
      cover_letter_id: a.cover_letter_id as string | null,
      job_id: a.job_id as string,
      role: jobRaw?.title ?? "Unknown Role",
      company: jobRaw?.companies?.name ?? null,
      atsScore: atsRaw?.[0]?.overall_score ?? null,
      matchScore: matchRaw?.[0]?.match_score ?? null,
    };
  });
}
