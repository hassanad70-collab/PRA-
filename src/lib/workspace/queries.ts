import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AiCoverLetter, AiInterviewSession, AiCareerReport, AiSalaryEstimate, SkillGapEntry, PortfolioItem, AiLinkedInSuggestion, MockInterviewSession } from "@/types/database";

// ============================================================
// Cover Letters
// ============================================================

export async function listCoverLetters(userId: string): Promise<AiCoverLetter[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_cover_letters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AiCoverLetter[];
}

export async function getCoverLetter(id: string, userId: string): Promise<AiCoverLetter | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_cover_letters")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as AiCoverLetter) ?? null;
}

export async function createCoverLetter(
  userId: string,
  payload: Omit<AiCoverLetter, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AiCoverLetter | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_cover_letters")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createCoverLetter:", error.message); return null; }
  return data as AiCoverLetter;
}

export async function updateCoverLetterTitle(id: string, userId: string, title: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_cover_letters")
    .update({ title })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function toggleCoverLetterFavorite(id: string, userId: string, favorite: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_cover_letters")
    .update({ is_favorite: favorite })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function deleteCoverLetter(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_cover_letters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

// ============================================================
// Interview Sessions
// ============================================================

export async function listInterviewSessions(userId: string): Promise<AiInterviewSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AiInterviewSession[];
}

export async function getInterviewSession(id: string, userId: string): Promise<AiInterviewSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_interview_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as AiInterviewSession) ?? null;
}

export async function createInterviewSession(
  userId: string,
  payload: Omit<AiInterviewSession, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AiInterviewSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_interview_sessions")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createInterviewSession:", error.message); return null; }
  return data as AiInterviewSession;
}

export async function toggleInterviewSessionFavorite(id: string, userId: string, favorite: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_interview_sessions")
    .update({ is_favorite: favorite })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function deleteInterviewSession(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_interview_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

// ============================================================
// Career Reports
// ============================================================

export async function listCareerReports(userId: string): Promise<AiCareerReport[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_career_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AiCareerReport[];
}

export async function getCareerReport(id: string, userId: string): Promise<AiCareerReport | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_career_reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as AiCareerReport) ?? null;
}

export async function createCareerReport(
  userId: string,
  payload: Omit<AiCareerReport, "id" | "user_id" | "created_at" | "updated_at">
): Promise<AiCareerReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_career_reports")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createCareerReport:", error.message); return null; }
  return data as AiCareerReport;
}

export async function toggleCareerReportFavorite(id: string, userId: string, favorite: boolean): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_career_reports")
    .update({ is_favorite: favorite })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function deleteCareerReport(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_career_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

// ============================================================
// Salary Estimates (Unit E, migration 0045)
// ============================================================

export async function listSalaryEstimates(userId: string): Promise<AiSalaryEstimate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_salary_estimates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AiSalaryEstimate[];
}

export async function createSalaryEstimate(
  userId: string,
  payload: Omit<AiSalaryEstimate, "id" | "user_id" | "created_at">
): Promise<AiSalaryEstimate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_salary_estimates")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createSalaryEstimate:", error.message); return null; }
  return data as AiSalaryEstimate;
}

export async function deleteSalaryEstimate(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_salary_estimates")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

// ============================================================
// Skills Gap (Unit D, derived from job_matches.missing_skills)
// ============================================================

export async function getSkillsGap(candidateId: string): Promise<{ gaps: SkillGapEntry[]; totalMatches: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_matches")
    .select("missing_skills")
    .eq("candidate_id", candidateId)
    .not("missing_skills", "is", null);

  if (!data || data.length === 0) return { gaps: [], totalMatches: 0 };

  const freq: Record<string, number> = {};
  for (const row of data) {
    for (const skill of (row.missing_skills as string[]) ?? []) {
      const key = skill.trim().toLowerCase();
      if (key) freq[key] = (freq[key] ?? 0) + 1;
    }
  }

  const total = data.length;
  const gaps = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([skill, count]) => ({
      skill: skill.charAt(0).toUpperCase() + skill.slice(1),
      count,
      pct: Math.round((count / total) * 100),
    }));

  return { gaps, totalMatches: total };
}

// ============================================================
// Portfolio (Unit F)
// ============================================================

export async function listPortfolioItems(candidateId: string): Promise<PortfolioItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as PortfolioItem[];
}

export async function upsertPortfolioItem(
  candidateId: string,
  item: Omit<PortfolioItem, "id" | "candidate_id" | "created_at"> & { id?: string }
): Promise<PortfolioItem | null> {
  const supabase = await createClient();
  const payload = { ...item, candidate_id: candidateId };
  const { data, error } = await supabase
    .from("portfolio_items")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error) { console.error("upsertPortfolioItem:", error.message); return null; }
  return data as PortfolioItem;
}

export async function deletePortfolioItem(id: string, candidateId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("candidate_id", candidateId);
  return !error;
}

export async function getPortfolioSettings(candidateId: string): Promise<{ isPublic: boolean; slug: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidates")
    .select("portfolio_is_public, portfolio_slug")
    .eq("id", candidateId)
    .single();
  return { isPublic: data?.portfolio_is_public ?? false, slug: data?.portfolio_slug ?? null };
}

export async function updatePortfolioSettings(
  candidateId: string,
  settings: { isPublic: boolean; slug?: string }
): Promise<boolean> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { portfolio_is_public: settings.isPublic };
  if (settings.slug !== undefined) update.portfolio_slug = settings.slug;
  const { error } = await supabase
    .from("candidates")
    .update(update)
    .eq("id", candidateId);
  return !error;
}

export async function getPublicPortfolio(slug: string): Promise<{
  candidateName: string;
  headline: string | null;
  items: PortfolioItem[];
} | null> {
  const supabase = await createClient();
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, headline, portfolio_is_public, profiles!inner(full_name)")
    .eq("portfolio_slug", slug)
    .eq("portfolio_is_public", true)
    .single();

  if (!candidate) return null;

  const profile = candidate.profiles as unknown as { full_name: string };
  const { data: items } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("display_order", { ascending: true });

  return {
    candidateName: profile.full_name,
    headline: candidate.headline,
    items: (items ?? []) as PortfolioItem[],
  };
}

// ============================================================
// LinkedIn Optimizer (Unit F)
// ============================================================

export async function listLinkedInSuggestions(userId: string): Promise<AiLinkedInSuggestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_linkedin_suggestions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as AiLinkedInSuggestion[];
}

export async function createLinkedInSuggestion(
  userId: string,
  payload: Omit<AiLinkedInSuggestion, "id" | "user_id" | "created_at">
): Promise<AiLinkedInSuggestion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_linkedin_suggestions")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createLinkedInSuggestion:", error.message); return null; }
  return data as AiLinkedInSuggestion;
}

export async function deleteLinkedInSuggestion(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_linkedin_suggestions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

// ============================================================
// Mock Interview Sessions (v1.4, migration 0047)
// ============================================================

export async function listMockInterviewSessions(userId: string): Promise<MockInterviewSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_mock_interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as MockInterviewSession[];
}

export async function getMockInterviewSession(id: string, userId: string): Promise<MockInterviewSession | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_mock_interview_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return (data as MockInterviewSession) ?? null;
}

export async function createMockInterviewSession(
  userId: string,
  payload: Omit<MockInterviewSession, "id" | "user_id" | "created_at" | "updated_at">
): Promise<MockInterviewSession | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_mock_interview_sessions")
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) { console.error("createMockInterviewSession:", error.message); return null; }
  return data as MockInterviewSession;
}

export async function updateMockInterviewSession(
  id: string,
  userId: string,
  updates: Partial<Omit<MockInterviewSession, "id" | "user_id" | "created_at">>
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_mock_interview_sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

export async function deleteMockInterviewSession(id: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_mock_interview_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  return !error;
}

// ============================================================
// Dashboard summary counts
// ============================================================
export async function getWorkspaceSummary(userId: string) {
  const supabase = await createClient();
  const [cl, is_, cr] = await Promise.all([
    supabase.from("ai_cover_letters").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("ai_interview_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("ai_career_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    coverLetters: cl.count ?? 0,
    interviewSessions: is_.count ?? 0,
    careerReports: cr.count ?? 0,
  };
}
