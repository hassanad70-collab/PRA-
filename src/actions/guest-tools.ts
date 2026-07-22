"use server";

import { extractTextFromFile } from "@/lib/ai/extract-text";
import { parseResumeText } from "@/lib/ai/resume-parser";
import { scoreResumeATS, type AtsScoreResult } from "@/lib/ai/ats-scorer";
import { trackEvent } from "@/lib/analytics/track";
import { getOrCreateGuestSessionId, hashClientIp } from "@/lib/guest/session";
import { checkGuestAllowance, recordGuestUsage } from "@/lib/guest/usage";
import { rateLimitByIp } from "@/lib/rate-limit";

// Mirrors the authenticated uploader's constants exactly (src/actions/resume.ts)
// rather than sharing an import, since the two pipelines are deliberately kept
// isolated — this is the one place the guest flow intentionally duplicates a
// small validation constant instead of coupling to the authenticated action.
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const TOOL_KEY = "ats_checker";

export interface GuestAtsCheckResult {
  success: boolean;
  error?: string;
  /** True when blocked by validation/abuse gating, to distinguish from a processing failure in the UI. */
  blocked?: boolean;
  result?: AtsScoreResult;
}

/**
 * Runs one free, ephemeral ATS scan for an anonymous visitor. Reuses the
 * same AI pipeline functions as the authenticated flow (already hardened
 * against OpenAI failures and pdf-parse's cold-start defect) but writes
 * nothing resume-shaped anywhere — no file, no raw text, no parsed data, no
 * score is persisted for a guest, under any circumstance.
 */
export async function checkResumeAsGuest(formData: FormData): Promise<GuestAtsCheckResult> {
  // Cheap first-line burst protection; the durable, cross-instance gate is
  // the Postgres-backed check below.
  const burst = await rateLimitByIp("guest-ats-scan", 20, 60 * 1000);
  if (!burst.allowed) {
    return { success: false, blocked: true, error: "Too many requests. Please wait a moment and try again." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Please select a file to upload." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only PDF and Word documents are supported." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, error: "File must be smaller than 10MB." };
  }

  const guestSessionId = await getOrCreateGuestSessionId();
  const ipHash = await hashClientIp();

  await trackEvent("ats_checker_upload_attempt", { guestSessionId });

  const allowance = await checkGuestAllowance(TOOL_KEY, guestSessionId, ipHash);
  if (!allowance.allowed) {
    return {
      success: false,
      blocked: true,
      error:
        allowance.reason === "session_used"
          ? "You've already used your free ATS scan. Create a free account to keep scoring resumes."
          : "Too many free scans from this network today. Create a free account to keep going.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractTextFromFile(buffer, file.type);
  } catch {
    return { success: false, error: "Could not read this file. Please try a different PDF or Word document." };
  }

  if (!rawText || rawText.trim().length < 50) {
    return { success: false, error: "Could not extract readable text from this file." };
  }

  const parsed = await parseResumeText(rawText);
  const result = await scoreResumeATS(rawText, parsed);

  // Only record usage — and thus consume the guest's one free scan — on a
  // successful score. A transient failure shouldn't cost them their shot.
  await recordGuestUsage(TOOL_KEY, guestSessionId, ipHash);
  await trackEvent("ats_checker_analysis_success", { guestSessionId });

  return { success: true, result };
}

/** Fired when a guest clicks the post-analysis "create an account" CTA. */
export async function trackGuestCtaClick(): Promise<void> {
  const guestSessionId = await getOrCreateGuestSessionId();
  await trackEvent("ats_checker_cta_click", { guestSessionId });
}
