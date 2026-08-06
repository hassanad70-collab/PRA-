import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AiCoverLetter, AiInterviewSession, AiCareerReport } from "@/types/database";

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
