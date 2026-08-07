"use server";

import { revalidatePath } from "next/cache";

import { extractTextFromFile } from "@/lib/ai/extract-text";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { generateCoverLetter, type CoverLetterInput, type CoverLetterResult } from "@/lib/ai/cover-letter";
import { generateGuestInterviewPrep, type GuestInterviewInput, type GuestInterviewResult } from "@/lib/ai/guest-interview-prep";
import { generateGuestCareerAdvice, type GuestCareerInput, type GuestCareerResult } from "@/lib/ai/guest-career-advisor";
import { getSalaryEstimate, type SalaryInput } from "@/lib/ai/salary-insights";
import { generatePortfolioItemDescription } from "@/lib/ai/portfolio-ai";
import { optimizeLinkedInText, type LinkedInOptimizerInput } from "@/lib/ai/linkedin-optimizer";
import { runAIScreening, type ScreeningResultAI } from "@/lib/ai/screening";
import { generateApplicationInsights, estimateWinProbability, type AppInsightsResult, type WinProbabilityResult } from "@/lib/ai/application-insights";
import { generateFirstQuestion } from "@/lib/ai/mock-interview";
import { saveWorkspaceResume, deleteWorkspaceResume } from "@/lib/workspace/resume-context";
import {
  createCoverLetter,
  createInterviewSession,
  createCareerReport,
  deleteCoverLetter,
  deleteInterviewSession,
  deleteCareerReport,
  toggleCoverLetterFavorite,
  toggleInterviewSessionFavorite,
  toggleCareerReportFavorite,
  updateCoverLetterTitle,
  createSalaryEstimate,
  deleteSalaryEstimate,
  upsertPortfolioItem,
  deletePortfolioItem,
  getPortfolioSettings,
  updatePortfolioSettings,
  createLinkedInSuggestion,
  deleteLinkedInSuggestion,
  createMockInterviewSession,
  updateMockInterviewSession,
  deleteMockInterviewSession,
} from "@/lib/workspace/queries";
import { getApplicationAnalytics } from "@/lib/workspace/application-analytics";
import { getLatestAtsScore } from "@/lib/queries/candidate";
import { rateLimitByIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { AiCoverLetter, AiInterviewSession, AiCareerReport, AiSalaryEstimate, PortfolioItem, AiLinkedInSuggestion, ParsedResumeData, MockInterviewSession, MockInterviewType, MockInterviewMessage, MockInterviewScores, ApplicationAnalytics } from "@/types/database";

export interface WorkspaceActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

// ============================================================
// Auth helper
// ============================================================
async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

// ============================================================
// Resume Context Actions
// ============================================================

export async function uploadWorkspaceResumeAction(
  formData: FormData
): Promise<WorkspaceActionResult<{ rawText: string; fileName: string }>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("workspace-resume-upload", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Please select a file." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only PDF and Word documents are supported." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "File must be smaller than 10 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractTextFromFile(buffer, file.type);
  } catch {
    return { success: false, error: "Could not read this file. Try a different PDF or Word document." };
  }

  if (!rawText || rawText.trim().length < 50) {
    return { success: false, error: "Could not extract readable text from this file." };
  }

  // Parse in background — don't block the user on the full AI parse
  parseResumeText(rawText).then((result) => {
    if (result.success) {
      saveWorkspaceResume(user.id, rawText, {
        fileName: file.name,
        parsedJson: result.data as Record<string, unknown>,
        source: "upload",
      });
    }
  });

  // Immediately save the raw text so the tool is usable right away
  await saveWorkspaceResume(user.id, rawText, { fileName: file.name, source: "upload" });

  revalidatePath("/ai-tools", "layout");
  return { success: true, data: { rawText, fileName: file.name } };
}

export async function saveTextWorkspaceResumeAction(
  text: string
): Promise<WorkspaceActionResult<{ rawText: string }>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  if (!text || text.trim().length < 50) {
    return { success: false, error: "Please paste at least a few lines of your resume." };
  }

  await saveWorkspaceResume(user.id, text.trim(), { source: "paste" });
  revalidatePath("/ai-tools", "layout");
  return { success: true, data: { rawText: text.trim() } };
}

export async function deleteWorkspaceResumeAction(): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  await deleteWorkspaceResume(user.id);
  revalidatePath("/ai-tools", "layout");
  return { success: true };
}

// ============================================================
// Cover Letter Actions
// ============================================================

export async function generateAndSaveCoverLetterAction(
  input: CoverLetterInput & { title?: string }
): Promise<WorkspaceActionResult<AiCoverLetter>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("workspace-cover-letter", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  if (!input.resumeText?.trim() || !input.jobDescription?.trim()) {
    return { success: false, error: "Resume and job description are required." };
  }
  if (!input.companyName?.trim() || !input.position?.trim()) {
    return { success: false, error: "Company name and position are required." };
  }

  const result = await generateCoverLetter(input);
  if (!result) return { success: false, error: "AI generation failed. Please try again." };

  const title = input.title ?? `${input.position} at ${input.companyName}`;
  const saved = await createCoverLetter(user.id, {
    title,
    company_name: input.companyName,
    position: input.position,
    hiring_manager: input.hiringManager ?? null,
    tone: input.tone,
    length: input.length,
    job_description: input.jobDescription,
    result_json: result as unknown as Record<string, unknown>,
    is_favorite: false,
  });

  if (!saved) return { success: false, error: "Generation succeeded but saving failed." };

  revalidatePath("/ai-tools");
  return { success: true, data: saved };
}

export async function deleteCoverLetterAction(id: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await deleteCoverLetter(id, user.id);
  revalidatePath("/ai-tools");
  return { success: true };
}

export async function toggleCoverLetterFavoriteAction(id: string, favorite: boolean): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await toggleCoverLetterFavorite(id, user.id, favorite);
  revalidatePath("/ai-tools");
  return { success: true };
}

export async function renameCoverLetterAction(id: string, title: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  if (!title.trim()) return { success: false, error: "Title cannot be empty." };
  await updateCoverLetterTitle(id, user.id, title.trim());
  revalidatePath("/ai-tools");
  return { success: true };
}

// ============================================================
// Interview Prep Actions
// ============================================================

export async function generateAndSaveInterviewSessionAction(
  input: GuestInterviewInput & { title?: string; company?: string }
): Promise<WorkspaceActionResult<AiInterviewSession>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("workspace-interview-prep", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  if (!input.position?.trim() || !input.jobDescription?.trim()) {
    return { success: false, error: "Position and job description are required." };
  }

  const result = await generateGuestInterviewPrep(input);
  if (!result) return { success: false, error: "AI generation failed. Please try again." };

  const title = input.title ?? `${input.position}${input.company ? ` at ${input.company}` : ""}`;
  const saved = await createInterviewSession(user.id, {
    title,
    position: input.position,
    company: input.company ?? null,
    experience_level: input.experienceLevel,
    job_description: input.jobDescription,
    result_json: result as unknown as Record<string, unknown>,
    is_favorite: false,
  });

  if (!saved) return { success: false, error: "Generation succeeded but saving failed." };

  revalidatePath("/ai-tools");
  return { success: true, data: saved };
}

export async function deleteInterviewSessionAction(id: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await deleteInterviewSession(id, user.id);
  revalidatePath("/ai-tools");
  return { success: true };
}

export async function toggleInterviewSessionFavoriteAction(id: string, favorite: boolean): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await toggleInterviewSessionFavorite(id, user.id, favorite);
  revalidatePath("/ai-tools");
  return { success: true };
}

// ============================================================
// Career Report Actions
// ============================================================

export async function generateAndSaveCareerReportAction(
  input: GuestCareerInput & { title?: string }
): Promise<WorkspaceActionResult<AiCareerReport>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("workspace-career-advisor", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  if (!input.currentRole?.trim() || !input.skills?.trim()) {
    return { success: false, error: "Current role and skills are required." };
  }

  const result = await generateGuestCareerAdvice(input);
  if (!result) return { success: false, error: "AI generation failed. Please try again." };

  const title = input.title ?? `Career Report — ${input.currentRole}`;
  const saved = await createCareerReport(user.id, {
    title,
    current_job_role: input.currentRole,
    target_role: input.targetRole ?? null,
    result_json: result as unknown as Record<string, unknown>,
    is_favorite: false,
  });

  if (!saved) return { success: false, error: "Generation succeeded but saving failed." };

  revalidatePath("/ai-tools");
  return { success: true, data: saved };
}

export async function deleteCareerReportAction(id: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await deleteCareerReport(id, user.id);
  revalidatePath("/ai-tools");
  return { success: true };
}

export async function toggleCareerReportFavoriteAction(id: string, favorite: boolean): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await toggleCareerReportFavorite(id, user.id, favorite);
  revalidatePath("/ai-tools");
  return { success: true };
}

// ============================================================
// Guest compatibility shim — re-export for existing pages that
// imported from ai-tools-guest.ts so callers don't break.
// ============================================================
export async function generateCoverLetterGuestAction(
  input: CoverLetterInput
): Promise<WorkspaceActionResult<CoverLetterResult>> {
  const rl = await rateLimitByIp("guest-cover-letter", 30, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };
  if (!input.resumeText?.trim() || !input.jobDescription?.trim()) {
    return { success: false, error: "Resume and job description are required." };
  }
  if (!input.companyName?.trim() || !input.position?.trim()) {
    return { success: false, error: "Company name and position are required." };
  }
  const result = await generateCoverLetter(input);
  if (!result) return { success: false, error: "AI generation failed. Please try again." };
  return { success: true, data: result };
}

export async function generateInterviewPrepGuestAction(
  input: GuestInterviewInput
): Promise<WorkspaceActionResult<GuestInterviewResult>> {
  const rl = await rateLimitByIp("guest-interview-prep", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };
  if (!input.position?.trim() || !input.jobDescription?.trim()) {
    return { success: false, error: "Position and job description are required." };
  }
  const result = await generateGuestInterviewPrep(input);
  if (!result) return { success: false, error: "AI generation failed. Please try again." };
  return { success: true, data: result };
}

export async function generateCareerAdviceGuestAction(
  input: GuestCareerInput
): Promise<WorkspaceActionResult<GuestCareerResult>> {
  const rl = await rateLimitByIp("guest-career-advisor", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };
  if (!input.currentRole?.trim() || !input.skills?.trim()) {
    return { success: false, error: "Current role and skills are required." };
  }
  const result = await generateGuestCareerAdvice(input);
  if (!result) return { success: false, error: "AI generation failed. Please try again." };
  return { success: true, data: result };
}

// ============================================================
// Salary Insights (Unit E)
// ============================================================

export async function generateSalaryInsightsAction(
  input: SalaryInput
): Promise<WorkspaceActionResult<AiSalaryEstimate>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("salary-insights", 30, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  if (!input.targetRole?.trim()) {
    return { success: false, error: "Target role is required." };
  }

  try {
    const estimate = await getSalaryEstimate(input);
    const saved = await createSalaryEstimate(user.id, {
      target_role: input.targetRole,
      location: input.location ?? null,
      years_experience: input.yearsExperience ?? null,
      result: estimate,
    });
    if (!saved) return { success: false, error: "Failed to save estimate. Please try again." };
    revalidatePath("/candidate/workspace/salary");
    return { success: true, data: saved };
  } catch {
    return { success: false, error: "AI generation failed. Please try again." };
  }
}

export async function deleteSalaryEstimateAction(
  id: string
): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await deleteSalaryEstimate(id, user.id);
  revalidatePath("/candidate/workspace/salary");
  return { success: true };
}

// ============================================================
// Portfolio (Unit F)
// ============================================================

export async function savePortfolioItemAction(
  item: Omit<PortfolioItem, "id" | "candidate_id" | "created_at"> & { id?: string }
): Promise<WorkspaceActionResult<PortfolioItem>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  if (!item.title?.trim()) return { success: false, error: "Title is required." };

  const saved = await upsertPortfolioItem(user.id, item);
  if (!saved) return { success: false, error: "Failed to save portfolio item." };
  revalidatePath("/candidate/workspace/portfolio");
  return { success: true, data: saved };
}

export async function deletePortfolioItemAction(id: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await deletePortfolioItem(id, user.id);
  revalidatePath("/candidate/workspace/portfolio");
  return { success: true };
}

export async function generatePortfolioDescriptionAction(
  title: string,
  technologies: string[],
  type: string
): Promise<WorkspaceActionResult<string>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("portfolio-ai", 30, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  const description = await generatePortfolioItemDescription(title, technologies, type);
  return { success: true, data: description };
}

export async function updatePortfolioVisibilityAction(
  isPublic: boolean
): Promise<WorkspaceActionResult<{ slug: string | null }>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const current = await getPortfolioSettings(user.id);

  let slug = current.slug;
  if (isPublic && !slug) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const baseName = (profile?.full_name ?? "portfolio")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const suffix = Math.random().toString(36).slice(2, 8);
    slug = `${baseName}-${suffix}`;
  }

  await updatePortfolioSettings(user.id, { isPublic, slug: slug ?? undefined });
  revalidatePath("/candidate/workspace/portfolio");
  return { success: true, data: { slug: isPublic ? slug : current.slug } };
}

// ============================================================
// LinkedIn Optimizer (Unit F)
// ============================================================

export async function generateLinkedInOptimizationAction(
  input: LinkedInOptimizerInput
): Promise<WorkspaceActionResult<AiLinkedInSuggestion>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const rl = await rateLimitByIp("linkedin-optimizer", 20, 60_000);
  if (!rl.allowed) return { success: false, error: "Too many requests. Please wait a moment." };

  if (!input.originalText?.trim() || input.originalText.trim().length < 10) {
    return { success: false, error: "Please paste your LinkedIn text (at least 10 characters)." };
  }

  try {
    const result = await optimizeLinkedInText(input);
    const saved = await createLinkedInSuggestion(user.id, {
      target_type: input.targetType,
      original_text: input.originalText,
      target_role: input.targetRole ?? null,
      result_json: result,
    });
    if (!saved) return { success: false, error: "Failed to save suggestion." };
    revalidatePath("/candidate/workspace/linkedin");
    return { success: true, data: saved };
  } catch {
    return { success: false, error: "AI optimization failed. Please try again." };
  }
}

export async function deleteLinkedInSuggestionAction(id: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  await deleteLinkedInSuggestion(id, user.id);
  revalidatePath("/candidate/workspace/linkedin");
  return { success: true };
}

// ============================================================
// Recruiter View Simulation (Unit F)
// ============================================================

export async function runRecruiterSimulationAction(
  jobDescription: string
): Promise<WorkspaceActionResult<ScreeningResultAI>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  if (!jobDescription.trim() || jobDescription.trim().length < 50) {
    return { success: false, error: "Please provide a job description (at least 50 characters)." };
  }

  const supabase = await createClient();

  const atsScore = await getLatestAtsScore(user.id);
  if (!atsScore) {
    return { success: false, error: "Upload and score your resume on the ATS Checker page first." };
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("parsed_data")
    .eq("id", atsScore.resume_id)
    .single();

  const parsedData = (resume?.parsed_data ?? {}) as ParsedResumeData;

  const { data: candidate } = await supabase
    .from("candidates")
    .select("years_of_experience")
    .eq("id", user.id)
    .single();
  const yearsExp = Number(candidate?.years_of_experience ?? 0);

  const result = await runAIScreening(
    {
      title: "Target Position",
      description: jobDescription,
      requirements: null,
      required_skills: [],
      nice_to_have_skills: null,
      experience_level: "mid",
      min_experience_years: 0,
      education_requirement: null,
    },
    parsedData,
    yearsExp
  );

  return { success: true, data: result };
}

// ============================================================
// Application Intelligence (v1.4)
// ============================================================

export async function getApplicationAnalyticsAction(): Promise<WorkspaceActionResult<ApplicationAnalytics>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  const analytics = await getApplicationAnalytics(user.id);
  return { success: true, data: analytics };
}

export async function generateApplicationInsightsAction(
  recentRoles: string[]
): Promise<WorkspaceActionResult<AppInsightsResult>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  const analytics = await getApplicationAnalytics(user.id);
  const result = await generateApplicationInsights(analytics, recentRoles);
  return { success: true, data: result };
}

export async function estimateWinProbabilityAction(
  applicationId: string,
  atsScore: number | null,
  matchScore: number | null,
  role: string,
  currentStatus: string,
): Promise<WorkspaceActionResult<WinProbabilityResult>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  void applicationId;
  const result = await estimateWinProbability(atsScore, matchScore, role, currentStatus);
  return { success: true, data: result };
}

// ============================================================
// Mock Interview Sessions (v1.4)
// ============================================================

export async function generateFirstQuestionAction(
  type: MockInterviewType,
  targetRole: string,
  company?: string,
  jobDescription?: string,
  xpLevel?: string,
): Promise<WorkspaceActionResult<string>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  const question = await generateFirstQuestion(type, targetRole, company, jobDescription, xpLevel);
  return { success: true, data: question };
}

export async function startMockInterviewAction(setup: {
  interview_type: MockInterviewType;
  target_role: string;
  company_name?: string;
  job_description?: string;
  experience_level?: string;
  firstMessage: string;
}): Promise<WorkspaceActionResult<MockInterviewSession>> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const firstMsg: MockInterviewMessage = { role: "assistant", content: setup.firstMessage };

  const session = await createMockInterviewSession(user.id, {
    interview_type: setup.interview_type,
    target_role: setup.target_role,
    company_name: setup.company_name ?? null,
    job_description: setup.job_description ?? null,
    experience_level: setup.experience_level ?? null,
    messages: [firstMsg],
    scores: null,
    strengths: null,
    weaknesses: null,
    coaching_tips: null,
    ai_summary: null,
    readiness_score: null,
    question_count: 0,
    status: "active",
  });

  if (!session) return { success: false, error: "Failed to create interview session." };
  revalidatePath("/candidate/workspace/interview-center", "page");
  return { success: true, data: session };
}

export async function appendInterviewTurnAction(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  evaluation: MockInterviewMessage["evaluation"] | null,
): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("ai_mock_interview_sessions")
    .select("messages, question_count")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return { success: false, error: "Session not found." };

  const userMsg: MockInterviewMessage = {
    role: "user",
    content: userMessage,
    ...(evaluation ? { evaluation } : {}),
  };
  const assistantMsg: MockInterviewMessage = { role: "assistant", content: assistantMessage };

  const updatedMessages = [...(session.messages as MockInterviewMessage[]), userMsg, assistantMsg];

  const ok = await updateMockInterviewSession(sessionId, user.id, {
    messages: updatedMessages,
    question_count: (session.question_count as number) + 1,
  });

  return ok ? { success: true } : { success: false, error: "Failed to save turn." };
}

export async function completeMockInterviewAction(
  sessionId: string,
  report: {
    scores: MockInterviewScores;
    strengths: string[];
    weaknesses: string[];
    coaching_tips: string[];
    ai_summary: string;
    readiness_score: number;
  },
): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };

  const ok = await updateMockInterviewSession(sessionId, user.id, {
    scores: report.scores,
    strengths: report.strengths,
    weaknesses: report.weaknesses,
    coaching_tips: report.coaching_tips,
    ai_summary: report.ai_summary,
    readiness_score: report.readiness_score,
    status: "completed",
  });

  revalidatePath("/candidate/workspace/interview-center", "page");
  return ok ? { success: true } : { success: false, error: "Failed to complete session." };
}

export async function deleteMockInterviewAction(sessionId: string): Promise<WorkspaceActionResult> {
  const user = await requireAuth();
  if (!user) return { success: false, error: "You must be signed in." };
  const ok = await deleteMockInterviewSession(sessionId, user.id);
  revalidatePath("/candidate/workspace/interview-center", "page");
  return ok ? { success: true } : { success: false, error: "Failed to delete session." };
}
