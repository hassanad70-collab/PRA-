"use server";

import { revalidatePath } from "next/cache";

import { extractTextFromFile } from "@/lib/ai/extract-text";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { generateCoverLetter, type CoverLetterInput, type CoverLetterResult } from "@/lib/ai/cover-letter";
import { generateGuestInterviewPrep, type GuestInterviewInput, type GuestInterviewResult } from "@/lib/ai/guest-interview-prep";
import { generateGuestCareerAdvice, type GuestCareerInput, type GuestCareerResult } from "@/lib/ai/guest-career-advisor";
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
} from "@/lib/workspace/queries";
import { rateLimitByIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { AiCoverLetter, AiInterviewSession, AiCareerReport } from "@/types/database";

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
