"use server";

import { generateCoverLetter, type CoverLetterInput, type CoverLetterResult } from "@/lib/ai/cover-letter";
import { generateGuestInterviewPrep, type GuestInterviewInput, type GuestInterviewResult } from "@/lib/ai/guest-interview-prep";
import { generateGuestCareerAdvice, type GuestCareerInput, type GuestCareerResult } from "@/lib/ai/guest-career-advisor";
import { rateLimitByIp } from "@/lib/rate-limit";

export interface AIToolActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function generateCoverLetterAction(
  input: CoverLetterInput
): Promise<AIToolActionResult<CoverLetterResult>> {
  const limit = await rateLimitByIp("guest-cover-letter", 30, 60 * 1000);
  if (!limit.allowed) {
    return { success: false, error: "Too many requests. Please wait a moment and try again." };
  }

  if (!input.resumeText?.trim() || !input.jobDescription?.trim()) {
    return { success: false, error: "Resume text and job description are required." };
  }
  if (!input.companyName?.trim() || !input.position?.trim()) {
    return { success: false, error: "Company name and position are required." };
  }

  const result = await generateCoverLetter(input);
  if (!result) {
    return { success: false, error: "AI generation failed. Please try again." };
  }

  return { success: true, data: result };
}

export async function generateInterviewPrepAction(
  input: GuestInterviewInput
): Promise<AIToolActionResult<GuestInterviewResult>> {
  const limit = await rateLimitByIp("guest-interview-prep", 20, 60 * 1000);
  if (!limit.allowed) {
    return { success: false, error: "Too many requests. Please wait a moment and try again." };
  }

  if (!input.position?.trim() || !input.jobDescription?.trim()) {
    return { success: false, error: "Target position and job description are required." };
  }

  const result = await generateGuestInterviewPrep(input);
  if (!result) {
    return { success: false, error: "AI generation failed. Please try again." };
  }

  return { success: true, data: result };
}

export async function generateCareerAdviceAction(
  input: GuestCareerInput
): Promise<AIToolActionResult<GuestCareerResult>> {
  const limit = await rateLimitByIp("guest-career-advisor", 20, 60 * 1000);
  if (!limit.allowed) {
    return { success: false, error: "Too many requests. Please wait a moment and try again." };
  }

  if (!input.currentRole?.trim() || !input.skills?.trim()) {
    return { success: false, error: "Current role and skills are required." };
  }

  const result = await generateGuestCareerAdvice(input);
  if (!result) {
    return { success: false, error: "AI generation failed. Please try again." };
  }

  return { success: true, data: result };
}
